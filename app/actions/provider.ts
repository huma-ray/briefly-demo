"use server";

import { revalidatePath } from "next/cache";
import { generateText, tool } from "ai";
import { z } from "zod";
import { checkBaseUrl, endpointFetch } from "@/lib/ai/endpoint";
import { compatibleModel } from "@/lib/ai/provider";
import { decryptSecret, encryptSecret } from "@/lib/ai/secret";
import { getContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/server";

const Input = z.object({
  baseUrl: z.string().trim().min(1, "Enter the endpoint URL.").max(500),
  model: z.string().trim().min(1, "Enter the model id.").max(200),
  /** New key; empty keeps the saved one when `keepKey` is true. */
  apiKey: z.string().trim().max(500).default(""),
  keepKey: z.boolean().default(false),
});
export type ProviderInput = z.input<typeof Input>;

export type SaveResult = { ok: true } | { ok: false; error: string; field?: "baseUrl" | "model" | "apiKey" };

/** Admin only — enforced by RLS on ai_settings, not by this function. */
export async function saveProvider(input: ProviderInput): Promise<SaveResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path[0] as "baseUrl" | "model" };
  }
  const url = checkBaseUrl(parsed.data.baseUrl);
  if (!url.ok) return { ok: false, error: url.error, field: "baseUrl" };

  const { supabase, workspace, me } = await getContext();
  const row: Record<string, string | null> = { workspace_id: workspace.id, base_url: url.url, model: parsed.data.model, updated_by: me.id, updated_at: new Date().toISOString() };
  if (parsed.data.apiKey) {
    row.api_key_enc = encryptSecret(parsed.data.apiKey);
    row.key_hint = parsed.data.apiKey.slice(-4);
  } else if (!parsed.data.keepKey) {
    row.api_key_enc = null;
    row.key_hint = null;
  }
  // update-then-insert, not upsert: ON CONFLICT reads EXCLUDED.api_key_enc, which people may not SELECT.
  const upd = await supabase.from("ai_settings").update(row as never, { count: "exact" }).eq("workspace_id", workspace.id);
  const error = upd.error ?? (upd.count ? null : (await supabase.from("ai_settings").insert(row as never)).error);
  if (error) return { ok: false, error: error.code === "42501" ? "Only an Admin can change the model provider." : "Could not save the provider." };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Back to the default provider. Admin only (RLS). */
export async function clearProvider(): Promise<SaveResult> {
  const { supabase, workspace } = await getContext();
  const { error, count } = await supabase.from("ai_settings").delete({ count: "exact" }).eq("workspace_id", workspace.id);
  if (error || (count ?? 0) === 0) return { ok: false, error: "Only an Admin can change the model provider." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export type TestResult = {
  ok: boolean;
  reachable: boolean;
  modelFound: boolean | null; // null: the endpoint does not list models
  toolCalls: boolean;
  latencyMs: number;
  error?: string;
};

/** Checks the endpoint answers, lists the model, and returns a tool call. Admin only. */
export async function testProvider(input: ProviderInput): Promise<TestResult> {
  const fail = (error: string): TestResult => ({ ok: false, reachable: false, modelFound: null, toolCalls: false, latencyMs: 0, error });
  const parsed = Input.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const url = checkBaseUrl(parsed.data.baseUrl);
  if (!url.ok) return fail(url.error);

  const { me, workspace } = await getContext();
  if (me.role !== "admin") return fail("Only an Admin can change the model provider.");

  let apiKey = parsed.data.apiKey;
  if (!apiKey && parsed.data.keepKey) {
    const { data } = await createAdminClient().from("ai_settings").select("api_key_enc").eq("workspace_id", workspace.id).maybeSingle();
    apiKey = data?.api_key_enc ? decryptSecret(data.api_key_enc) : "";
  }

  const t0 = Date.now();
  let reachable = false;
  let modelFound: boolean | null = null;
  try {
    const res = await endpointFetch(`${url.url}/models`, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
      signal: AbortSignal.timeout(8000),
    });
    reachable = true;
    if (res.status === 401 || res.status === 403) return { ...fail(`The endpoint rejected the API key (${res.status}).`), reachable };
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { data?: { id?: string }[] } | null;
      if (Array.isArray(body?.data)) modelFound = body.data.some((m) => m.id === parsed.data.model);
    }
  } catch (e) {
    return fail(`Could not reach the endpoint: ${reason(e)}`);
  }

  try {
    const { model } = compatibleModel(url.url, parsed.data.model, apiKey);
    const r = await generateText({
      model,
      prompt: "Call the ping tool with ok set to true.",
      tools: { ping: tool({ description: "Connectivity check.", inputSchema: z.object({ ok: z.boolean() }) }) },
      toolChoice: "required",
      maxOutputTokens: 64,
      abortSignal: AbortSignal.timeout(20000),
    });
    const toolCalls = r.toolCalls.some((c) => c.toolName === "ping");
    return {
      ok: toolCalls && modelFound !== false,
      reachable,
      modelFound,
      toolCalls,
      latencyMs: Date.now() - t0,
      error: toolCalls ? undefined : "The model answered but did not return a tool call. The assistant needs tool calling (for vLLM: --enable-auto-tool-choice with a matching --tool-call-parser).",
    };
  } catch (e) {
    return { ok: false, reachable, modelFound, toolCalls: false, latencyMs: Date.now() - t0, error: `The model call failed: ${reason(e)}` };
  }
}

function reason(e: unknown): string {
  const err = e as { message?: string; cause?: { message?: string; code?: string } };
  const msg = err.cause?.code === "EPRIVATE" || /private address/.test(err.cause?.message ?? "") ? "it resolves to a private network address" : (err.cause?.message ?? err.message ?? "unknown error");
  return msg.slice(0, 200);
}
