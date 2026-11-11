"use server";

import { getContext } from "@/lib/context";
import { TASK_COLUMNS, toTask, type Status } from "@/lib/model";

export type ComposerData = {
  tasks: { key: string; title: string; status: Status; assigneeId: string | null }[];
  /** "Assign WEB-25 to Tomás", or null when the project has no unassigned open task / teammate. */
  assignSuggestion: string | null;
};

/** Tasks the visitor can see (RLS) for the @ list, plus a real assign suggestion for a project. */
export async function getComposerData(projectKey: string): Promise<ComposerData> {
  const { supabase, me, projects } = await getContext();
  const project = projects.find((p) => p.key === projectKey);
  const [tasksRes, teamRes] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).order("number", { ascending: false }).limit(100),
    project
      ? supabase.from("project_members").select("members!inner(id, name)").eq("project_id", project.id)
      : Promise.resolve({ data: [] as { members: { id: string; name: string } }[] }),
  ]);
  const tasks = (tasksRes.data ?? []).map((r) => toTask(r as never));
  const mate = (teamRes.data ?? []).map((r) => r.members as unknown as { id: string; name: string }).find((m) => m.id !== me.id);
  const open = tasks.find((t) => t.projectKey === projectKey && !t.assigneeId && t.status !== "done");
  return {
    tasks: tasks.map((t) => ({ key: t.key, title: t.title, status: t.status, assigneeId: t.assigneeId })),
    assignSuggestion: open && mate ? `Assign ${open.key} to ${mate.name.split(" ")[0]}` : null,
  };
}
