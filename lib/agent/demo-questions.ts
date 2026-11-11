// The public demo's fixed questions. With DEMO_SCRIPTED on, the composer offers only these and
// /api/chat refuses any other text, so nobody can spend model tokens or try a prompt injection.
// Client-safe: the scripted answers live in demo-model.ts (server only).

export type DemoQuestion = { id: string; label: string; prompt: string };

export const DEMO_QUESTIONS: DemoQuestion[] = [
  { id: "overdue", label: "What's overdue across all projects?", prompt: "What's overdue across all projects?" },
  { id: "week", label: "What's due this week?", prompt: "What's due this week?" },
  { id: "summary", label: "Summarize this project", prompt: "Summarize this project" },
  { id: "mobile", label: "Show me everything in Mobile beta", prompt: "Show me everything in Mobile beta" },
  {
    id: "create",
    label: "Create three launch tasks due Friday",
    prompt: "Create three tasks for the launch: landing copy, pricing page, email sequence. All due Friday.",
  },
  { id: "assign", label: "Assign the new launch tasks to Tomás", prompt: "Assign the new launch tasks to Tomás" },
  { id: "done", label: "Move every Q1 onboarding task to Done", prompt: "Move every Q1 onboarding task to Done" },
  { id: "sam", label: "Assign WEB-25 to Sam", prompt: "Assign WEB-25 to Sam" },
  { id: "s-mentions", label: "What needs my reply in Slack?", prompt: "What needs my reply in Slack?" },
];

/** Questions about one attached simulated Slack thread. */
export function threadQuestions(thread: { korean: boolean; waiting: boolean }): DemoQuestion[] {
  return [
    { id: "s-summary", label: "Summarize this thread", prompt: "Summarize this thread" },
    ...(thread.korean ? [{ id: "s-translate", label: "Translate the latest message", prompt: "Translate the latest message" }] : []),
    ...(thread.waiting ? [{ id: "s-draft", label: "Draft a reply", prompt: "Draft a reply" }] : []),
  ];
}

type Status = "todo" | "doing" | "done";
const STATUS_LABEL: Record<Status, string> = { todo: "Todo", doing: "In progress", done: "Done" };
export const NEXT_STATUS: Record<Status, Status> = { todo: "doing", doing: "done", done: "todo" };

/** Questions about one attached task (scripted mode): summarize, move it on, take it. */
export function taskQuestions(task: { key: string; status: Status; assigneeId: string | null }, meId: string): DemoQuestion[] {
  const next = NEXT_STATUS[task.status];
  const move = task.status === "done" ? `Move ${task.key} back to Todo` : `Move ${task.key} to ${STATUS_LABEL[next]}`;
  return [
    { id: "t-summary", label: `Summarize ${task.key}`, prompt: `Summarize ${task.key}` },
    { id: "t-move", label: move, prompt: move },
    ...(task.assigneeId === meId ? [] : [{ id: "t-me", label: `Assign ${task.key} to me`, prompt: `Assign ${task.key} to me` }]),
  ];
}

/** The fixed question a prompt is, if any: the general list, or the attached task's questions. */
export const demoQuestionFor = (prompt: string, task?: DemoQuestion[]) => [...(task ?? []), ...DEMO_QUESTIONS].find((q) => q.prompt === prompt.trim());
