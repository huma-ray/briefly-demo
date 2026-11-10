"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";
import type { BrieflyMessage, ConversationSummary, DecideInput, DecideResult, Decision, WriteTool } from "@/lib/agent/contract";
import { buildConfirmation, patchDecision } from "@/lib/agent/decision";

const Input = z.object({
  actionId: z.uuid(),
  decision: z.enum(["approve", "cancel"]),
  titles: z.array(z.string().trim().min(1, "Task titles cannot be empty.").max(200, "Task titles can have at most 200 characters.")).max(20).optional(),
});

/** Postgres/RLS errors from the commit, in words for the card. */
function commitError(e: { message: string; hint?: string | null }): string {
  if (e.hint === "no_access" || e.hint === "not_found" || /row-level security|permission denied/i.test(e.message)) {
    return "You no longer have access to the project this change targets.";
  }
  if (e.hint === "assignee_not_member") return "The assignee is not a member of that project.";
  return e.message.endsWith(".") ? e.message : `${e.message}.`;
}

export async function decideAction(input: DecideInput): Promise<DecideResult> {
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  const { actionId, decision: choice, titles } = parsed.data;

  const { supabase, me } = await getContext();
  const admin = createAdminClient();

  // RLS: only the person's own proposals are visible.
  const { data: action } = await supabase.from("pending_actions").select("*").eq("id", actionId).maybeSingle();
  if (!action) return { ok: false, error: "This proposal no longer exists." };
  const tool = action.tool as WriteTool;
  const t0 = Date.now();
  const now = () => new Date().toISOString();

  let decision: Decision;
  let fresh = true; // false when someone (a double click) already decided it

  if (action.status !== "pending") {
    fresh = false;
    decision = await readDecided(supabase, actionId, me.name);
  } else if (choice === "cancel") {
    const { data: done } = await supabase
      .from("pending_actions")
      .update({ status: "cancelled", decided_by: me.id, decided_at: now() })
      .eq("id", actionId)
      .eq("status", "pending")
      .select("id");
    if (!done?.length) {
      fresh = false;
      decision = await readDecided(supabase, actionId, me.name);
    } else {
      decision = { status: "cancelled", byName: me.name, at: now() };
    }
  } else {
    // Atomic, idempotent, runs as the visitor: RLS re-checks access at approval time.
    const { data, error } = await supabase.rpc("commit_pending_action", { action_id: actionId, edits: titles ? { titles } : {} });
    if (error) {
      const message = commitError(error);
      await supabase.from("pending_actions").update({ status: "failed", result: { error: message }, decided_by: me.id, decided_at: now() }).eq("id", actionId).eq("status", "pending");
      decision = { status: "failed", byName: me.name, at: now(), error: message };
    } else {
      const res = data as { already?: boolean; result?: { tasks?: { id: string; key: string }[] } };
      if (res.already) {
        fresh = false;
        decision = await readDecided(supabase, actionId, me.name);
      } else {
        const tasks = res.result?.tasks ?? [];
        decision = { status: "approved", byName: me.name, at: now(), tasks, rows: tasks.length, durationMs: Date.now() - t0 };
      }
    }
  }

  // ---- the stored conversation: patch the card's output, append the confirmation (once)
  let proposalForText = undefined;
  const confirmId = `confirm-${actionId}`;
  let confirmation: BrieflyMessage = { id: confirmId, role: "assistant", metadata: { createdAt: Date.now(), runId: action.run_id }, parts: [] };
  if (action.conversation_id) {
    const { data: conv } = await supabase.from("conversations").select("messages").eq("id", action.conversation_id).maybeSingle();
    if (conv) {
      const stored = conv.messages as unknown as BrieflyMessage[];
      const patched = patchDecision(stored, action.tool_call_id, decision, tool === "create_task" ? titles : undefined);
      proposalForText = patched.proposal;
      const existing = patched.messages.find((m) => m.id === confirmId);
      if (existing) {
        confirmation = existing;
      } else {
        confirmation.parts = [{ type: "text", text: buildConfirmation(tool, decision, proposalForText) }];
      }
      const next = existing ? patched.messages : [...patched.messages, confirmation];
      await supabase.from("conversations").update({ messages: next as never, updated_at: now() }).eq("id", action.conversation_id);
    }
  }
  if (confirmation.parts.length === 0) confirmation.parts = [{ type: "text", text: buildConfirmation(tool, decision, proposalForText) }];

  // ---- the run log (server-owned rows)
  if (fresh) {
    const { data: run } = await admin.from("agent_runs").select("created_at, result").eq("id", action.run_id).maybeSingle();
    const callStatus = decision.status === "approved" ? "approved" : decision.status === "cancelled" ? "cancelled" : "error";
    await admin
      .from("agent_tool_calls")
      .update({
        status: callStatus,
        rows: decision.rows ?? null,
        duration_ms: decision.durationMs ?? null,
        error: decision.error ?? null,
        result: decision as unknown as Json,
      })
      .eq("run_id", action.run_id)
      .eq("tool_call_id", action.tool_call_id);
    // The run result follows the card unless something stronger (blocked, error) already decided it,
    // and stays "awaiting" while another proposal of the same run is still open.
    const { count: stillOpen } = await admin.from("pending_actions").select("id", { count: "exact", head: true }).eq("run_id", action.run_id).eq("status", "pending");
    if (run && (decision.status === "failed" || (run.result === "await" && !stillOpen))) {
      await admin
        .from("agent_runs")
        .update({
          result: decision.status === "approved" ? "approved" : decision.status === "cancelled" ? "cancelled" : "error",
          ...(decision.status === "failed" ? { error: decision.error } : {}),
          approver_id: me.id,
          approval_wait_ms: Math.max(0, new Date(decision.at).getTime() - new Date(run.created_at).getTime()),
        })
        .eq("id", action.run_id);
    }
  }

  revalidatePath("/", "layout");
  if (decision.status === "failed") return { ok: false, error: decision.error ?? "The change could not be applied.", decision };
  return { ok: true, decision, confirmation };
}

