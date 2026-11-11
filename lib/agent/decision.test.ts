import { test } from "node:test";
import assert from "node:assert/strict";
import type { BrieflyMessage, Decision, Proposal } from "./contract";

const { patchDecision, buildConfirmation }: typeof import("./decision") = await import(new URL("./decision.ts", import.meta.url).href);

const item = (title: string) => ({ title, titleEditable: true, projectName: "Website relaunch", projectColor: 1, status: "todo" as const, dueDate: null, assigneeName: null });
const proposal: Proposal = { heading: "Approve 2 new tasks", approveLabel: "Create 2 tasks", items: [item("A"), item("B")] };
const messages = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] },
  {
    id: "a1",
    role: "assistant",
    parts: [{ type: "tool-create_task", toolCallId: "call_1", state: "output-available", input: {}, output: { ok: true, status: "pending_approval", actionId: "x", proposal, note: "n" } }],
  },
] as unknown as BrieflyMessage[];
const decision: Decision = { status: "approved", byName: "Alex Kim", at: "2026-11-10T00:00:00Z", tasks: [{ id: "1", key: "WEB-26" }, { id: "2", key: "WEB-27" }] };

test("patchDecision adds the decision to the matching tool part only, with edited titles", () => {
  const { messages: out, proposal: p } = patchDecision(messages, "call_1", decision, ["A v2"]);
  const part = out[1].parts[0] as unknown as { output: { decision: Decision; proposal: Proposal } };
  assert.equal(part.output.decision.status, "approved");
  assert.equal(part.output.proposal.items[0].title, "A v2");
  assert.equal(part.output.proposal.items[1].title, "B");
  assert.equal(p?.items[0].title, "A v2");
  assert.equal(out[0], messages[0]);
  const none = patchDecision(messages, "other", decision);
  assert.equal(none.messages[1], messages[1]);
});

test("confirmations", () => {
  assert.equal(buildConfirmation("create_task", decision, proposal), "Created WEB-26 and WEB-27 in Website relaunch. Want me to assign them or set due dates?");
  assert.equal(buildConfirmation("create_task", { ...decision, status: "cancelled" }), "Cancelled. Nothing was changed.");
  const done = { ...proposal, items: [{ ...item("A"), assigneeName: "Priya Shah", dueDate: "2026-11-16" }] };
  assert.equal(buildConfirmation("create_task", { ...decision, tasks: [{ id: "1", key: "ONB-10" }] }, done), "Created ONB-10 in Website relaunch. Anything else?");
  const reply: Proposal = { heading: "Reply in #partner-kr (simulated)", approveLabel: "Post reply", items: [], reply: { threadId: "t", channel: "#partner-kr", excerpt: "안녕하세요", text: "네", meaning: "Yes" } };
  assert.equal(buildConfirmation("reply_in_thread", { ...decision, tasks: undefined, thread: { id: "t", messageId: "m" } }, reply), "Posted your reply in #partner-kr (simulated). Anything else?");
  const { proposal: posted } = patchDecision(
    [{ id: "a", role: "assistant", parts: [{ type: "tool-reply_in_thread", toolCallId: "c", state: "output-available", input: {}, output: { ok: true, status: "pending_approval", actionId: "x", proposal: reply, note: "n" } }] }] as unknown as BrieflyMessage[],
    "c",
    { ...decision, text: "네, 보내드릴게요" },
  );
  assert.equal(posted?.reply?.text, "네, 보내드릴게요", "an edited reply is stored as posted");
  const noDue = { ...proposal, items: [{ ...item("A"), assigneeName: "Priya Shah" }] };
  assert.match(buildConfirmation("create_task", decision, noDue), /Want me to set due dates\?$/);
  assert.match(buildConfirmation("assign_task", { ...decision, status: "failed", error: "No access." }), /not applied: No access\. Nothing was changed/);
  const assign: Proposal = { ...proposal, items: [{ ...item("A"), titleEditable: false, assigneeName: "Tomás García" }] };
  assert.match(buildConfirmation("assign_task", decision, assign), /^Assigned WEB-26 and WEB-27 to Tomás García\./);
  const status: Proposal = { ...proposal, items: [{ ...item("A"), status: "doing" }] };
  assert.match(buildConfirmation("update_task_status", decision, status), /^Moved WEB-26 and WEB-27 to In progress\./);
});
