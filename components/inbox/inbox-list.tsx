"use client";

import { useEffect } from "react";
import { markInboxSeen } from "@/app/actions/inbox";
import { useApp } from "@/components/app-state";
import { AgentTag, Avatar } from "@/components/bits";
import { formatDue, formatRelative } from "@/lib/dates";
import { PRIORITY_NAME, STATUS_NAME, type Status } from "@/lib/model";

export type Entry = {
  id: string;
  actorId: string | null;
  assistant: boolean;
  kind: string;
  field: string | null;
  newValue: string | null;
  at: string;
  key: string;
};

/** "moved WEB-22 to Done"; the task editor passes key "this task". */
export function sentence(e: Pick<Entry, "kind" | "field" | "newValue" | "key">): string {
  const v = e.newValue;
  if (e.kind === "created") return `created ${e.key}`;
  switch (e.field) {
    case "status": return `moved ${e.key} to ${STATUS_NAME[v as Status] ?? v}`;
    case "priority": return `set priority of ${e.key} to ${PRIORITY_NAME[Number(v)] ?? v}`;
    case "assignee": return v ? `assigned ${e.key} to ${v}` : `unassigned ${e.key}`;
    case "label": return v ? `labeled ${e.key} ${v}` : `removed the label of ${e.key}`;
    case "due_date": return v ? `changed the due date of ${e.key} to ${formatDue(v)}` : `cleared the due date of ${e.key}`;
    case "title": return `renamed ${e.key} to “${v}”`;
    case "description": return `updated the description of ${e.key}`;
    default: return `updated ${e.key}`;
  }
}

export function InboxList({ entries }: { entries: Entry[] }) {
  const { memberById, openTask } = useApp();
  useEffect(() => {
    void markInboxSeen();
  }, []);

  return (
    <div aria-label="Activity">
      <div className="list">
        {entries.length === 0 && <p className="caption">No activity yet.</p>}
        {entries.map((e) => {
          const who = memberById(e.actorId);
          return (
            <div
              key={e.id}
              className="row"
              role="button"
              tabIndex={0}
              style={{ gridTemplateColumns: "28px minmax(0,1fr) auto", cursor: "pointer" }}
              onClick={() => openTask(e.key)}
              onKeyDown={(ev) => ev.key === "Enter" && openTask(e.key)}
            >
              <Avatar member={who} />
              <span className="t">
                <span>
                  <b>{who?.name ?? "Someone"}</b> {sentence(e)}
                </span>
                {e.assistant && <AgentTag />}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--faint)" }}>{formatRelative(e.at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
