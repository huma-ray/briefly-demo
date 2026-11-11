import { Board } from "@/components/tasks/board";
import { applyFilters, parseFilters } from "@/components/tasks/filters";
import { Toolbar } from "@/components/tasks/toolbar";
import { AssistantTicker, type TickerEntry } from "@/components/tasks/assistant-ticker";
import { getContext } from "@/lib/context";
import { TASK_COLUMNS, toTask } from "@/lib/model";

export default async function BoardPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ key }, sp] = await Promise.all([params, searchParams]);
  const { supabase, projects } = await getContext();
  const project = projects.find((p) => p.key === key.toUpperCase());
  if (!project) {
    return (
      <section className="view" aria-label="Board">
        <p style={{ padding: 24, color: "var(--muted)" }}>You don&apos;t have access to this project.</p>
      </section>
    );
  }
  const [{ data }, { data: recent }] = await Promise.all([
    supabase.from("tasks").select(TASK_COLUMNS).eq("project_id", project.id).order("position"),
    // Latest assistant changes in this project; actor = the person who approved them.
    supabase
      .from("activity")
      .select("id, kind, field, new_value, actor_id, created_at, tasks(number)")
      .eq("project_id", project.id)
      .eq("source", "assistant")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  const ticker: TickerEntry[] = (recent ?? []).map((a) => {
    const t = Array.isArray(a.tasks) ? a.tasks[0] : a.tasks;
    return { id: a.id, key: `${project.key}-${t?.number}`, kind: a.kind, field: a.field, newValue: a.new_value, actorId: a.actor_id, at: a.created_at };
  });
  const tasks = applyFilters((data ?? []).map(toTask), parseFilters(sp));
  return (
    <section className="view" aria-label="Board">
      <Toolbar count={tasks.length} projectKey={project.key} />
      <AssistantTicker entries={ticker} />
      <Board tasks={tasks} projectKey={project.key} />
    </section>
  );
}
