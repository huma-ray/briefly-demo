// Small marks shared by board, list, inbox, chat and log. Markup and inline
// styles follow the renderers in docs/Briefly Workspace.html exactly.
import { I } from "@/components/icons";
import { formatDue, isOverdue } from "@/lib/dates";
import { PRIORITY_NAME, STATUS_NAME, type Label, type Member, type Status } from "@/lib/model";

export function StatusIcon({ status }: { status: Status }) {
  if (status === "todo")
    return (
      <svg className="st" viewBox="0 0 14 14" aria-label={STATUS_NAME.todo} role="img">
        <circle cx="7" cy="7" r="5.5" style={{ fill: "none", stroke: "var(--faint)", strokeWidth: 1.6 }} />
      </svg>
    );
  if (status === "doing")
    return (
      <svg className="st" viewBox="0 0 14 14" aria-label={STATUS_NAME.doing} role="img">
        <circle cx="7" cy="7" r="5.5" style={{ fill: "none", stroke: "var(--warn)", strokeWidth: 1.6 }} />
        <path d="M7 3.6a3.4 3.4 0 0 1 0 6.8z" style={{ fill: "var(--warn)" }} />
      </svg>
    );
  return (
    <svg className="st" viewBox="0 0 14 14" aria-label={STATUS_NAME.done} role="img">
      <circle cx="7" cy="7" r="6.2" style={{ fill: "var(--ok)" }} />
      <path
        d="m4.5 7.1 1.7 1.7 3.4-3.5"
        style={{ fill: "none", stroke: "var(--surface)", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" }}
      />
    </svg>
  );
}

const BARS = [
  [2, 9, 3, 4],
  [6, 6, 3, 7],
  [10, 3, 3, 10],
];

export function Prio({ p }: { p: number }) {
  if (p === 4)
    return (
      <span className="prio urgent" title="Urgent">
        <svg viewBox="0 0 14 14">
          <rect x="1" y="1" width="12" height="12" rx="3" style={{ fill: "var(--danger)" }} />
          <path d="M7 4v3.6M7 9.8v.1" style={{ stroke: "var(--surface)", strokeWidth: 1.7, strokeLinecap: "round" }} />
        </svg>
      </span>
    );
  return (
    <span className="prio" title={PRIORITY_NAME[p]}>
      <svg viewBox="0 0 14 14">
        {BARS.map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="1" style={{ fill: i < p ? "var(--muted)" : "var(--line-strong)" }} />
        ))}
      </svg>
    </span>
  );
}

export function Avatar({ member, large }: { member: Pick<Member, "name" | "initials" | "avatar"> | null | undefined; large?: boolean }) {
  if (!member) return <span className="av av-none" title="Unassigned" />;
  return (
    <span className={`av av-${member.avatar}${large ? " av-lg" : ""}`} title={member.name}>
      {member.initials}
    </span>
  );
}

export function DuePill({ due, status }: { due: string | null; status: Status }) {
  if (!due) return null;
  const over = isOverdue(due, status);
  return (
    <span className={over ? "pill over" : "pill"} title={over ? "Overdue" : undefined}>
      <I name="cal" />
      {formatDue(due)}
    </span>
  );
}

export function LabelPill({ label }: { label: Label | null | undefined }) {
  if (!label) return null;
  return (
    <span className="pill">
      <span className="dot" style={{ background: `var(--av${label.color}-fg)` }} />
      {label.name}
    </span>
  );
}

export function ProjectPill({ name, color }: { name: string; color: number }) {
  return (
    <span className="pill">
      <span className="dot" style={{ background: `var(--av${color}-fg)` }} />
      {name}
    </span>
  );
}

export function AgentTag() {
  return (
    <span className="agent-tag">
      <I name="spark" />
      via assistant
    </span>
  );
}
