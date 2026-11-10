import "server-only";
import { tool } from "ai";
import { z } from "zod";
import type { createAdminClient } from "@/lib/supabase/server";
import type { Context } from "@/lib/context";
import type { Json } from "@/lib/database.types";
import { TASK_COLUMNS, STATUSES, toTask, type Label, type Project, type Status, type Task } from "@/lib/model";
import { formatDue } from "@/lib/dates";
import type { MiniTask, PreviewItem, Proposal, ReadOutput, ToolFailure, ToolName, WriteOutput, WriteTool } from "./contract";
import { isValidDate, norm, parseTaskKey, resolveLabel, resolveMember, resolveProject } from "./resolve";
import type { CallStatus } from "./run-result";

/** Everything a tool needs for one request. `supabase` is the visitor's RLS client:
 *  all task data is read through it. `admin` only writes server-owned rows
 *  (proposals, tool-call log) and answers "does a hidden project exist". */
export type ToolCtx = Pick<Context, "supabase" | "workspace" | "me" | "members" | "projects" | "labels" | "counts"> & {
  admin: ReturnType<typeof createAdminClient>;
  runId: string;
  conversationId: string;
  projectKey: string; // project in the composer pill: default for tools
  today: string; // KST YYYY-MM-DD
  calls: { status: CallStatus }[]; // filled as tools run, read by the route to classify the run
};

const MAX_TASKS_SHOWN = 50;
const NOTE =
  "NOT written yet. This is only a proposal: an approval card is now shown and nothing changes until the person approves it. Do not say it was done.";

// ---------------------------------------------------------------- results

const failure = (error: string, candidates?: string[]): ToolFailure => ({ ok: false, error, candidates, durationMs: 0 });
const blocked = (what: string, project?: string): ToolFailure => ({ ok: false, blocked: true, project, error: `You don't have access to ${what}.`, durationMs: 0 });
const fail = (r: { error: string; candidates?: string[]; blocked?: boolean }) => (r.blocked ? blocked(r.error) : failure(r.error, r.candidates));

type Output = ReadOutput | WriteOutput;

/** Runs a tool body, never throws, times it, and logs the call (admin client, server-owned row). */
function define<I>(ctx: ToolCtx, name: ToolName, kind: "read" | "write", body: (input: I, toolCallId: string) => Promise<Output>) {
  return async (input: I, { toolCallId }: { toolCallId: string }): Promise<Output> => {
    const t0 = performance.now();
    let out: Output;
    try {
      out = await body(input, toolCallId);
    } catch (e) {
      out = failure(`${name} failed: ${e instanceof Error ? e.message : "unexpected error"}. Nothing was changed.`);
    }
    const durationMs = Math.round(performance.now() - t0);
    if (!out.ok || "rows" in out) (out as { durationMs: number }).durationMs = durationMs;
    const status: CallStatus = !out.ok ? (out.blocked ? "blocked" : "error") : kind === "write" ? "pending" : "ok";
    ctx.calls.push({ status });
    const { error } = await ctx.admin.from("agent_tool_calls").insert({
      run_id: ctx.runId,
      tool_call_id: toolCallId,
      name,
      kind,
      args: input as Json,
      result: { ...out, tasks: undefined } as unknown as Json, // the task rows are on the message; keep the log small
      error: out.ok ? null : out.error,
      status,
      rows: out.ok && "rows" in out ? out.rows : null,
      duration_ms: durationMs,
    });
    if (error) console.error("agent_tool_calls insert failed", error.message);
    return out;
  };
}

// ---------------------------------------------------------------- lookups

/** Key of the project `query` names when it exists but is not visible to the person, else null.
 *  project_access() answers for keys; the admin lookup is only for project names and
 *  returns nothing but the key, which goes to the Agent log, never to the model. */
async function hiddenProjectKey(ctx: ToolCtx, query: string): Promise<string | null> {
  const { data } = await ctx.supabase.rpc("project_access", { project_key: query.trim() });
  if (data === "hidden") return query.trim().toUpperCase();
  const q = norm(query);
  const { data: all } = await ctx.admin.from("projects").select("key, name").eq("workspace_id", ctx.workspace.id);
  const visible = new Set(ctx.projects.map((p) => p.key));
  const hit = (all ?? []).find((p) => !visible.has(p.key) && (norm(p.key) === q || norm(p.name) === q || (q.length >= 3 && norm(p.name).includes(q))));
  return hit?.key ?? null;
}

