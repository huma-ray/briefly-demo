"use client";

import Link from "next/link";
import { useApp } from "@/components/app-state";
import { I } from "@/components/icons";
import { DEMO_QUESTIONS } from "@/lib/agent/demo-questions";
import { formatDue } from "@/lib/dates";
import type { WorkItem, WorkStatus } from "@/lib/work-items";

const GROUPS: { status: WorkStatus; label: string; icon: "lock" | "cal" | "at" }[] = [
  { status: "awaiting_approval", label: "Waiting for your approval", icon: "lock" },
  { status: "overdue", label: "Overdue", icon: "cal" },
  { status: "due_today", label: "Due today", icon: "cal" },
  { status: "needs_reply", label: "Needs your reply", icon: "at" },
];

const SOURCE: Record<WorkItem["source"], string> = { briefly: "Briefly", slack: "Slack", jira: "Jira" };

/** Things the assistant can do from here; the prompts are the demo's fixed questions, so they also work scripted. */
const QUICK = ["What's overdue across all projects?", "What's due this week?", "What needs my reply in Slack?", "Summarize this project"]
  .map((p) => DEMO_QUESTIONS.find((q) => q.prompt === p))
  .filter((q) => !!q);

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summary(by: Record<WorkStatus, WorkItem[]>, unread: number): string {
  const parts = [
    by.awaiting_approval.length && plural(by.awaiting_approval.length, "change I prepared waits for your approval", "changes I prepared wait for your approval"),
    by.overdue.length && plural(by.overdue.length, "task is overdue", "tasks are overdue"),
    by.due_today.length && plural(by.due_today.length, "task is due today", "tasks are due today"),
    by.needs_reply.length && plural(by.needs_reply.length, "Slack mention needs a reply", "Slack mentions need a reply"),
  ].filter(Boolean) as string[];
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : (parts[0] ?? "");
  const updates = unread ? ` There ${unread === 1 ? "is 1 update" : `are ${unread} updates`} from teammates in your Inbox.` : "";
  return list ? `${list[0].toUpperCase()}${list.slice(1)}.${updates}` : `Nothing is waiting for you.${updates}`;
}

/** Today: the assistant's briefing, what waits for you (from every source), and what to hand to the assistant. */
export function Today({ greeting, firstName, items, unread }: { greeting: string; firstName: string; items: WorkItem[]; unread: number }) {
  const { askAbout, askAboutThread, askAssistant } = useApp();
  const by = Object.fromEntries(GROUPS.map((g) => [g.status, items.filter((i) => i.status === g.status)])) as Record<WorkStatus, WorkItem[]>;

  const act = (item: WorkItem) => {
    if (item.status === "awaiting_approval")
      return (
        <Link className="btn btn-primary" href={item.link}>
          Review
        </Link>
      );
    if (!item.ask) return null;
    const ask = item.ask;
    return (
      <button type="button" className="btn ask-btn" onClick={() => (ask.kind === "task" ? askAbout(ask.key) : askAboutThread(ask))}>
        <I name="spark" />
        {ask.kind === "thread" ? "Draft reply" : "Ask assistant"}
      </button>
    );
  };

  return (
    <section className="view" aria-label="Today">
      <div className="today">
        <div className="today-msg">
          <div className="who">
            <span className="mark">
              <I name="spark" />
            </span>
            Assistant · briefing
          </div>
          <h1>
            {greeting}, {firstName}. {items.length ? `${plural(items.length, "thing needs", "things need")} you today.` : "You're all caught up."}
          </h1>
          <p className="sub">{summary(by, unread)}</p>
        </div>

        {items.length > 0 && (
          <section className="today-wait" aria-label="Waiting for you">
            <h2>Waiting for you</h2>
            {GROUPS.filter((g) => by[g.status].length).map((g) => (
              <div className={`tw-group tw-${g.status}`} key={g.status}>
                <h3>
                  <I name={g.icon} />
                  {g.label}
                  <span className="n">{by[g.status].length}</span>
                </h3>
                <ul>
                  {by[g.status].map((item) => (
                    <li key={`${item.source}:${item.id}`}>
                      <span className={`src src-${item.source}`}>
                        {SOURCE[item.source]}
                        {item.simulated && " (sim)"}
                      </span>
                      <Link className="body" href={item.link}>
                        <b lang={item.ask?.kind === "thread" && item.ask.korean ? "ko" : undefined}>{item.title}</b>
                        {item.detail && <span>{item.detail}</span>}
                      </Link>
                      {item.due && <span className={`due${item.status === "overdue" ? " over" : ""}`}>{formatDue(item.due)}</span>}
                      {act(item)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <section className="today-quick" aria-label="Hand it to the assistant">
          <h2>Hand it to the assistant</h2>
          <div className="qa">
            {QUICK.map((q) => (
              <button type="button" key={q.id} className="qa-btn" onClick={() => askAssistant(q.prompt)}>
                <I name="spark" />
                {q.label}
              </button>
            ))}
          </div>
          <p className="today-foot">Everything above is counted from your projects just now; nothing on this page is written by a model. Changes always wait for your approval.</p>
        </section>
      </div>
    </section>
  );
}
