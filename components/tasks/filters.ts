import type { Task } from "@/lib/model";

export type Filters = { assignee?: string; priority?: number; label?: string };
type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

/** URL search params → filters (`assignee` and `label` take an id or "none"). */
export function parseFilters(sp: Params): Filters {
  const pr = one(sp.priority);
  return {
    assignee: one(sp.assignee),
    label: one(sp.label),
    priority: pr !== undefined && /^[0-4]$/.test(pr) ? Number(pr) : undefined,
  };
}

export function applyFilters(tasks: Task[], f: Filters): Task[] {
  return tasks.filter(
    (t) =>
      (f.assignee === undefined || (f.assignee === "none" ? t.assigneeId === null : t.assigneeId === f.assignee)) &&
      (f.priority === undefined || t.priority === f.priority) &&
      (f.label === undefined || (f.label === "none" ? t.labelId === null : t.labelId === f.label)),
  );
}
