import "server-only";
// Everything that waits for the person, from every source, in one shape. Today renders only this,
// so a new source (real Slack, Jira) is one more collector here, not a Today rewrite.
import type { Context } from "@/lib/context";
import { todayKst } from "@/lib/dates";
import { TASK_COLUMNS, toTask } from "@/lib/model";
import type { BrieflyMessage, Proposal } from "@/lib/agent/contract";

export type WorkSource = "briefly" | "slack" | "jira";
/** Why the item waits for the person. */
export type WorkStatus = "awaiting_approval" | "overdue" | "due_today" | "needs_reply";

export type WorkItem = {
  source: WorkSource;
  /** Unique within its source: task key, proposal id, thread id. */
  id: string;
  title: string;
  /** YYYY-MM-DD, or null when the item has no due date. */
  due: string | null;
  status: WorkStatus;
  /** Where the item lives in the app. */
  link: string;
  /** Short context line: project, channel, who asked. */
  detail?: string;
  /** How to hand the item to the assistant (attach it to the composer). */
  ask?: { kind: "task"; key: string } | { kind: "thread"; id: string; channel: string; excerpt: string; korean: boolean; waiting: boolean };
  /** Simulated sources are labelled as such. */
  simulated?: boolean;
};

type Collector = (ctx: Context) => Promise<WorkItem[]>;

const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Proposals the assistant prepared that nobody has decided yet (RLS: own only). The card itself lives in
 *  the conversation's tool part, so the title comes from there; the request is the fallback. */
const approvals: Collector = async ({ supabase }) => {
  const { data } = await supabase.from("pending_actions").select("id, tool, tool_call_id, conversation_id, agent_runs(prompt)").eq("status", "pending").order("created_at", { ascending: false });
  if (!data?.length) return [];
  const convIds = [...new Set(data.flatMap((p) => (p.conversation_id ? [p.conversation_id] : [])))];
  const { data: convs } = convIds.length ? await supabase.from("conversations").select("id, messages").in("id", convIds) : { data: [] };
  const proposals = new Map<string, Proposal>();
  for (const c of convs ?? [])
    for (const m of c.messages as unknown as BrieflyMessage[])
      for (const part of m.parts) {
        const out = (part as { toolCallId?: string; output?: { proposal?: Proposal } }).output;
        if (out?.proposal) proposals.set((part as { toolCallId: string }).toolCallId, out.proposal);
      }
  return data.map((p) => {
    const run = Array.isArray(p.agent_runs) ? p.agent_runs[0] : p.agent_runs;
    const proposal = proposals.get(p.tool_call_id);
    const first = proposal?.reply ? `Reply in ${proposal.reply.channel}` : proposal?.items[0]?.title;
    const more = proposal && proposal.items.length > 1 ? ` and ${proposal.items.length - 1} more` : "";
    return {
      source: "briefly",
      id: p.id,
      title: first ? `${first}${more}` : (run?.prompt ?? p.tool),
      due: null,
      status: "awaiting_approval",
      link: "/approvals",
      detail: proposal?.heading ?? p.tool,
    };
  });
};

/** Open tasks overdue or due today in projects the person can see. */
const tasks: Collector = async ({ supabase, projects }) => {
  const today = todayKst();
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).lte("due_date", today).neq("status", "done").order("due_date");
  return (data ?? []).map((r) => {
    const t = toTask(r as never);
    const project = projects.find((p) => p.id === t.projectId);
    return {
      source: "briefly",
      id: t.key,
      title: t.title,
      due: t.dueDate,
      status: t.dueDate === today ? "due_today" : "overdue",
      link: `/p/${t.projectKey}/board?task=${t.key}`,
      detail: `${t.key} · ${project?.name ?? t.projectKey}`,
      ask: { kind: "task", key: t.key },
    };
  });
};

/** Simulated Slack threads waiting for the person's reply. */
const slack: Collector = async ({ supabase }) => {
  const { data: threads } = await supabase.from("slack_threads").select("id, channel, status").eq("status", "waiting").order("created_at", { ascending: false });
  if (!threads?.length) return [];
  const { data: msgs } = await supabase.from("slack_messages").select("thread_id, author_name, lang, body, created_at").in("thread_id", threads.map((t) => t.id)).order("created_at");
  return threads.map((t) => {
    const mine = (msgs ?? []).filter((m) => m.thread_id === t.id);
    const ask = [...mine].reverse().find((m) => /@\S/.test(m.body)) ?? mine.at(-1);
    return {
      source: "slack",
      id: t.id,
      title: capital((ask?.body ?? "").replace(/^@\S+ \S+ /, "")),
      due: null,
      status: "needs_reply",
      link: "/inbox?tab=slack",
      detail: `${t.channel} · ${ask?.author_name ?? ""}`,
      simulated: true,
      ask: { kind: "thread", id: t.id, channel: t.channel, excerpt: (mine[0]?.body ?? "").replace(/^@\S+ \S+ /, "").slice(0, 60), korean: mine.some((m) => m.lang === "ko"), waiting: true },
    };
  });
};

const COLLECTORS: Collector[] = [approvals, tasks, slack];

/** Every waiting item, from every source. */
export async function workItems(ctx: Context): Promise<WorkItem[]> {
  return (await Promise.all(COLLECTORS.map((c) => c(ctx)))).flat();
}