async function findProject(ctx: ToolCtx, query: string): Promise<{ project: Project } | { fail: ToolFailure }> {
  const r = resolveProject(query, ctx.projects);
  if (r.ok) return { project: r.item };
  const hidden = r.error.startsWith("no project") ? await hiddenProjectKey(ctx, query) : null;
  if (hidden) return { fail: blocked(query.trim(), hidden) };
  return { fail: failure(r.error, r.candidates) };
}

/** Visible tasks by key. A key in a hidden project is "blocked", an unknown one "not found". */
async function findTasks(ctx: ToolCtx, keys: string[]): Promise<{ tasks: Task[] } | { fail: ToolFailure }> {
  const wanted = [...new Set(keys.map((k) => k.trim().toUpperCase()))];
  const parsed = wanted.map((k) => ({ k, p: parseTaskKey(k) }));
  const bad = parsed.find((x) => !x.p);
  if (bad) return { fail: failure(`"${bad.k}" is not a task key like WEB-18`) };
  const { data, error } = await ctx.supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .in("projects.key", [...new Set(parsed.map((x) => x.p!.project))])
    .in("number", parsed.map((x) => x.p!.number));
  if (error) throw error;
  const byKey = new Map((data as unknown as Parameters<typeof toTask>[0][]).map((r) => [toTask(r).key, toTask(r)]));
  const missing = wanted.filter((k) => !byKey.has(k));
  if (missing.length) {
    for (const k of missing) {
      const pk = parseTaskKey(k)!.project;
      if (!ctx.projects.some((p) => p.key === pk) && (await hiddenProjectKey(ctx, pk))) return { fail: blocked(pk, pk) };
    }
    return { fail: failure(`task ${missing.join(", ")} not found`) };
  }
  return { tasks: wanted.map((k) => byKey.get(k)!) };
}

const memberName = (ctx: ToolCtx, id: string | null) => (id ? (ctx.members.find((m) => m.id === id)?.name ?? null) : null);
const projectOf = (ctx: ToolCtx, id: string) => ctx.projects.find((p) => p.id === id)!;

/** Which of these (project, member) pairs are real project memberships. RLS shows the visitor's projects only. */
async function membershipOf(ctx: ToolCtx, projectIds: string[], memberIds: string[]): Promise<Set<string>> {
  if (!memberIds.length) return new Set();
  const { data, error } = await ctx.supabase.from("project_members").select("project_id, member_id").in("project_id", projectIds).in("member_id", memberIds);
  if (error) throw error;
  return new Set((data ?? []).map((r) => `${r.project_id}:${r.member_id}`));
}

const toMini = (t: Task): MiniTask => ({ id: t.id, key: t.key, title: t.title, status: t.status, dueDate: t.dueDate, assigneeId: t.assigneeId, projectKey: t.projectKey });

async function readTasks(ctx: ToolCtx, projects: Project[], f: { status?: Status; assigneeId?: string | null; labelId?: string; overdue?: boolean } = {}): Promise<Task[]> {
  let q = ctx.supabase.from("tasks").select(TASK_COLUMNS).in("project_id", projects.map((p) => p.id));
  if (f.status) q = q.eq("status", f.status);
  if (f.assigneeId === null) q = q.is("assignee_id", null);
  else if (f.assigneeId) q = q.eq("assignee_id", f.assigneeId);
  if (f.labelId) q = q.eq("label_id", f.labelId);
  if (f.overdue) q = q.lt("due_date", ctx.today).neq("status", "done");
  const { data, error } = await q.order("project_id").order("number").limit(500);
  if (error) throw error;
  return (data as unknown as Parameters<typeof toTask>[0][]).map(toTask);
}

const readOk = (ctx: ToolCtx, tasks: Task[], searched: number, summary?: unknown): ReadOutput => ({
  ok: true,
  rows: tasks.length,
  durationMs: 0,
  tasks: tasks.slice(0, MAX_TASKS_SHOWN).map(toMini),
  scope: { searched, total: ctx.counts.total },
  ...(summary ? { summary } : {}),
});

