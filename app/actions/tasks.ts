"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { parseKey, TASK_COLUMNS, toTask, type Status, type Task } from "@/lib/model";

export type FieldErrors = Record<string, string>;
type Fail = { ok: false; fieldErrors: FieldErrors };

const statusEnum = z.enum(["todo", "doing", "done"]);
const uuid = z.string().uuid();
const TaskInput = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be 200 characters or fewer"),
  description: z.string().max(5000, "Description must be 5000 characters or fewer"),
  status: statusEnum,
  priority: z.number().int().min(0).max(4),
  labelId: uuid.nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
    .nullable(),
  assigneeId: uuid.nullable(),
});
export type TaskInput = z.infer<typeof TaskInput>;

function invalid(error: z.ZodError): Fail {
  const fieldErrors: FieldErrors = {};
  for (const [k, v] of Object.entries(z.flattenError(error).fieldErrors)) fieldErrors[k] = (v as string[])[0];
  return { ok: false, fieldErrors };
}

function dbFail(error: { message: string; hint?: string | null }): Fail {
  if (error.hint === "assignee_not_member") return { ok: false, fieldErrors: { assigneeId: "That person is not a member of this project." } };
  return { ok: false, fieldErrors: { form: "Could not save the task. Check the values and try again." } };
}

const rowOf = (i: TaskInput) => ({
  title: i.title,
  description: i.description,
  status: i.status,
  priority: i.priority,
  label_id: i.labelId,
  due_date: i.dueDate,
  assignee_id: i.assigneeId,
});

/** Persists a drag: new status and position. */
export async function moveTask(id: string, status: Status, position: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const p = z.object({ id: uuid, status: statusEnum, position: z.number().finite() }).safeParse({ id, status, position });
  if (!p.success) return { ok: false, error: "Invalid move." };
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("tasks").update({ status, position }).eq("id", id).select("id");
  if (error || !data?.length) return { ok: false, error: "Could not move the task. It was put back." };
  revalidatePath("/", "layout");
  return { ok: true };
}

export type TaskActivity = { id: string; actorId: string | null; assistant: boolean; kind: string; field: string | null; newValue: string | null; at: string };

/** A task by key, the ids of its project's members (for the assignee select) and its activity, oldest first. */
export async function getTask(key: string): Promise<{ ok: true; task: Task; memberIds: string[]; activity: TaskActivity[] } | { ok: false }> {
  const k = parseKey(key);
  if (!k) return { ok: false };
  const { supabase } = await getContext();
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("number", k.number).eq("projects.key", k.project).maybeSingle();
  if (!data) return { ok: false };
  const task = toTask(data);
  const [{ data: pm }, { data: act }] = await Promise.all([
    supabase.from("project_members").select("member_id").eq("project_id", task.projectId),
    supabase.from("activity").select("id, actor_id, source, kind, field, new_value, created_at").eq("task_id", task.id).order("created_at").limit(100),
  ]);
  const activity = (act ?? []).map((a) => ({ id: a.id, actorId: a.actor_id, assistant: a.source === "assistant", kind: a.kind, field: a.field, newValue: a.new_value, at: a.created_at }));
  return { ok: true, task, memberIds: (pm ?? []).map((r) => r.member_id), activity };
}

export async function getProjectMembers(projectKey: string): Promise<{ ok: true; memberIds: string[] } | { ok: false }> {
  const { supabase, projects } = await getContext();
  const project = projects.find((p) => p.key === projectKey);
  if (!project) return { ok: false };
  const { data } = await supabase.from("project_members").select("member_id").eq("project_id", project.id);
  return { ok: true, memberIds: (data ?? []).map((r) => r.member_id) };
}

export async function createTask(projectKey: string, input: TaskInput): Promise<{ ok: true; key: string } | Fail> {
  const p = TaskInput.safeParse(input);
  if (!p.success) return invalid(p.error);
  const { supabase, projects } = await getContext();
  const project = projects.find((x) => x.key === projectKey);
  if (!project) return { ok: false, fieldErrors: { form: "You don't have access to this project." } };
  // number and position are filled by the tasks_before_write trigger.
  const { data, error } = await supabase
    .from("tasks")
    .insert({ project_id: project.id, ...rowOf(p.data) } as never)
    .select("number")
    .single();
  if (error || !data) return dbFail(error ?? { message: "no row" });
  revalidatePath("/", "layout");
  return { ok: true, key: `${project.key}-${(data as { number: number }).number}` };
}

export async function updateTask(id: string, input: TaskInput): Promise<{ ok: true; key: string } | Fail> {
  const p = TaskInput.safeParse(input);
  if (!p.success || !uuid.safeParse(id).success) return p.success ? { ok: false, fieldErrors: { form: "Invalid task." } } : invalid(p.error);
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("tasks").update(rowOf(p.data)).eq("id", id).select("number, projects!inner(key)").maybeSingle();
  if (error) return dbFail(error);
  if (!data) return { ok: false, fieldErrors: { form: "Task not found." } };
  revalidatePath("/", "layout");
  return { ok: true, key: `${data.projects.key}-${data.number}` };
}

export type SearchIndex = {
  tasks: { key: string; title: string; status: Status }[];
  projects: { key: string; name: string }[];
};

/** Everything the visitor can see, for the ⌘K palette to filter client-side. */
export async function searchIndex(): Promise<SearchIndex> {
  const { supabase, projects } = await getContext();
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).order("number", { ascending: false });
  return {
    tasks: (data ?? []).map(toTask).map((t) => ({ key: t.key, title: t.title, status: t.status })),
    projects: projects.map((p) => ({ key: p.key, name: p.name })),
  };
}
