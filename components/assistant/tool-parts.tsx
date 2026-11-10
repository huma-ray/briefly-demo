"use client";

import { useState } from "react";
import Link from "next/link";
import { I } from "@/components/icons";
import { Avatar, DuePill, ProjectPill, StatusIcon } from "@/components/bits";
import { useApp } from "@/components/app-state";
import { formatDue, formatTime } from "@/lib/dates";
import { STATUS_NAME } from "@/lib/model";
import { decideAction } from "@/app/actions/agent";
import type { Decision, DecideResult, BrieflyMessage, ReadOutput, WriteOutput } from "@/lib/agent/contract";

/** A tool-<name> part as the AI SDK delivers it (tools are untyped on the client). */
export type ToolPart = {
  type: string;
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available" | "output-error";
  input?: unknown;
  output?: unknown;
  errorText?: string;
};
export const isTool = (p: { type: string }): p is ToolPart => p.type.startsWith("tool-");

type Pending = Extract<WriteOutput, { status: "pending_approval" }>;
const isPending = (o: unknown): o is Pending => !!o && (o as Pending).status === "pending_approval";
const isReadOk = (o: unknown): o is Extract<ReadOutput, { ok: true }> => !!o && (o as { ok?: boolean }).ok === true && Array.isArray((o as { tasks?: unknown }).tasks);

function chip(part: ToolPart): { icon: "ok" | "wait" | "none"; iconName: "check" | "tool" | "x"; res: string } {
  const out = part.output as { ok?: boolean; error?: string; rows?: number; durationMs?: number } | undefined;
  if (part.state === "output-error") return { icon: "none", iconName: "x", res: part.errorText ?? "failed" };
  if (part.state !== "output-available") return { icon: "wait", iconName: "tool", res: "running…" };
  if (out?.ok === false) return { icon: "none", iconName: "x", res: out.error ?? "failed" };
  if (isPending(out)) {
    const d = out.decision;
    if (!d) return { icon: "wait", iconName: "tool", res: "waiting for approval" };
    if (d.status === "approved") return { icon: "ok", iconName: "check", res: `${d.rows ?? d.tasks?.length ?? 0} rows written · ${d.durationMs ?? 0} ms` };
    if (d.status === "cancelled") return { icon: "none", iconName: "x", res: "cancelled" };
    return { icon: "none", iconName: "x", res: d.error ?? "failed" };
  }
  return { icon: "ok", iconName: "check", res: `${out?.rows ?? 0} rows · ${out?.durationMs ?? 0} ms` };
}

export function ToolChip({ part }: { part: ToolPart }) {
  const name = part.type.slice(5);
  const c = chip(part);
  const n = isPending(part.output) ? part.output.proposal.items.length : Array.isArray(part.input) ? part.input.length : 1;
  return (
    <details className="tool">
      <summary>
        <I name="right" className="chev" />
        <I name={c.iconName} className={c.icon === "none" ? undefined : c.icon} />
        <code>{n > 1 ? `${name} × ${n}` : name}</code>
        <span className="res">{c.res}</span>
      </summary>
      <pre className="code">{JSON.stringify(part.input ?? {}, null, 2)}</pre>
    </details>
  );
}

/** Mini rows and scope note under a successful read. */
export function ReadResult({ output }: { output: unknown }) {
  const { memberById, openTask } = useApp();
  if (!isReadOk(output)) return null;
  return (
    <>
      {output.tasks.length > 0 && (
        <div className="mini">
          {output.tasks.map((t) => (
            <div key={t.id} className="mini-row" role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => openTask(t.key)} onKeyDown={(e) => e.key === "Enter" && openTask(t.key)}>
              <StatusIcon status={t.status} />
              <span className="id">{t.key}</span>
              <span className="t">{t.title}</span>
              <DuePill due={t.dueDate} status={t.status} />
              <Avatar member={memberById(t.assigneeId)} />
            </div>
          ))}
        </div>
      )}
      {output.scope.searched < output.scope.total && (
        <div className="scope">
          <I name="shield" />
          <span>
            Filtered to your access: {output.scope.searched} of {output.scope.total} projects searched.
          </span>
        </div>
      )}
    </>
  );
}

