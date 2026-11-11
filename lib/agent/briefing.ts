import "server-only";
// The opening conversation of a new sandbox: a short assistant briefing plus one real
// proposal (WEB-25 → Tomás), produced by the real assign_task tool so its card commits
// like any other. No model call; the run is logged with model "briefing" at $0 and does
// not count toward the daily request limit.
import type { Context } from "@/lib/context";
import { formatDue, greeting, todayKst } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/server";
import type { BrieflyMessage, WriteOutput } from "./contract";
import { createTools, type ToolCtx } from "./tools";
import { seedSampleHistory } from "./sample-history";

export const BRIEFING_MODEL = "briefing";
const TITLE = "Today's briefing";

export async function seedBriefing(ctx: Context): Promise<void> {
  const admin = createAdminClient();
  // Once per sandbox, even with parallel requests: only the request that flips the column seeds.
  const { data: claimed, error: claimError } = await admin
    .from("workspaces")
    .update({ briefing_seeded_at: new Date().toISOString() })
    .eq("id", ctx.workspace.id)
    .is("briefing_seeded_at", null)
    .select("id");
  if (claimError) console.error("briefing claim failed", claimError.message);
  if (!claimed?.length) return;

  // Earlier assistant work first, so the board and the Agent log have something to show.
  try {
    await seedSampleHistory(ctx, admin);
  } catch (e) {
    console.error("seeding sample history failed", e instanceof Error ? e.message : e);
  }

  try {
    const conversationId = crypto.randomUUID();
    const now = Date.now();
    const { error: convError } = await ctx.supabase
      .from("conversations")
      .insert({ id: conversationId, workspace_id: ctx.workspace.id, member_id: ctx.me.id, title: TITLE, messages: [] as never });
    if (convError) throw convError;

    const { data: run, error: runError } = await admin
      .from("agent_runs")
      .insert({ workspace_id: ctx.workspace.id, member_id: ctx.me.id, role: ctx.me.role, conversation_id: conversationId, prompt: TITLE, model: BRIEFING_MODEL, result: "await", tokens_in: 0, tokens_out: 0, cost_usd: 0, latency_ms: 0 })
      .select("id")
      .single();
    if (runError || !run) throw runError ?? new Error("no run");

    const { data: task } = await ctx.supabase.from("tasks").select("title, due_date, projects!inner(key)").eq("projects.key", "WEB").eq("number", 25).is("assignee_id", null).maybeSingle();

    const intro = `${greeting()}, ${ctx.me.name.split(" ")[0]}. I go through your projects so you don't have to. I can list what's due or overdue, summarize a project, and prepare changes to tasks. I never change anything until you approve it.`;
    const parts: BrieflyMessage["parts"] = [{ type: "step-start" }, { type: "text", text: intro }];

    if (task) {
      const tctx: ToolCtx = { ...ctx, admin, runId: run.id, conversationId, projectKey: "WEB", today: todayKst(), calls: [] };
      const toolCallId = `call_briefing_${run.id.slice(0, 8)}`;
      const input = { tasks: ["WEB-25"], assignee: "Tomás" };
      // Same tool, same proposal format and pending_actions row as a live request.
      const output = (await createTools(tctx).assign_task.execute!(input, { toolCallId, messages: [] } as never)) as WriteOutput;
      if (output.ok) {
        const due = task.due_date ? `, due ${formatDue(task.due_date)},` : "";
        parts.push({
          type: "text",
          text: `One thing first: WEB-25 "${task.title}"${due} has no owner. Tomás already handles the site's frontend, so I prepared the assignment. Check the card and approve it, or cancel.`,
        });
        parts.push({ type: "tool-assign_task", toolCallId, state: "output-available", input, output } as never);
      }
    }

    const message: BrieflyMessage = { id: `msg_briefing_${run.id.slice(0, 8)}`, role: "assistant", metadata: { createdAt: now, runId: run.id, model: BRIEFING_MODEL }, parts };
    await ctx.supabase.from("conversations").update({ messages: [message] as never, updated_at: new Date(now).toISOString() }).eq("id", conversationId);
  } catch (e) {
    // A briefing is a nicety: never break the page for it.
    console.error("seeding the briefing failed", e instanceof Error ? e.message : e);
  }
}
