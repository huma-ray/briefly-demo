"use client";

import { useApp } from "@/components/app-state";
import { I } from "@/components/icons";
import { formatTime } from "@/lib/dates";
import { PRIORITY_NAME, STATUS_NAME, type Status } from "@/lib/model";

export type TickerEntry = { id: string; key: string; kind: string; field: string | null; newValue: string | null; actorId: string | null; at: string };

function what(e: TickerEntry): string {
  const v = e.newValue;
  if (e.kind === "created") return `created ${e.key}`;
  switch (e.field) {
    case "status": return `moved ${e.key} to ${STATUS_NAME[v as Status] ?? v}`;
    case "assignee": return v ? `assigned ${e.key} to ${v}` : `unassigned ${e.key}`;
    case "priority": return `set ${e.key} to ${PRIORITY_NAME[Number(v)] ?? v}`;
    default: return `updated ${e.key}`;
  }
}

/** One line above the board: the latest changes the assistant made here, and who approved them. */
export function AssistantTicker({ entries }: { entries: TickerEntry[] }) {
  const { memberById, openTask } = useApp();
  if (!entries.length) return null;
  return (
    <div className="ticker" aria-label="Latest assistant changes">
      <span className="lbl">
        <I name="spark" />
        Assistant
      </span>
      {entries.map((e) => (
        <button type="button" key={e.id} className="tk" onClick={() => openTask(e.key)}>
          {what(e)}{" "}
          <span className="by">
            · approved by {memberById(e.actorId)?.name ?? "someone"} · {formatTime(e.at)}
          </span>
        </button>
      ))}
    </div>
  );
}
