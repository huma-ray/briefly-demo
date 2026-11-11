import "server-only";
// Public demo (DEMO_SCRIPTED=true): no language model is called. Each fixed question in
// demo-questions.ts maps to one real tool call (same tools, same RLS, same approval cards,
// same Agent log) and a reply written from the tool's actual result. It is plugged in as an
// OpenAI-compatible model whose fetch answers locally, so the rest of the pipeline is unchanged.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { addDays, formatDue } from "@/lib/dates";
import type { Task } from "@/lib/model";
import type { ActiveModel } from "@/lib/ai/provider";
import { NEXT_STATUS, demoQuestionFor, taskQuestions, threadQuestions } from "./demo-questions";
import type { ToolCtx } from "./tools";

export const DEMO_MODEL_ID = "demo-script";

/** An attached simulated Slack thread, with the prepared content its scripted questions use. */
export type DemoThread = {
  id: string;
  channel: string;
  status: string;
  korean: boolean;
  messages: number;
  script: { summary?: string; translation?: string; draft?: string; draft_meaning?: string } | null;
};
export const demoScripted = () => process.env.DEMO_SCRIPTED === "true";

type Step = { tool: string; args: unknown } | { text: string };

/** Monday of the KST week that contains `today` (YYYY-MM-DD). */
function monday(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(today, -((dow + 6) % 7));
}

/** The coming Friday (today when today is Friday). */
function friday(today: string): string {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay();
  return addDays(today, (5 - dow + 7) % 7);
}

/** Keys of the launch tasks created and approved earlier in this conversation. */
async function launchKeys(ctx: ToolCtx): Promise<string[]> {
  const { data } = await ctx.supabase
    .from("pending_actions")
    .select("result")
    .eq("conversation_id", ctx.conversationId)
    .eq("tool", "create_task")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);
  const tasks = (data?.[0]?.result as { tasks?: { key: string }[] } | null)?.tasks ?? [];
  return tasks.map((t) => t.key);
}

async function openKeys(ctx: ToolCtx, projectKey: string): Promise<string[]> {
  const { data } = await ctx.supabase.from("tasks").select("number, projects!inner(key)").eq("projects.key", projectKey).neq("status", "done").order("number");
  return (data ?? []).map((t) => `${projectKey}-${t.number}`);
}

async function firstStep(id: string, ctx: ToolCtx, task?: Task, thread?: DemoThread): Promise<Step> {
  switch (id) {
    case "s-mentions":
      return { tool: "list_mentions", args: {} };
    case "s-summary":
    case "s-translate":
      return { tool: "get_thread", args: { thread: thread!.id } };
    case "s-draft":
      if (!thread?.script?.draft) return { text: "I have no prepared draft for this thread in the scripted demo. Connect your own model to draft one." };
      return { tool: "reply_in_thread", args: { thread: thread.id, text: thread.script.draft, ...(thread.script.draft_meaning ? { meaning: thread.script.draft_meaning } : {}) } };
    case "t-summary":
      return { tool: "get_task", args: { task: task!.key } };
    case "t-move":
      return { tool: "update_task_status", args: { tasks: [task!.key], status: NEXT_STATUS[task!.status] } };
    case "t-me":
      return { tool: "assign_task", args: { tasks: [task!.key], assignee: "me" } };
    case "overdue":
      return { tool: "list_overdue", args: {} };
    case "week": {
      const from = monday(ctx.today);
      return { tool: "list_tasks", args: { due_from: from, due_to: addDays(from, 6), open_only: true } };
    }
    case "summary":
      return { tool: "summarize_project", args: {} };
    case "mobile":
      return { tool: "list_tasks", args: { project: "Mobile beta" } };
    case "create": {
      const due = friday(ctx.today);
      return { tool: "create_task", args: { tasks: ["Landing page copy", "Pricing page", "Email sequence"].map((title) => ({ title, status: "todo", due_date: due })) } };
    }
    case "assign": {
      const keys = await launchKeys(ctx);
      if (!keys.length) return { text: "There are no new launch tasks in this conversation yet. Ask me to create the three launch tasks and approve them first, then I can assign them." };
      return { tool: "assign_task", args: { tasks: keys, assignee: "Tomás" } };
    }
    case "done": {
      const keys = await openKeys(ctx, "ONB");
      if (!keys.length) return { text: "Q1 onboarding has no open tasks you can change." };
      return { tool: "update_task_status", args: { tasks: keys, status: "done" } };
    }
    case "sam":
      return { tool: "assign_task", args: { tasks: ["WEB-25"], assignee: "Sam" } };
    default:
      return { text: "Pick one of the suggested questions." };
  }
}

