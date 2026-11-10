import { applyFilters, parseFilters } from "@/components/tasks/filters";
import { TaskGroups } from "@/components/tasks/list";
import { Toolbar } from "@/components/tasks/toolbar";
import { getContext } from "@/lib/context";
import { TASK_COLUMNS, toTask } from "@/lib/model";

export default async function MyTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { supabase, me } = await getContext();
  const { data } = await supabase.from("tasks").select(TASK_COLUMNS).eq("assignee_id", me.id).order("position");
  const tasks = applyFilters((data ?? []).map(toTask), parseFilters(sp));
  return (
    <section className="view" aria-label="My tasks">
      <Toolbar count={tasks.length} />
      <TaskGroups tasks={tasks} />
    </section>
  );
}
