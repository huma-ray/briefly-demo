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
        proposal = { ...out.proposal, items };
        next = { ...out, proposal };
      }
      return { ...p, output: { ...next, decision } } as typeof p;
    });
    return touched ? ({ ...m, parts } as BrieflyMessage) : m;
  });
  return { messages: patched, proposal };
}

export function joinList(xs: string[]): string {
  return xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const STATUS_NAME = { todo: "Todo", doing: "In progress", done: "Done" } as const;

/** Deterministic confirmation text (no model call, cannot hallucinate). */
export function buildConfirmation(tool: WriteTool, decision: Decision, proposal?: Proposal): string {
  if (decision.status === "cancelled") return "Cancelled. Nothing was changed.";
  if (decision.status === "failed") return `That change was not applied: ${decision.error ?? "unknown error"} Nothing was changed.`;
  const keys = joinList((decision.tasks ?? []).map((t) => t.key));
  const first = proposal?.items[0];
  if (tool === "create_task") {
    const projects = joinList([...new Set((proposal?.items ?? []).map((i) => i.projectName))]);
    return `Created ${keys}${projects ? ` in ${projects}` : ""}. Want me to assign them or set due dates?`;
  }
  if (tool === "update_task_status") {
    return `Moved ${keys} to ${first ? STATUS_NAME[first.status] : "the new status"}. Anything else to update?`;
  }
  return first?.assigneeName ? `Assigned ${keys} to ${first.assigneeName}. Anything else to update?` : `Unassigned ${keys}. Anything else to update?`;
}
