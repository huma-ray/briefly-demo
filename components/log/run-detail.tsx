import { formatTime } from "@/lib/dates";
import type { Member } from "@/lib/model";
import { RESULT_LABEL, toolSummary, type Run } from "./types";

type Step = [kind: string, title: string, sub: string];

const sec = (ms: number) => `${(ms / 1000).toFixed(2)} s`;
const wait = (ms: number | null) => (ms == null ? "—" : ms < 1000 ? `${ms} ms` : `${Math.round(ms / 1000)} s`);

function blockedKey(r: Run): string {
  const c = r.calls.find((x) => x.status === "blocked");
  const key = (c?.result as { project?: string } | null)?.project;
  return key ?? "that project";
}

function steps(r: Run, who: string, approver: string): Step[] {
  const role = r.role === "admin" ? "Admin" : "Member";
  const rows = r.calls.reduce((n, c) => n + (c.rows ?? 0), 0);
  const writeMs = r.calls.filter((c) => c.kind === "write").reduce((n, c) => n + (c.duration_ms ?? 0), 0);
  const s: Step[] = [
    ["done", "Request received", `${formatTime(r.createdAt)} · ${who} (${role})`],
    ["done", `Planned with ${r.model}`, `${r.tokensIn} tokens in · ${r.tokensOut} out`],
    ["done", "Tool call prepared", toolSummary(r.calls) || "no tool"],
  ];
  const reply: Step = ["done", "Reply streamed", `${sec(r.latencyMs)} total`];
  switch (r.result) {
    case "await":
      s.push(["wait", "Waiting for approval", `card shown to ${who}`], ["off", "Write to database", "not started"]);
      break;
    case "approved":
      s.push(
        ["ok", `Approved by ${approver}`, `after ${wait(r.approvalWaitMs)}`],
        ["ok", "Written to database", `${rows} rows · ${writeMs} ms`],
        reply,
      );
      break;
    case "read":
      s.push(["done", "Read run, no approval needed", `${rows} rows · scoped to ${role} access`], reply);
      break;
    case "blocked": {
      const k = blockedKey(r);
      s.push(
        ["warn", "Permission filter applied", `${role} has no access to ${k} · 0 rows`],
        ["done", "Reply explained the limit", `no data from ${k} was sent to the model`],
      );
      break;
    }
    case "error":
      s.push(
        ["err", "Tool returned an error", r.calls.find((c) => c.error)?.error ?? r.error ?? "unknown error"],
        ["done", "Nothing written", "the person was asked how to continue"],
      );
      break;
    case "cancelled":
      s.push(["off", `Cancelled by ${approver}`, "nothing written"]);
      break;
  }
  return s;
}

export function RunDetail({ run, members }: { run: Run; members: Member[] }) {
  const name = (id: string | null) => members.find((m) => m.id === id)?.name ?? "Someone";
  const who = name(run.memberId);
  const args = JSON.stringify(run.calls.map((c) => c.args), null, 2);
  return (
    <aside className="detail" aria-label="Run detail">
      <div className="d-top">
        <span className="mono">{run.shortId}</span>
        <span className={`rp rp-${run.result}`}>{RESULT_LABEL[run.result]}</span>
      </div>
      <div className="d-prompt">{run.prompt}</div>
      <dl className="d-meta">
        <dt>Person</dt><dd>{who} · {run.role === "admin" ? "Admin" : "Member"}</dd>
        <dt>Model</dt><dd className="mono">{run.model}</dd>
        <dt>Tokens</dt><dd>{run.tokensIn} in · {run.tokensOut} out</dd>
        <dt>Cost</dt><dd>${run.cost.toFixed(4)}</dd>
        <dt>Latency</dt><dd>{sec(run.latencyMs)}</dd>
      </dl>
      <div>
        <div className="d-label">Trace</div>
        <ol className="steps">
          {steps(run, who, name(run.approverId ?? run.memberId)).map(([k, t, sub]) => (
            <li className="step" key={t}>
              <span className={`sd ${k}`} />
              <div><div className="t">{t}</div><div className="s">{sub}</div></div>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <div className="d-label">Arguments</div>
        <div className="d-code"><pre className="code">{args}</pre></div>
      </div>
    </aside>
  );
}
