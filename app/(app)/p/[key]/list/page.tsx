import { applyFilters, parseFilters } from "@/components/tasks/filters";
import { TaskGroups } from "@/components/tasks/list";
import { Toolbar } from "@/components/tasks/toolbar";
import { getContext } from "@/lib/context";
import { TASK_COLUMNS, toTask } from "@/lib/model";

export default async function ListPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ key }, sp] = await Promise.all([params, searchParams]);
  const { supabase, projects } = await getContext();
  const project = projects.find((p) => p.key === key.toUpperCase());
  if (!project) {
    return (
      <section className="view" aria-label="List">
        <p style={{ padding: 24, color: "var(--muted)" }}>You don&apos;t have access to this project.</p>
      </section>
    );
  }
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("project_id", project.id).order("position");
  const tasks = applyFilters((data ?? []).map(toTask), parseFilters(sp));
  return (
    <section className="view" aria-label="List">
      <Toolbar count={tasks.length} projectKey={project.key} />
      <TaskGroups tasks={tasks} />
    </section>
  );
}
