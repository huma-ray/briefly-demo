"use client";

import { Fragment } from "react";
import { useApp } from "@/components/app-state";
import { StatusIcon } from "@/components/bits";
import { useMarks } from "@/components/tasks/marks";
import { AskButton } from "@/components/tasks/ask-button";
import { STATUSES, STATUS_NAME, type Task } from "@/lib/model";

function Row({ t }: { t: Task }) {
  const { openTask } = useApp();
  const m = useMarks(t);
  return (
    <div
      className="row"
      role="button"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => openTask(t.key)}
      onKeyDown={(e) => e.key === "Enter" && openTask(t.key)}
    >
      <StatusIcon status={t.status} />
      <span className="id">{t.key}</span>
      <span className="t">
        {t.title}
        {m.agent}
        <AskButton taskKey={t.key} />
      </span>
      <span className="lbl">{m.label}</span>
      {m.due}
      {m.avatar}
    </div>
  );
}

/** Tasks grouped under Todo / In progress / Done headers (list view and My tasks). */
export function TaskGroups({ tasks }: { tasks: Task[] }) {
  return (
    <div className="list">
      {STATUSES.map((s) => {
        const items = tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position);
        return (
          <Fragment key={s}>
            <div className="grp-h">
              <StatusIcon status={s} />
              {STATUS_NAME[s]}
              <span className="n">{items.length}</span>
            </div>
            {items.map((t) => (
              <Row key={t.id} t={t} />
            ))}
          </Fragment>
        );
      })}
    </div>
  );
}
