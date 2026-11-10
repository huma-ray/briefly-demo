import { RunDetail } from "@/components/log/run-detail";
import { RunTable } from "@/components/log/run-table";
import { Filters } from "@/components/log/filters";
import type { Call, Run } from "@/components/log/types";
import { getContext } from "@/lib/context";
import { addDays, todayKst } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/server";

const DAYS = { today: 0, "7d": 6, "30d": 29 } as const;
const NAME = { today: "today", "7d": "in 7 days", "30d": "in 30 days" } as const;
const SHOWN = 50;
const CAP = 10;

type Search = { range?: string; person?: string; tool?: string; run?: string };

export default async function LogPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const range = sp.range === "7d" || sp.range === "30d" ? sp.range : "today";
  const person = sp.person ?? "";
  const tool = sp.tool ?? "";
  const { supabase, members } = await getContext();

  const since = new Date(`${addDays(todayKst(), -DAYS[range])}T00:00:00+09:00`).toISOString();
  const month = `${todayKst().slice(0, 8)}01`;
  const [runsRes, usage] = await Promise.all([
    supabase
      .from("agent_runs")
      .select("id, member_id, role, prompt, model, tokens_in, tokens_out, cost_usd, latency_ms, result, error, approver_id, approval_wait_ms, created_at, agent_tool_calls(name, kind, args, result, error, status, rows, duration_ms)")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    createAdminClient().from("usage_daily").select("cost_usd").gte("day", month),
  ]);

  const all: Run[] = (runsRes.data ?? []).map((r) => ({
    id: r.id,
    shortId: `run_${r.id.replace(/-/g, "").slice(0, 4)}`,
    memberId: r.member_id,
    role: r.role,
    prompt: r.prompt,
    model: r.model,
    tokensIn: r.tokens_in,
    tokensOut: r.tokens_out,
    cost: Number(r.cost_usd),
    latencyMs: r.latency_ms ?? 0,
    result: r.result as Run["result"],
    error: r.error,
    approverId: r.approver_id,
    approvalWaitMs: r.approval_wait_ms,
    createdAt: r.created_at,
    calls: (r.agent_tool_calls ?? []) as Call[],
  }));

  const runs = all.filter((r) => (!person || r.memberId === person) && (!tool || r.calls.some((c) => c.name === tool)));
  const calls = runs.flatMap((r) => r.calls);
  const writes = calls.filter((c) => c.kind === "write");
  const approved = writes.filter((c) => c.status === "approved").length;
  const decided = approved + writes.filter((c) => c.status === "cancelled").length;
  const spend = runs.reduce((n, r) => n + r.cost, 0);
  const mtd = (usage.data ?? []).reduce((n, u) => n + Number(u.cost_usd), 0);
  const people = members.filter((m) => all.some((r) => r.memberId === m.id));
  const tools = [...new Set(all.flatMap((r) => r.calls.map((c) => c.name)))].sort();
  const shown = runs.slice(0, SHOWN);
  const selected = runs.find((r) => r.id === sp.run) ?? runs[0];
  const stats = [
    [`Runs ${range === "today" ? "today" : NAME[range]}`, String(runs.length), `${new Set(runs.map((r) => r.memberId)).size} ${new Set(runs.map((r) => r.memberId)).size === 1 ? "person" : "people"}`],
    ["Tool calls", String(calls.length), `${calls.length - writes.length} reads · ${writes.length} writes`],
    ["Write approval rate", decided ? `${Math.round((approved / decided) * 100)}%` : "—", `${approved} of ${decided} write requests approved`],
    [range === "today" ? "Spend today" : `Spend ${NAME[range]}`, `$${spend.toFixed(4)}`, `$${mtd.toFixed(2)} of $${CAP} monthly cap`],
  ];

  return (
    <section className="view" aria-label="Agent log">
      <div className="log">
        <div className="log-h">
          <div>
            <h1>Agent log</h1>
            <p>Every assistant run: what it was asked, which tools it called, who approved the change, and what it cost.</p>
          </div>
          <Filters range={range} person={person} tool={tool} people={people} tools={tools} />
        </div>

        <div className="stats">
          {stats.map(([k, v, s]) => (
            <div className="stat" key={k}><div className="k">{k}</div><div className="v">{v}</div><div className="s">{s}</div></div>
          ))}
        </div>

        {runs.length === 0 ? (
          <div className="tbl-card">
            <div className="tbl-wrap"><p className="caption" style={{ padding: 16 }}>
              No assistant runs {range === "today" ? "yet today" : NAME[range]}. Open the assistant and ask something, like “What’s overdue across all projects?”.
            </p></div>
          </div>
        ) : (
          <div className="log-grid">
            <div className="tbl-card">
              <div className="tbl-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Person</th><th>Request</th><th>Tools</th><th>Result</th><th className="num">Tokens in / out</th><th className="num">Cost</th><th className="num">Latency</th></tr></thead>
                  <RunTable runs={shown} selected={selected?.id} />
                </table>
              </div>
              <div className="caption">
                Showing the {shown.length} most recent of {runs.length} runs {range === "today" ? "today" : NAME[range]}. Times are KST.
              </div>
            </div>
            {selected && <RunDetail run={selected} members={members} />}
          </div>
        )}
      </div>
    </section>
  );
}
