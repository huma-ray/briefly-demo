import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  InvalidToolInputError,
  isStepCount,
  isToolUIPart,
  NoSuchToolError,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import { z } from "zod";
import { getContext } from "@/lib/context";
import { createAdminClient } from "@/lib/supabase/server";
import { workspaceModel } from "@/lib/ai/provider";
import { todayKst, startOfKstDay } from "@/lib/dates";
import type { BrieflyMessage } from "@/lib/agent/contract";
import { createTools, type ToolCtx } from "@/lib/agent/tools";
import { attachedTaskNote, attachedThreadNote, buildInstructions } from "@/lib/agent/prompt";
import { classifyRun } from "@/lib/agent/run-result";
import { DAILY_LIMIT, MONTHLY_CAP_USD, dailyMessage, monthlyMessage } from "@/lib/agent/limits";
import { DEMO_MODEL_ID, demoModel, demoScripted, type DemoThread } from "@/lib/agent/demo-model";
import { BRIEFING_MODEL } from "@/lib/agent/briefing";
import { SAMPLE_MODEL } from "@/lib/agent/sample-history";
import { demoQuestionFor, taskQuestions, threadQuestions } from "@/lib/agent/demo-questions";
import { TASK_COLUMNS, parseKey, toTask, type Task } from "@/lib/model";

export const maxDuration = 60;

const UNAVAILABLE = "The assistant is unavailable right now.";
const newMessageId = createIdGenerator({ prefix: "msg", size: 16 });

const Body = z.object({
  id: z.uuid(),
  projectKey: z.string().max(10),
  taskKey: z.string().regex(/^[A-Z]{2,10}-\d{1,6}$/).optional(),
  threadId: z.uuid().optional(),
  trigger: z.enum(["submit-message", "regenerate-message"]).optional(),
  message: z
    .object({ id: z.string().max(100), role: z.literal("user"), parts: z.array(z.looseObject({ type: z.string() })) })
    .optional(),
});

const json = (body: unknown, status: number) => Response.json(body, { status });
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 500);
const textOf = (m: BrieflyMessage) => m.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join("\n").trim();

/** Stored tool parts that never got a result (stream cut mid-tool) would break the provider call. */
function cleanHistory(messages: BrieflyMessage[]): BrieflyMessage[] {
  return messages
    .map((m) => ({ ...m, parts: m.parts.filter((p) => !isToolUIPart(p) || p.state === "output-available" || p.state === "output-error") }))
    .filter((m) => m.parts.length > 0) as BrieflyMessage[];
}