/** The decided row. When two clicks race, the loser can read it a moment before the winner stored the
 *  created keys (see the admin update below), so wait briefly for them on an approved row. */
async function readDecided(supabase: Awaited<ReturnType<typeof getContext>>["supabase"], id: string, byName: string): Promise<Decision> {
  for (let i = 0; ; i++) {
    const { data } = await supabase.from("pending_actions").select("status, result, decided_at").eq("id", id).single();
    const d = decisionOf(data ?? { status: "failed", result: null, decided_at: null }, byName);
    if (d.status !== "approved" || d.tasks || i >= 5) return d;
    await new Promise((r) => setTimeout(r, 150));
  }
}

/** The outcome stored on an already-decided proposal row. */
function decisionOf(a: { status: string; result: unknown; decided_at: string | null }, byName: string): Decision {
  const tasks = (a.result as { tasks?: { id: string; key: string }[] } | null)?.tasks;
  const error = (a.result as { error?: string } | null)?.error;
  return {
    status: a.status === "approved" ? "approved" : a.status === "cancelled" ? "cancelled" : "failed",
    byName,
    at: a.decided_at ?? new Date().toISOString(),
    ...(tasks ? { tasks, rows: tasks.length } : {}),
    ...(error ? { error } : {}),
  };
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const { supabase } = await getContext();
  const { data } = await supabase.from("conversations").select("id, title, updated_at").order("updated_at", { ascending: false }).limit(50);
  return (data ?? []).map((c) => ({ id: c.id, title: c.title, updatedAt: c.updated_at }));
}

export async function loadConversation(id: string): Promise<BrieflyMessage[]> {
  if (!z.uuid().safeParse(id).success) return [];
  const { supabase } = await getContext();
  const { data } = await supabase.from("conversations").select("messages").eq("id", id).maybeSingle();
  return (data?.messages ?? []) as unknown as BrieflyMessage[];
}
