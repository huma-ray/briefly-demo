"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setThreadStatus } from "@/app/actions/slack";
import { useApp } from "@/components/app-state";
import { I } from "@/components/icons";
import { formatRelative, formatTime } from "@/lib/dates";

export type SlackMessage = { id: string; authorName: string; initials: string; avatar: number; lang: "en" | "ko"; body: string; at: string; memberId: string | null };
export type SlackThread = { id: string; channel: string; mentionsMe: boolean; status: "waiting" | "done" | "none"; messages: SlackMessage[] };

const excerpt = (t: SlackThread) => (t.messages[0]?.body ?? "").replace(/^@\S+ \S+ /, "").slice(0, 60);

/** Simulated Slack threads: sample data cloned into the sandbox; nothing is sent to or read from Slack. */
export function SlackInbox({ threads }: { threads: SlackThread[] }) {
  const router = useRouter();
  const { askAboutThread } = useApp();
  const [open, setOpen] = useState<string | null>(threads.find((t) => t.status === "waiting")?.id ?? null);
  const [pending, start] = useTransition();

  const toggleDone = (t: SlackThread) =>
    start(async () => {
      await setThreadStatus(t.id, t.status === "waiting" ? "done" : "waiting");
      router.refresh();
    });

  return (
    <div className="slack">
      <p className="slack-note">
        <I name="lock" />
        Sample messages for the demo. Nothing is read from or sent to a real Slack workspace.
      </p>
      {threads.map((t) => {
        const last = t.messages.at(-1);
        const expanded = open === t.id;
        return (
          <article key={t.id} className={`sth${expanded ? " open" : ""}`} data-status={t.status}>
            <button type="button" className="sth-h" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : t.id)}>
              <span className="ch">{t.channel}</span>
              <span className="who">{last?.authorName}</span>
              <span className="ex">{last?.body}</span>
              {t.mentionsMe && <span className="tag">Mentions you</span>}
              {t.status === "waiting" && <span className="state wait">Needs reply</span>}
              {t.status === "done" && <span className="state done">Done</span>}
              <time>{last && formatRelative(last.at)}</time>
            </button>
            {expanded && (
              <div className="sth-b">
                <ol>
                  {t.messages.map((m) => (
                    <li key={m.id}>
                      <span className={`av av-${m.avatar}`}>{m.initials}</span>
                      <div>
                        <div className="meta">
                          <b>{m.authorName}</b>
                          <time>{formatTime(m.at)}</time>
                          {m.lang === "ko" && <span className="lang">KO</span>}
                        </div>
                        <p lang={m.lang}>{m.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="sth-f">
                  <button
                    type="button"
                    className="btn ask-btn"
                    onClick={() =>
                      askAboutThread({ id: t.id, channel: t.channel, excerpt: excerpt(t), korean: t.messages.some((m) => m.lang === "ko"), waiting: t.status === "waiting" })
                    }
                  >
                    <I name="spark" />
                    Ask assistant
                  </button>
                  {t.mentionsMe && (
                    <button type="button" className="btn" disabled={pending} onClick={() => toggleDone(t)}>
                      {t.status === "waiting" ? "Mark done" : "Mark as needing reply"}
                    </button>
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