type Out = {
  ok?: boolean;
  status?: string;
  error?: string;
  blocked?: boolean;
  rows?: number;
  scope?: { searched: number; total: number };
  proposal?: { items: unknown[] };
  summary?: {
    project: { name: string };
    counts: { todo: number; doing: number; done: number };
    overdue: string[];
    task?: { key: string; title: string; status: string; assignee: string | null; dueDate: string | null; history: string[] };
  };
};

const STATUS_WORD: Record<string, string> = { todo: "to do", doing: "in progress", done: "done" };

type ThreadOut = { waiting?: { channel: string; lastAuthor: string }[]; messages?: { author: string; lang: string; text: string }[] };

function reply(id: string, out: Out, thread?: DemoThread, meName?: string): string {
  const s = out.summary as ThreadOut | undefined;
  if (out.ok !== false && id === "s-mentions") {
    const w = s?.waiting ?? [];
    if (!w.length) return "No Slack mentions are waiting for your reply.";
    return `${w.length} simulated Slack thread${w.length === 1 ? " is" : "s are"} waiting for your reply: ${w.map((t) => `${t.channel} (${t.lastAuthor})`).join(", ")}. Use Ask assistant on one to summarize it, translate it or draft a reply.`;
  }
  if (out.ok !== false && id === "s-summary") {
    if (thread?.script?.summary) return thread.script.summary;
    const msgs = s?.messages ?? [];
    return `${msgs.length} message${msgs.length === 1 ? "" : "s"} in ${thread?.channel ?? "this thread"}; the latest is from ${msgs.at(-1)?.author ?? "someone"}. Nothing here asks you for anything.`;
  }
  if (out.ok !== false && id === "s-translate") {
    // The latest Korean message from someone else (the person's own reply needs no translation).
    const last = [...(s?.messages ?? [])].reverse().find((m) => m.lang === "ko" && m.author !== meName);
    return thread?.script?.translation && last ? `${last.author} wrote: "${thread.script.translation}"` : "There is no Korean message to translate in this thread.";
  }
  if (out.status === "pending_approval" && id === "s-draft") return "Here is a draft reply. Edit it if you like; nothing is posted until you approve.";
  if (out.ok === false) return out.blocked ? `${out.error} I can't show or change anything there.` : `That didn't work: ${out.error}. Nothing was changed.`;
  if (out.status === "pending_approval") {
    const n = out.proposal?.items.length ?? 0;
    if (id === "create") return "Here are the three launch tasks, due Friday. Rename any of them with Edit, then approve. Nothing is created until you do.";
    if (id === "done") return `That moves ${n} Q1 onboarding task${n === 1 ? "" : "s"} to Done. Check the card first; nothing changes until you approve.`;
    if (id === "t-move") return "Here is the status change. Check the card first; nothing changes until you approve.";
    if (id === "t-me") return "That makes you the owner. Check the card first; nothing changes until you approve.";
    return `That assigns ${n} task${n === 1 ? "" : "s"} to Tomás. Check the card first; nothing changes until you approve.`;
  }
  const rows = out.rows ?? 0;
  const narrowed = out.scope && out.scope.searched < out.scope.total;
  switch (id) {
    case "overdue":
      return rows ? `${rows} task${rows === 1 ? " is" : "s are"} overdue${narrowed ? " in the projects you can open" : ""}. The oldest is first.` : "Nothing is overdue. Nice.";
    case "week":
      return rows ? `${rows} open task${rows === 1 ? " is" : "s are"} due this week, soonest first.` : "Nothing open is due this week.";
    case "summary": {
      const s = out.summary;
      if (!s) return `${rows} tasks in this project.`;
      const late = s.overdue.length ? ` ${s.overdue.length} overdue (${s.overdue.join(", ")}).` : " Nothing is overdue.";
      return `${s.project.name}: ${s.counts.doing} in progress, ${s.counts.todo} to do, ${s.counts.done} done.${late}`;
    }
    case "t-summary": {
      const t = out.summary?.task;
      if (!t) return "I couldn't read that task.";
      const due = t.dueDate ? `, due ${formatDue(t.dueDate)}` : ", no due date";
      const last = t.history[0] ? ` Latest change: ${t.history[0]}.` : "";
      return `${t.key} "${t.title}" is ${STATUS_WORD[t.status] ?? t.status}, ${t.assignee ? `owned by ${t.assignee}` : "unassigned"}${due}. ${t.history.length} change${t.history.length === 1 ? "" : "s"} on record.${last}`;
    }
    case "mobile":
      return `Mobile beta has ${rows} task${rows === 1 ? "" : "s"}.`;
    default:
      return "Done.";
  }
}

