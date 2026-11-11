import { getContext } from "@/lib/context";
import { isToolUIPart } from "ai";
import { ApprovalsList, type ApprovalEntry } from "@/components/approvals/approvals-list";
import type { BrieflyMessage } from "@/lib/agent/contract";

const textOf = (m: BrieflyMessage | undefined) => (m?.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();

/** Every proposal the person has not decided yet, from all of their conversations (RLS: own rows only). */
export default async function ApprovalsPage() {
  const { supabase } = await getContext();
  const { data: pending } = await supabase
    .from("pending_actions")
    .select("id, tool, tool_call_id, conversation_id, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const convIds = [...new Set((pending ?? []).flatMap((p) => (p.conversation_id ? [p.conversation_id] : [])))];
  const { data: convs } = convIds.length
    ? await supabase.from("conversations").select("id, title, messages").in("id", convIds)
    : { data: [] as { id: string; title: string; messages: unknown }[] };
  const byId = new Map((convs ?? []).map((c) => [c.id, c.messages as unknown as BrieflyMessage[]]));
  const titles = new Map((convs ?? []).map((c) => [c.id, c.title]));

  const entries: ApprovalEntry[] = (pending ?? []).map((p) => {
    const messages = (p.conversation_id && byId.get(p.conversation_id)) || [];
    // The proposal lives in the stored tool part; the question is the last user message before it.
    const at = messages.findIndex((m) => m.parts.some((part) => isToolUIPart(part) && part.toolCallId === p.tool_call_id));
    const part = at >= 0 ? messages[at].parts.find((x) => isToolUIPart(x) && x.toolCallId === p.tool_call_id) : undefined;
    const question = at >= 0 ? textOf([...messages.slice(0, at)].reverse().find((m) => m.role === "user")) : "";
    return {
      actionId: p.id,
      tool: p.tool,
      at: p.created_at,
      conversationId: p.conversation_id,
      title: (p.conversation_id && titles.get(p.conversation_id)) || null,
      question,
      output: part && "output" in part ? part.output : null,
    };
  });

  return <ApprovalsList entries={entries} />;
}
