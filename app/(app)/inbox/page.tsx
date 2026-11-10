import { getContext } from "@/lib/context";
import { InboxList, type Entry } from "@/components/inbox/inbox-list";

export default async function InboxPage() {
  const { supabase } = await getContext();
  const { data } = await supabase
    .from("activity")
    .select("id, actor_id, source, kind, field, old_value, new_value, created_at, tasks(number, title, projects(key))")
    .order("created_at", { ascending: false })
    .limit(100);

  const entries: Entry[] = (data ?? []).flatMap((a) => {
    const t = Array.isArray(a.tasks) ? a.tasks[0] : a.tasks;
    const p = t && (Array.isArray(t.projects) ? t.projects[0] : t.projects);
    if (!t || !p) return [];
    return [{
      id: a.id, actorId: a.actor_id, assistant: a.source === "assistant", kind: a.kind, field: a.field,
      newValue: a.new_value, at: a.created_at, key: `${p.key}-${t.number}`,
    }];
  });

  return <InboxList entries={entries} />;
}
