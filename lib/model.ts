export type Status = "todo" | "doing" | "done";
export type Role = "admin" | "member";
export type Source = "ui" | "assistant";

export const STATUSES: Status[] = ["todo", "doing", "done"];
export const STATUS_NAME: Record<Status, string> = { todo: "Todo", doing: "In progress", done: "Done" };
export const PRIORITY_NAME = ["No priority", "Low", "Medium", "High", "Urgent"] as const;

export type Member = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  avatar: number;
  role: Role;
};

export type Project = {
  id: string;
  key: string;
  name: string;
  color: number;
  position: number;
  /** The viewer sees it only because they are an Admin. */
  adminOnly: boolean;
};

export type Label = { id: string; name: string; color: number };

export type Task = {
  id: string;
  key: string;
  projectId: string;
  projectKey: string;
  number: number;
  title: string;
  description: string;
  status: Status;
  priority: number;
  labelId: string | null;
  dueDate: string | null;
  assigneeId: string | null;
  position: number;
  lastSource: Source;
};

/** Columns every task query selects; `toTask` maps a row to `Task`. */
export const TASK_COLUMNS =
  "id, project_id, number, title, description, status, priority, label_id, due_date, assignee_id, position, last_source, projects!inner(key)";

type TaskRow = {
  id: string;
  project_id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  priority: number;
  label_id: string | null;
  due_date: string | null;
  assignee_id: string | null;
  position: number;
  last_source: string;
  projects: { key: string };
};

export function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    key: `${r.projects.key}-${r.number}`,
    projectId: r.project_id,
    projectKey: r.projects.key,
    number: r.number,
    title: r.title,
    description: r.description,
    status: r.status as Status,
    priority: r.priority,
    labelId: r.label_id,
    dueDate: r.due_date,
    assigneeId: r.assignee_id,
    position: r.position,
    lastSource: r.last_source as Source,
  };
}

/** Parses "WEB-18" into its parts, or null. */
export function parseKey(key: string): { project: string; number: number } | null {
  const m = /^([A-Za-z]{2,5})-(\d+)$/.exec(key.trim());
  return m ? { project: m[1].toUpperCase(), number: Number(m[2]) } : null;
}