/** A single assistant text message as a UI stream (no model involved). */
function textResponse(msg: BrieflyMessage, text: string) {
  const stream = createUIMessageStream<BrieflyMessage>({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageId: msg.id, messageMetadata: msg.metadata });
      writer.write({ type: "text-start", id: "t0" });
      writer.write({ type: "text-delta", id: "t0", delta: text });
      writer.write({ type: "text-end", id: "t0" });
      writer.write({ type: "finish", messageMetadata: msg.metadata });
    },
  });
  return createUIMessageStreamResponse({ stream });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid request." }, 400);
  const { id, projectKey, trigger } = parsed.data;

  const ctx = await getContext(); // redirects to a fresh session when there is none
  const { supabase, me, workspace } = ctx;
  const admin = createAdminClient();
  const regenerate = trigger === "regenerate-message";
  // Public demo: fixed questions with scripted answers, unless this workspace brought its own model (its cost, not ours).
  const scripted = demoScripted() && !ctx.aiSettings;
  const PICK = "In the public demo, pick one of the suggested questions.";

  // The new user message is rebuilt from its text only: tool parts or files sent by the client are never trusted.
  let userMessage: BrieflyMessage | null = null;
  if (!regenerate) {
    const text = parsed.data.message
      ? parsed.data.message.parts.flatMap((p) => (p.type === "text" && typeof p.text === "string" ? [p.text] : [])).join("\n").trim().slice(0, 4000)
      : "";
    if (!text) return json({ error: "Empty message." }, 400);
    userMessage = { id: parsed.data.message!.id, role: "user", metadata: { createdAt: Date.now(), ...(parsed.data.taskKey ? { taskKey: parsed.data.taskKey } : {}) }, parts: [{ type: "text", text }] };
  }

  // ---- conversation: load (RLS: own only) or create
  const { data: conv } = await supabase.from("conversations").select("messages").eq("id", id).maybeSingle();
  const stored = (conv?.messages ?? []) as unknown as BrieflyMessage[];
  let history = stored;
  if (regenerate) {
    if (history.at(-1)?.role === "assistant") history = history.slice(0, -1);
  } else {
    history = [...stored.filter((m) => m.id !== userMessage!.id), userMessage!];
  }
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return json({ error: "Nothing to answer." }, 400);
  const prompt = textOf(lastUser);

  // An attached task is re-read with the person's own permissions before anything is stored.
  const taskKey = regenerate ? lastUser.metadata?.taskKey : parsed.data.taskKey;
  let attached: Task | undefined;
  if (taskKey) {
    const k = parseKey(taskKey);
    const { data: row } = k ? await supabase.from("tasks").select(TASK_COLUMNS).eq("projects.key", k.project).eq("number", k.number).maybeSingle() : { data: null };
    if (!row) return json({ error: "You don't have access to that task." }, 403);
    attached = toTask(row);
  }

  // Or a simulated Slack thread, re-read the same way (RLS keeps it to the person's sandbox).
  const threadId = regenerate ? lastUser.metadata?.threadId : parsed.data.threadId;
  if (taskKey && threadId) return json({ error: "Attach a task or a thread, not both." }, 400);
  let thread: DemoThread | undefined;
  if (threadId) {
    const { data: t } = await supabase.from("slack_threads").select("id, channel, status, script").eq("id", threadId).maybeSingle();
    if (!t) return json({ error: "You don't have access to that thread." }, 403);
    const { data: langs } = await supabase.from("slack_messages").select("lang").eq("thread_id", t.id);
    thread = { id: t.id, channel: t.channel, status: t.status, script: t.script as DemoThread["script"], korean: (langs ?? []).some((m) => m.lang === "ko"), messages: langs?.length ?? 0 };
    lastUser.metadata = { ...lastUser.metadata, threadId: t.id, threadChannel: t.channel };
  }

  // Checked before anything is stored: free text never reaches a model or the database in the demo.
  const extra = attached ? taskQuestions(attached, me.id) : thread ? threadQuestions({ korean: thread.korean, waiting: thread.status === "waiting" }) : undefined;
  if (scripted && !demoQuestionFor(prompt, extra)) return json({ error: PICK }, 400);

  const row = { messages: history as never, updated_at: new Date().toISOString() };
  if (conv) {
    await supabase.from("conversations").update(row).eq("id", id);
  } else {
    const title = prompt.length > 60 ? `${prompt.slice(0, 59)}…` : prompt;
    const { error } = await supabase.from("conversations").insert({ id, workspace_id: workspace.id, member_id: me.id, title, ...row });
    if (error) return json({ error: "Conversation not found." }, 404);
  }

  // ---- limits, before any model call
  const monthStart = `${todayKst().slice(0, 8)}01`;
  const [{ count: runsToday }, { data: usage }] = await Promise.all([
    // The seeded briefing is not a request the visitor made.
    supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("member_id", me.id).not("model", "in", `(${BRIEFING_MODEL},${SAMPLE_MODEL})`).gte("created_at", startOfKstDay()),
    admin.from("usage_daily").select("cost_usd").gte("day", monthStart),
  ]);
  const spent = (usage ?? []).reduce((s, r) => s + Number(r.cost_usd), 0);
  const limit = (runsToday ?? 0) >= DAILY_LIMIT ? dailyMessage() : spent >= MONTHLY_CAP_USD ? monthlyMessage() : null;

  const hosted = scripted ? null : await workspaceModel(admin, workspace.id);
  const modelId = hosted?.modelId ?? DEMO_MODEL_ID;
  const base = { workspace_id: workspace.id, member_id: me.id, role: me.role, conversation_id: id, prompt, model: modelId };
  const { data: run, error: runError } = await admin
    .from("agent_runs")
    .insert({ ...base, ...(limit ? { result: "error" as const, error: limit, tokens_in: 0, tokens_out: 0, cost_usd: 0, latency_ms: 0 } : {}) })
    .select("id")
    .single();
  if (runError || !run) return json({ error: UNAVAILABLE }, 500);

  if (limit) {
    const msg: BrieflyMessage = {
      id: newMessageId(),
      role: "assistant",
      metadata: { createdAt: Date.now(), runId: run.id, model: modelId, limited: true },
      parts: [{ type: "text", text: limit }],
    };
    await supabase.from("conversations").update({ messages: [...history, msg] as never, updated_at: new Date().toISOString() }).eq("id", id);
    return textResponse(msg, limit);
  }

  // ---- the model run
  const started = Date.now();
  const tctx: ToolCtx = { ...ctx, admin, runId: run.id, conversationId: id, projectKey: projectKey || ctx.projects[0]?.key || "", today: todayKst(), calls: [] };
  const tools = createTools(tctx);
  const active = hosted ?? demoModel(tctx, attached, thread);
  let streamError: string | null = null;

  let result: ReturnType<typeof streamText<typeof tools>>;
  try {
    let validated: BrieflyMessage[];
    try {
      validated = await validateUIMessages<BrieflyMessage>({ messages: cleanHistory(history), tools: tools as never });
    } catch (e) {
      console.error("stored conversation failed validation, answering without history", errMsg(e));
      validated = [lastUser];
    }
    result = streamText({
      model: active.model,
      instructions:
        buildInstructions(ctx, tctx.today, tctx.projectKey) +
        (attached
          ? attachedTaskNote({
              key: attached.key,
              title: attached.title,
              description: attached.description,
              status: attached.status,
              priority: attached.priority,
              dueDate: attached.dueDate,
              assignee: ctx.members.find((m) => m.id === attached.assigneeId)?.name ?? null,
              project: ctx.projects.find((p) => p.id === attached.projectId)?.name ?? attached.projectKey,
            })
          : "") +
        (thread ? attachedThreadNote({ id: thread.id, channel: thread.channel, status: thread.status, messages: thread.messages }) : ""),
      messages: await convertToModelMessages(validated, { tools }),
      tools,
      stopWhen: isStepCount(5),
      onError: ({ error }) => {
        streamError ??= errMsg(error);
        console.error("assistant stream error", streamError);
      },
    });
  } catch (e) {
    await admin.from("agent_runs").update({ result: "error", error: errMsg(e), latency_ms: Date.now() - started }).eq("id", run.id);
    return json({ error: UNAVAILABLE }, 500);
  }

  const finish = async (messages: BrieflyMessage[], failure: string | null) => {
    const usage = await Promise.race([Promise.resolve(result.totalUsage), new Promise<null>((r) => setTimeout(() => r(null), 1500))]).catch(() => null);
    const tokensIn = usage?.inputTokens ?? 0;
    const tokensOut = usage?.outputTokens ?? 0;
    const cost = active.cost(tokensIn, tokensOut);
    const saved = messages.filter((m, i) => !(i === messages.length - 1 && m.role === "assistant" && m.parts.length === 0));
    const done = await Promise.all([
      admin
        .from("agent_runs")
        .update({ tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: cost, latency_ms: Date.now() - started, result: classifyRun(tctx.calls, !!failure), error: failure })
        .eq("id", run.id),
      admin.rpc("record_usage", { cost }),
      supabase.from("conversations").update({ messages: saved as never, updated_at: new Date().toISOString() }).eq("id", id),
    ]);
    for (const { error } of done) if (error) console.error("run bookkeeping failed", error.message);
  };

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: history,
      generateMessageId: newMessageId,
      messageMetadata: ({ part }) => (part.type === "start" ? { createdAt: Date.now(), runId: run.id, model: modelId } : undefined),
      onError: (e) => {
        // The model called a tool with bad arguments or an unknown tool: a tool error the model can recover
        // from (it sees the message), not an outage.
        const misuse = InvalidToolInputError.isInstance(e) || NoSuchToolError.isInstance(e);
        if (misuse) {
          tctx.calls.push({ status: "error" });
          const name = "toolName" in e ? String(e.toolName) : "unknown";
          admin.from("agent_tool_calls").insert({
            run_id: run.id,
            tool_call_id: newMessageId(),
            name,
            kind: name.startsWith("list_") || name.startsWith("summarize_") ? "read" : "write",
            args: ("toolInput" in e ? e.toolInput : {}) as never,
            error: "The assistant sent invalid arguments to this tool.",
            status: "error",
          }).then(() => {}); // the builder only sends when awaited or thenned
        }
        // the same error is reported again for the tool-output-error chunk
        if (misuse || /^AI_(InvalidToolInput|NoSuchTool)Error/.test(errMsg(e))) return "The assistant called a tool incorrectly. Nothing was changed.";
        streamError ??= errMsg(e);
        // A self-hosted endpoint's admin needs the reason to fix it; the hosted provider's errors stay masked.
        return active.custom ? `${UNAVAILABLE} Model endpoint: ${errMsg(e).slice(0, 200)}` : UNAVAILABLE;
      },
      onEnd: ({ messages, outcome }) =>
        finish(messages as BrieflyMessage[], streamError ?? (outcome.status === "failed" ? errMsg(outcome.error) : null)),
    }),
  });
}
