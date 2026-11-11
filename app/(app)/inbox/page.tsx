import Link from "next/link";
import { getContext } from "@/lib/context";
import { InboxList, type Entry } from "@/components/inbox/inbox-list";
import { SlackInbox, type SlackThread } from "@/components/inbox/slack-inbox";

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tab = (await searchParams).tab === "slack" ? "slack" : "activity";
  const { supabase } = await getContext();
  const [{ data }, { data: threads }, { data: messages }] = await Promise.all([
    supabase
      .from("activity")
      .select("id, actor_id, source, kind, field, old_value, new_value, created_at, tasks(number, title, projects(key))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("slack_threads").select("id, channel, mentions_me, status, created_at"),
    supabase.from("slack_messages").select("id, thread_id, author_member_id, author_name, author_initials, avatar, lang, body, created_at").order("created_at"),
  ]);

  const entries: Entry[] = (data ?? []).flatMap((a) => {
    const t = Array.isArray(a.tasks) ? a.tasks[0] : a.tasks;
    const p = t && (Array.isArray(t.projects) ? t.projects[0] : t.projects);
    if (!t || !p) return [];
    return [{
      id: a.id, actorId: a.actor_id, assistant: a.source === "assistant", kind: a.kind, field: a.field,
      newValue: a.new_value, at: a.created_at, key: `${p.key}-${t.number}`,
    }];
  });

  const slack: SlackThread[] = (threads ?? [])
    .map((t) => ({
      id: t.id,
      channel: t.channel,
      mentionsMe: t.mentions_me,
      status: t.status as SlackThread["status"],
      messages: (messages ?? [])
        .filter((m) => m.thread_id === t.id)
        .map((m) => ({ id: m.id, authorName: m.author_name, initials: m.author_initials, avatar: m.avatar, lang: m.lang as "en" | "ko", body: m.body, at: m.created_at, memberId: m.author_member_id })),
    }))
    .sort((a, b) => (b.messages.at(-1)?.at ?? "").localeCompare(a.messages.at(-1)?.at ?? ""));
  const waiting = slack.filter((t) => t.status === "waiting").length;

  return (
    <section className="view" aria-label="Inbox">
      <nav className="inbox-tabs" aria-label="Inbox sources">
        <Link href="/inbox" aria-current={tab === "activity" ? "page" : undefined}>
          Activity
        </Link>
        <Link href="/inbox?tab=slack" aria-current={tab === "slack" ? "page" : undefined}>
          Slack <span className="sim">(simulated)</span>
          {waiting > 0 && <span className="count">{waiting}</span>}
        </Link>
      </nav>
      {tab === "activity" ? <InboxList entries={entries} /> : <SlackInbox threads={slack} />}
    </section>
  );
}
