// Pure helpers for the approval commit: patch the decision into the stored
// conversation (so the model sees the outcome next turn) and word the
// deterministic assistant confirmation. No `@/` imports (unit-tested).
import type { BrieflyMessage, Decision, Proposal, WriteTool } from "./contract";

type ToolPart = { type: string; toolCallId: string; state?: string; input?: unknown; output?: unknown };
const isToolPart = (p: { type: string }): p is ToolPart => p.type.startsWith("tool-") || p.type === "dynamic-tool";

/** Returns messages with `decision` added to the output of the tool part with `toolCallId`.
 *  For an approved create_task, `titles` (the edits) replace the proposed titles on the card. */
export function patchDecision(
  messages: BrieflyMessage[],
  toolCallId: string,
  decision: Decision,
  titles?: string[],
): { messages: BrieflyMessage[]; proposal?: Proposal } {
  let proposal: Proposal | undefined;
  const patched = messages.map((m) => {
    if (m.role !== "assistant") return m;
    let touched = false;
    const parts = m.parts.map((p) => {
      if (!isToolPart(p) || p.toolCallId !== toolCallId) return p;
      const out = p.output as { proposal?: Proposal } | undefined;
      if (!out || typeof out !== "object") return p;
      touched = true;
      let next = out as Record<string, unknown>;
      if (out.proposal) {
        const items = out.proposal.items.map((it, i) =>
          decision.status === "approved" && it.titleEditable && titles?.[i] ? { ...it, title: titles[i].trim() } : it,
        );
        // An edited reply is stored as posted, so the reloaded card shows what was actually sent.
        const reply = out.proposal.reply && decision.status === "approved" && decision.text ? { ...out.proposal.reply, text: decision.text } : out.proposal.reply;
        proposal = { ...out.proposal, items, ...(reply ? { reply } : {}) };
        next = { ...out, proposal };
      }
      return { ...p, output: { ...next, decision } } as typeof p;
    });
    return touched ? ({ ...m, parts } as BrieflyMessage) : m;
  });
  return { messages: patched, proposal };
}

export function joinList(xs: string[], conj = "and"): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} ${conj} ${xs[xs.length - 1]}`;
}

const STATUS_NAME = { todo: "Todo", doing: "In progress", done: "Done" } as const;

/** Deterministic confirmation text (no model call, cannot hallucinate). */
export function buildConfirmation(tool: WriteTool, decision: Decision, proposal?: Proposal): string {
  if (decision.status === "cancelled") return "Cancelled. Nothing was changed.";
  if (decision.status === "failed") return `That change was not applied: ${decision.error ?? "unknown error"} Nothing was changed.`;
  if (tool === "reply_in_thread") return `Posted your reply in ${proposal?.reply?.channel ?? "the thread"} (simulated). Anything else?`;
  const keys = joinList((decision.tasks ?? []).map((t) => t.key));
  const first = proposal?.items[0];
  if (tool === "create_task") {
    const projects = joinList([...new Set((proposal?.items ?? []).map((i) => i.projectName))]);
    // Offer only what is still missing, so a fully specified task does not get a pointless question.
    const items = proposal?.items ?? [];
    const them = items.length === 1 ? "it" : "them";
    const missing = joinList([...(items.some((i) => !i.assigneeName) ? [`assign ${them}`] : []), ...(items.some((i) => !i.dueDate) ? ["set due dates"] : [])], "or");
    return `Created ${keys}${projects ? ` in ${projects}` : ""}. ${missing ? `Want me to ${missing}?` : "Anything else?"}`;
  }
  if (tool === "update_task_status") {
    return `Moved ${keys} to ${first ? STATUS_NAME[first.status] : "the new status"}. Anything else to update?`;
  }
  return first?.assigneeName ? `Assigned ${keys} to ${first.assigneeName}. Anything else to update?` : `Unassigned ${keys}. Anything else to update?`;
}