/** One OpenAI-style streamed completion: a tool call or a text reply, with zero token usage. */
function sse(step: Step): Response {
  const id = `demo-${crypto.randomUUID()}`;
  const chunk = (o: object) => `data: ${JSON.stringify({ id, object: "chat.completion.chunk", model: DEMO_MODEL_ID, ...o })}\n\n`;
  const body =
    "tool" in step
      ? chunk({ choices: [{ index: 0, delta: { role: "assistant", tool_calls: [{ index: 0, id: `call_${id.slice(5, 17)}`, type: "function", function: { name: step.tool, arguments: JSON.stringify(step.args) } }] }, finish_reason: null }] }) +
        chunk({ choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] })
      : chunk({ choices: [{ index: 0, delta: { role: "assistant", content: step.text }, finish_reason: null }] }) + chunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
  const usage = chunk({ choices: [], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } });
  return new Response(body + usage + "data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
}

type Msg = { role: string; content?: unknown };
const text = (m: Msg) => (typeof m.content === "string" ? m.content : Array.isArray(m.content) ? m.content.map((c: { text?: string }) => c.text ?? "").join("") : "");

/** The scripted "model" for one request. */
export function demoModel(ctx: ToolCtx, task?: Task, thread?: DemoThread): ActiveModel {
  const provider = createOpenAICompatible({
    name: "demo",
    baseURL: "https://demo.invalid/v1",
    includeUsage: true,
    fetch: async (_url, init) => {
      const { messages } = JSON.parse(String(init?.body)) as { messages: Msg[] };
      const last = messages.at(-1)!;
      const question = demoQuestionFor(text([...messages].reverse().find((m) => m.role === "user") ?? { role: "user" }), task ? taskQuestions(task, ctx.me.id) : thread ? threadQuestions({ korean: thread.korean, waiting: thread.status === "waiting" }) : undefined);
      const id = question?.id ?? "";
      if (last.role !== "tool") return sse(await firstStep(id, ctx, task, thread));
      let out: Out = {};
      try {
        const parsed = JSON.parse(text(last));
        out = (parsed?.value ?? parsed) as Out;
      } catch {}
      return sse({ text: reply(id, out, thread, ctx.me.name) });
    },
  });
  return { model: provider.chatModel(DEMO_MODEL_ID), modelId: DEMO_MODEL_ID, custom: true, cost: () => 0 };
}