const VERB: Record<string, string> = { Create: "created", Update: "updated", Assign: "assigned" };

export function ApprovalCard({ tool, output, onDecided }: { tool: string; output: unknown; onDecided: (actionId: string, decision: Decision, confirmation?: BrieflyMessage) => void }) {
  const { markFresh } = useApp();
  const o = output as Pending;
  const { proposal, actionId } = o;
  const [editing, setEditing] = useState(false);
  const [titles, setTitles] = useState(() => proposal.items.map((i) => i.title));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decision = o.decision && o.decision.status !== "failed" ? o.decision : undefined;
  const state = decision?.status ?? "pending";
  const canEdit = proposal.items.some((i) => i.titleEditable);
  const emptyTitle = proposal.items.some((it, i) => it.titleEditable && !titles[i].trim());

  async function decide(kind: "approve" | "cancel") {
    if (busy) return;
    if (kind === "approve" && emptyTitle) return setError("Every task needs a title.");
    setBusy(true);
    setError(null);
    let res: DecideResult;
    try {
      res = await decideAction({
        actionId,
        decision: kind,
        titles: kind === "approve" && canEdit ? titles.map((t) => t.trim()) : undefined,
      });
    } catch {
      res = { ok: false, error: "Could not reach the server. Nothing was written." };
    }
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      onDecided(actionId, res.decision, res.confirmation);
      if (res.decision.status === "approved") markFresh((res.decision.tasks ?? []).map((t) => t.id));
    } else {
      setError(res.error);
      if (res.decision && res.decision.status !== "failed") onDecided(actionId, res.decision);
    }
  }

  const n = decision?.tasks?.length ?? proposal.items.length;
  const verb = VERB[proposal.approveLabel.split(" ")[0]] ?? "updated";
  const heading = state === "approved" ? `${n} ${n === 1 ? "task" : "tasks"} ${verb}` : state === "cancelled" ? "Cancelled" : proposal.heading;

  return (
    <div className="approve" data-state={state}>
      <div className="approve-h">
        <I name={state === "approved" ? "check" : state === "cancelled" ? "x" : "lock"} />
        <span>{heading}</span>
        <code>{tool}</code>
      </div>
      {proposal.items.map((it, i) => (
        <div className="ap-row" key={i}>
          <I name="plus" className="plus" />
          <div>
            <input
              value={titles[i]}
              readOnly={!(editing && it.titleEditable) || state !== "pending"}
              onChange={(e) => setTitles((t) => t.map((v, j) => (j === i ? e.target.value : v)))}
              aria-label={`Task ${i + 1} title`}
            />
            <div className="ap-meta">
              <ProjectPill name={it.projectName} color={it.projectColor} />
              <span className="pill">{STATUS_NAME[it.status]}</span>
              {it.dueDate && (
                <span className="pill">
                  <I name="cal" />
                  {formatDue(it.dueDate)}
                </span>
              )}
              <span className="pill">{it.assigneeName ?? "Unassigned"}</span>
            </div>
          </div>
        </div>
      ))}
      <div className="approve-f">
        {state === "pending" ? (
          <>
            <div className="note">
              <I name="lock" />
              {error ?? "Nothing is written until you approve."}
            </div>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => decide("approve")}>
              <I name="check" />
              {proposal.approveLabel}
            </button>
            {canEdit && (
              <button className="btn" type="button" disabled={busy} onClick={() => setEditing((v) => !v)}>
                <I name={editing ? "check" : "edit"} />
                {editing ? "Done editing" : "Edit"}
              </button>
            )}
            <button className="btn" type="button" disabled={busy} onClick={() => decide("cancel")}>
              Cancel
            </button>
          </>
        ) : state === "approved" ? (
          <div className="done-line">
            <I name="check" />
            Approved by {decision!.byName} at {formatTime(decision!.at)}
            <Link href="/log">View in Agent log</Link>
          </div>
        ) : (
          <div className="done-line">
            <I name="x" />
            Cancelled by {decision!.byName} · nothing was written
          </div>
        )}
      </div>
    </div>
  );
}

export { isPending };