// ---------------------------------------------------------------- write helpers

async function propose(ctx: ToolCtx, tool: WriteTool, toolCallId: string, payload: unknown, proposal: Proposal): Promise<WriteOutput> {
  const { data, error } = await ctx.admin
    .from("pending_actions")
    .insert({
      workspace_id: ctx.workspace.id,
      member_id: ctx.me.id,
      run_id: ctx.runId,
      conversation_id: ctx.conversationId,
      tool_call_id: toolCallId,
      tool,
      payload: payload as Json,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ok: true, status: "pending_approval", actionId: data.id, proposal, note: NOTE };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const previewOf = (ctx: ToolCtx, t: Task, over: Partial<PreviewItem>): PreviewItem => {
  const p = projectOf(ctx, t.projectId);
  return { taskId: t.id, key: t.key, title: t.title, titleEditable: false, projectName: p.name, projectColor: p.color, status: t.status, dueDate: t.dueDate, assigneeName: memberName(ctx, t.assigneeId), ...over };
};

// ---------------------------------------------------------------- tools

const Project_ = z.string().min(1).describe("Project key (WEB) or name. Defaults to the project the person is looking at.");
const Person = z.string().min(1).describe('Name, first name, handle or initials of a workspace member; "me" is the requester.');
const StatusEnum = z.enum(STATUSES as [Status, ...Status[]]).describe("todo = Todo, doing = In progress, done = Done");
const Keys = z.array(z.string().min(1)).min(1).max(50).describe('Task keys such as "WEB-18"');

export function createTools(ctx: ToolCtx) {
  const defaultProject = (p?: string) => p ?? ctx.projectKey;

  return {
    list_tasks: tool({
      description: "List tasks of one project, optionally filtered by status, assignee or label.",
      inputSchema: z.strictObject({
        project: Project_.optional(),
        status: StatusEnum.optional(),
        assignee: z.string().min(1).describe('A workspace member (name, first name, handle, initials, "me") or "unassigned"').optional(),
        label: z.string().min(1).optional(),
      }),
      execute: define(ctx, "list_tasks", "read", async (a) => {
        const p = await findProject(ctx, defaultProject(a.project));
        if ("fail" in p) return p.fail;
        let assigneeId: string | null | undefined;
        if (a.assignee) {
          if (norm(a.assignee) === "unassigned") assigneeId = null;
          else {
            const m = resolveMember(a.assignee, ctx.members, ctx.me.id);
            if (!m.ok) return fail(m);
            assigneeId = m.item.id;
          }
        }
        let label: Label | undefined;
        if (a.label) {
          const l = resolveLabel(a.label, ctx.labels);
          if (!l.ok) return fail(l);
          label = l.item;
        }
        return readOk(ctx, await readTasks(ctx, [p.project], { status: a.status, assigneeId, labelId: label?.id }), 1);
      }),
    }),

    list_overdue: tool({
      description: "List overdue tasks (due before today in KST and not done) across every project the person can see, or in one project.",
      inputSchema: z.strictObject({ project: Project_.optional() }),
      execute: define(ctx, "list_overdue", "read", async (a) => {
        let projects = ctx.projects;
        if (a.project) {
          const p = await findProject(ctx, a.project);
          if ("fail" in p) return p.fail;
          projects = [p.project];
        }
        const tasks = (await readTasks(ctx, projects, { overdue: true })).sort((x, y) => (x.dueDate ?? "").localeCompare(y.dueDate ?? ""));
        return readOk(ctx, tasks, projects.length);
      }),
    }),

    summarize_project: tool({
      description: "Get a project's task counts by status, overdue count, its tasks and recent activity, to summarize for the person.",
      inputSchema: z.strictObject({ project: Project_.optional() }),
      execute: define(ctx, "summarize_project", "read", async (a) => {
        const p = await findProject(ctx, defaultProject(a.project));
        if ("fail" in p) return p.fail;
        const rank = { doing: 0, todo: 1, done: 2 } as const;
        const tasks = (await readTasks(ctx, [p.project])).sort((x, y) => rank[x.status] - rank[y.status]);
        const counts = { todo: 0, doing: 0, done: 0 };
        for (const t of tasks) counts[t.status]++;
        const overdue = tasks.filter((t) => t.dueDate && t.status !== "done" && t.dueDate < ctx.today).map((t) => t.key);
        const { data: act } = await ctx.supabase
          .from("activity")
          .select("kind, field, old_value, new_value, source, created_at, actor:members(name), task:tasks(number, title)")
          .eq("project_id", p.project.id)
          .order("created_at", { ascending: false })
          .limit(8);
        const recentActivity = ((act ?? []) as unknown as { kind: string; field: string | null; old_value: string | null; new_value: string | null; source: string; created_at: string; actor: { name: string } | null; task: { number: number; title: string } | null }[]).map((r) => {
          const key = `${p.project.key}-${r.task?.number}`;
          const what = r.kind === "created" ? `created ${key} "${r.new_value}"` : `changed ${key} ${r.field}: ${r.old_value ?? "none"} -> ${r.new_value ?? "none"}`;
          return `${formatDue(r.created_at.slice(0, 10))}: ${r.actor?.name ?? "Someone"} ${what}${r.source === "assistant" ? " (via assistant)" : ""}`;
        });
        return readOk(ctx, tasks, 1, { project: { key: p.project.key, name: p.project.name }, counts: { ...counts, total: tasks.length }, overdue, recentActivity });
      }),
    }),

    create_task: tool({
      description:
        "Propose new tasks (one call for the whole batch, 1-20 tasks). Nothing is created until the person approves the card. Due dates are YYYY-MM-DD; work out relative dates such as 'Friday' from today's date.",
      inputSchema: z.strictObject({
        tasks: z
          .array(
            z.strictObject({
              title: z.string().trim().min(1).max(200),
              project: Project_.optional(),
              status: StatusEnum.optional(),
              priority: z.number().int().min(0).max(4).optional().describe("0 none, 1 low, 2 medium, 3 high, 4 urgent"),
              label: z.string().min(1).optional(),
              due_date: z.string().optional().describe("YYYY-MM-DD"),
              assignee: Person.optional(),
              description: z.string().max(5000).optional(),
            }),
          )
          .min(1)
          .max(20),
      }),
      execute: define(ctx, "create_task", "write", async (a, toolCallId) => {
        const many = a.tasks.length > 1;
        const resolved: { project: Project; assigneeId: string | null; labelId: string | null; t: (typeof a.tasks)[number] }[] = [];
        for (const [i, t] of a.tasks.entries()) {
          const at = (msg: string) => (many ? `Task ${i + 1}: ${msg}` : msg);
          const p = await findProject(ctx, defaultProject(t.project));
          if ("fail" in p) return { ...p.fail, error: p.fail.blocked ? p.fail.error : at(p.fail.error) };
          if (t.due_date && !isValidDate(t.due_date)) return failure(at(`"${t.due_date}" is not a valid date; use YYYY-MM-DD`));
          let assigneeId: string | null = null;
          if (t.assignee) {
            const m = resolveMember(t.assignee, ctx.members, ctx.me.id);
            if (!m.ok) return failure(at(m.error), m.candidates);
            assigneeId = m.item.id;
          }
          let labelId: string | null = null;
          if (t.label) {
            const l = resolveLabel(t.label, ctx.labels);
            if (!l.ok) return failure(at(l.error), l.candidates);
            labelId = l.item.id;
          }
          resolved.push({ project: p.project, assigneeId, labelId, t });
        }
        const members = await membershipOf(ctx, [...new Set(resolved.map((r) => r.project.id))], [...new Set(resolved.flatMap((r) => (r.assigneeId ? [r.assigneeId] : [])))]);
        for (const [i, r] of resolved.entries()) {
          if (r.assigneeId && !members.has(`${r.project.id}:${r.assigneeId}`)) {
            const msg = `${memberName(ctx, r.assigneeId)} is not a member of ${r.project.name}, so they cannot be assigned there`;
            return failure(many ? `Task ${i + 1}: ${msg}` : msg);
          }
        }
        const n = resolved.length;
        const payload = {
          tasks: resolved.map((r) => ({
            project_id: r.project.id,
            title: r.t.title,
            ...(r.t.description ? { description: r.t.description } : {}),
            ...(r.t.status ? { status: r.t.status } : {}),
            ...(r.t.priority !== undefined ? { priority: r.t.priority } : {}),
            ...(r.labelId ? { label_id: r.labelId } : {}),
            ...(r.t.due_date ? { due_date: r.t.due_date } : {}),
            ...(r.assigneeId ? { assignee_id: r.assigneeId } : {}),
          })),
        };
        const proposal: Proposal = {
          heading: `Approve ${plural(n, "new task")}`,
          approveLabel: `Create ${plural(n, "task")}`,
          items: resolved.map((r) => ({
            title: r.t.title,
            titleEditable: true,
            projectName: r.project.name,
            projectColor: r.project.color,
            status: r.t.status ?? "todo",
            dueDate: r.t.due_date ?? null,
            assigneeName: memberName(ctx, r.assigneeId),
          })),
        };
        return propose(ctx, "create_task", toolCallId, payload, proposal);
      }),
    }),

    update_task_status: tool({
      description: "Propose moving one or more tasks (by key) to a status. Nothing changes until the person approves the card.",
      inputSchema: z.strictObject({ tasks: Keys, status: StatusEnum }),
      execute: define(ctx, "update_task_status", "write", async (a, toolCallId) => {
        const found = await findTasks(ctx, a.tasks);
        if ("fail" in found) return found.fail;
        const todo = found.tasks.filter((t) => t.status !== a.status);
        if (!todo.length) return failure(`${found.tasks.map((t) => t.key).join(", ")} already ${found.tasks.length === 1 ? "is" : "are"} ${a.status}; nothing to change`);
        const proposal: Proposal = {
          heading: `Approve ${plural(todo.length, "status change")}`,
          approveLabel: `Update ${plural(todo.length, "task")}`,
          items: todo.map((t) => previewOf(ctx, t, { status: a.status })),
        };
        return propose(ctx, "update_task_status", toolCallId, { status: a.status, tasks: todo.map((t) => ({ id: t.id })) }, proposal);
      }),
    }),

    assign_task: tool({
      description: "Propose assigning one or more tasks (by key) to a person, or to nobody with assignee null. Nothing changes until the person approves the card.",
      inputSchema: z.strictObject({ tasks: Keys, assignee: Person.nullable() }),
      execute: define(ctx, "assign_task", "write", async (a, toolCallId) => {
        const found = await findTasks(ctx, a.tasks);
        if ("fail" in found) return found.fail;
        let assigneeId: string | null = null;
        if (a.assignee !== null && norm(a.assignee) !== "unassigned" && norm(a.assignee) !== "nobody") {
          const m = resolveMember(a.assignee, ctx.members, ctx.me.id);
          if (!m.ok) return fail(m);
          assigneeId = m.item.id;
          const projectIds = [...new Set(found.tasks.map((t) => t.projectId))];
          const members = await membershipOf(ctx, projectIds, [m.item.id]);
          const outside = projectIds.filter((id) => !members.has(`${id}:${m.item.id}`));
          if (outside.length) return failure(`${m.item.name} is not a member of ${outside.map((id) => projectOf(ctx, id).name).join(", ")}, so they cannot be assigned there`);
        }
        const todo = found.tasks.filter((t) => t.assigneeId !== assigneeId);
        if (!todo.length) return failure(`${found.tasks.map((t) => t.key).join(", ")} already ${assigneeId ? `assigned to ${memberName(ctx, assigneeId)}` : "unassigned"}; nothing to change`);
        const proposal: Proposal = {
          heading: `Approve ${plural(todo.length, "assignment")}`,
          approveLabel: `Assign ${plural(todo.length, "task")}`,
          items: todo.map((t) => previewOf(ctx, t, { assigneeName: memberName(ctx, assigneeId) })),
        };
        return propose(ctx, "assign_task", toolCallId, { assignee_id: assigneeId, tasks: todo.map((t) => ({ id: t.id })) }, proposal);
      }),
    }),
  };
}

export type BrieflyTools = ReturnType<typeof createTools>;
