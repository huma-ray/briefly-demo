import "server-only";
// Earlier assistant activity for a new sandbox, so the board and the Agent log are not empty on the
// first visit. Every run goes through the real tools, the real commit (as the visitor, so RLS and the
// activity trigger apply) and the real run log; only the model is absent. Runs are labelled model
// "sample", cost $0, and do not count toward the daily request limit.
import type { Context } from "@/lib/context";
import { addDays, startOfKstDay, todayKst } from "@/lib/dates";
import type { createAdminClient } from "@/lib/supabase/server";
import type { WriteOutput } from "./contract";
import { classifyRun } from "./run-result";
import { createTools, type ToolCtx } from "./tools";

export const SAMPLE_MODEL = "sample";

type Admin = ReturnType<typeof createAdminClient>;
type Tools = ReturnType<typeof createTools>;
type Sample = {
  prompt: string;
  minutesAgo: number;
  tokens: [number, number];
  latencyMs: number;
  call: (t: Tools, toolCallId: string) => unknown;
  decide?: "approve" | "cancel";
};

const opts = (toolCallId: string) => ({ toolCallId, messages: [] }) as never;

function samples(today: string): Sample[] {
  return [
    {
      prompt: "What's overdue across all projects?",
      minutesAgo: 340,
      tokens: [1480, 62],
      latencyMs: 1840,
      call: (t, id) => t.list_overdue.execute!({}, opts(id)),
    },
    {
      prompt: "Add a task to put an FAQ block on the pricing page, due next week",
      minutesAgo: 300,
      tokens: [1712, 118],
      latencyMs: 2310,
      call: (t, id) => t.create_task.execute!({ tasks: [{ title: "Add an FAQ block to the pricing page", project: "WEB", status: "todo", due_date: addDays(today, 6) }] }, opts(id)),
      decide: "approve",
    },
    {
      prompt: "Show me everything in Mobile beta",
      minutesAgo: 260,
      tokens: [1390, 41],
      latencyMs: 1520,
      call: (t, id) => t.list_tasks.execute!({ project: "Mobile beta" }, opts(id)),
    },
    {
      prompt: "The Lighthouse pass is finished, move WEB-21 to Done",
      minutesAgo: 210,
      tokens: [1544, 77],
      latencyMs: 1960,
      call: (t, id) => t.update_task_status.execute!({ tasks: ["WEB-21"], status: "done" }, opts(id)),
      decide: "approve",
    },
    {
      prompt: "Assign WEB-25 to Sam",
      minutesAgo: 170,
      tokens: [1502, 58],
      latencyMs: 1730,
      call: (t, id) => t.assign_task.execute!({ tasks: ["WEB-25"], assignee: "Sam" }, opts(id)),
    },
    {
      prompt: "Mark the walkthrough video and the funnel review as done",
      minutesAgo: 120,
      tokens: [1633, 94],
      latencyMs: 2140,
      call: (t, id) => t.update_task_status.execute!({ tasks: ["ONB-7", "ONB-9"], status: "done" }, opts(id)),
      decide: "cancel",
    },
    {
      prompt: "I'll take the activation metric task from Priya",
      minutesAgo: 75,
      tokens: [1588, 83],
      latencyMs: 2050,
      call: (t, id) => t.assign_task.execute!({ tasks: ["ONB-6"], assignee: "me" }, opts(id)),
      decide: "approve",
    },
  ];
}

export async function seedSampleHistory(ctx: Context, admin: Admin): Promise<void> {
  const today = todayKst();
  // Keep the history inside today (KST), so the Agent log's default "Today" view shows it even right after the 03:00 reset.
  const sinceMidnight = (Date.now() - new Date(startOfKstDay()).getTime()) / 60_000;
  const scale = Math.min(1, Math.max(0, sinceMidnight - 2) / 345);
  for (const s of samples(today)) {
    const at = new Date(Date.now() - Math.max(1, s.minutesAgo * scale) * 60_000);
    const { data: run } = await admin
      .from("agent_runs")
      .insert({ workspace_id: ctx.workspace.id, member_id: ctx.me.id, role: ctx.me.role, prompt: s.prompt, model: SAMPLE_MODEL, tokens_in: s.tokens[0], tokens_out: s.tokens[1], cost_usd: 0, latency_ms: s.latencyMs, created_at: at.toISOString() })
      .select("id")
      .single();
    if (!run) continue;
    const tctx: ToolCtx = { ...ctx, admin, runId: run.id, conversationId: null as never, projectKey: "WEB", today, calls: [] };
    const toolCallId = `call_sample_${run.id.slice(0, 8)}`;
    const out = (await s.call(createTools(tctx), toolCallId)) as WriteOutput;
    let result: string = classifyRun(tctx.calls, false);

    if (s.decide && out.ok && "actionId" in out) {
      const decidedAt = new Date(at.getTime() + 40_000).toISOString();
      if (s.decide === "approve") {
        // As the visitor: RLS checks the write and the trigger tags the activity "via assistant".
        const { error } = await ctx.supabase.rpc("commit_pending_action", { action_id: out.actionId, edits: {} });
        result = error ? "error" : "approved";
      } else {
        await ctx.supabase.from("pending_actions").update({ status: "cancelled", decided_by: ctx.me.id, decided_at: decidedAt }).eq("id", out.actionId);
        result = "cancelled";
      }
      await admin.from("pending_actions").update({ decided_at: decidedAt }).eq("id", out.actionId);
      await admin.from("agent_tool_calls").update({ status: result === "approved" ? "approved" : result === "cancelled" ? "cancelled" : "error" }).eq("run_id", run.id);
      // The commit just wrote "via assistant" activity; date it to when it was approved.
      await admin.from("activity").update({ created_at: decidedAt }).eq("workspace_id", ctx.workspace.id).eq("source", "assistant").gt("created_at", new Date(Date.now() - 60_000).toISOString());
      await admin.from("agent_runs").update({ result, approver_id: ctx.me.id, approval_wait_ms: 40_000 }).eq("id", run.id);
    } else {
      await admin.from("agent_runs").update({ result }).eq("id", run.id);
    }
    await admin.from("agent_tool_calls").update({ created_at: at.toISOString() }).eq("run_id", run.id);
  }
}
