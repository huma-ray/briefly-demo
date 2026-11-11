import { getContext } from "@/lib/context";
import { greeting } from "@/lib/dates";
import { workItems } from "@/lib/work-items";
import { Today } from "@/components/today/today";

/** The landing page: what waits for the person, from every source, counted from the database (no model call). */
export default async function TodayPage() {
  const ctx = await getContext();
  const [items, unread] = await Promise.all([
    workItems(ctx),
    ctx.supabase.from("activity").select("id", { count: "exact", head: true }).gt("created_at", ctx.me.inboxSeenAt).neq("actor_id", ctx.me.id),
  ]);
  return <Today greeting={greeting()} firstName={ctx.me.name.split(" ")[0]} items={items} unread={unread.count ?? 0} />;
}
