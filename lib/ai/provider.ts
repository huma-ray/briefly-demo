import "server-only";
// The only file that knows which model provider is used. Order:
//   1. the workspace's custom endpoint (set by an Admin from the model badge),
//   2. a deployment-wide OpenAI-compatible endpoint (AI_BASE_URL, e.g. LiteLLM / vLLM),
//   3. OpenAI.
// To make Claude the default instead of OpenAI: `npm i @ai-sdk/anthropic`, then replace
// the two lines marked "provider" with
//   import { anthropic } from "@ai-sdk/anthropic";
//   const hosted = () => anthropic(defaultModelId);
// and set AI_MODEL to a Claude model id listed in lib/ai/pricing.ts.
import { openai } from "@ai-sdk/openai"; // provider
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { endpointFetch } from "@/lib/ai/endpoint";
import { costUsd, priceOf } from "@/lib/ai/pricing";
import { decryptSecret } from "@/lib/ai/secret";
import type { Database } from "@/lib/database.types";

export const defaultModelId = process.env.AI_MODEL ?? "gpt-4o-mini";
const envBaseUrl = process.env.AI_BASE_URL;
// Unknown hosted model ids fail at startup, not on the first bill.
if (!envBaseUrl) priceOf(defaultModelId);

export type ActiveModel = {
  model: LanguageModel;
  modelId: string;
  /** Self-hosted or bring-your-own endpoint: not billed by us. */
  custom: boolean;
  cost: (tokensIn: number, tokensOut: number) => number;
};

export function compatibleModel(baseURL: string, modelId: string, apiKey?: string | null): ActiveModel {
  const provider = createOpenAICompatible({
    name: "custom",
    baseURL,
    apiKey: apiKey || undefined,
    includeUsage: true, // token counts in the stream, for the Agent log
    fetch: endpointFetch,
  });
  return { model: provider.chatModel(modelId), modelId, custom: true, cost: () => 0 };
}

const hosted = () => openai(defaultModelId); // provider

export function defaultModel(): ActiveModel {
  if (envBaseUrl) return compatibleModel(envBaseUrl, defaultModelId, process.env.AI_API_KEY);
  return { model: hosted(), modelId: defaultModelId, custom: false, cost: (i, o) => costUsd(defaultModelId, i, o) };
}

/** The model this workspace's assistant uses right now. Reads the encrypted key with the service role. */
export async function workspaceModel(admin: SupabaseClient<Database>, workspaceId: string): Promise<ActiveModel> {
  const { data } = await admin.from("ai_settings").select("base_url, model, api_key_enc").eq("workspace_id", workspaceId).maybeSingle();
  if (!data) return defaultModel();
  return compatibleModel(data.base_url, data.model, data.api_key_enc ? decryptSecret(data.api_key_enc) : null);
}
