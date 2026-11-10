# Briefly

A small team task tracker (workspace → project → task, board and list, activity feed) with an assistant built into it. The tracker is deliberately ordinary. The assistant is the point of the demo:

- **Streams** its replies in a side panel (Vercel AI SDK `useChat`).
- **Calls typed tools**, each with a Zod schema: `list_tasks`, `list_overdue`, `summarize_project`, `create_task`, `update_task_status`, `assign_task`.
- **Asks before it writes.** Every write becomes a card ("Approve 3 new tasks") with Approve / Edit / Cancel. Nothing changes until a person approves.
- **Uses the person's own permissions.** A Member who asks for "all projects" only gets their own projects, and Postgres enforces that.
- **Logs every turn**: tools, arguments, outcome, tokens, cost and latency, shown on the Agent log page.
- **Fails honestly.** A failed tool is reported, not guessed around, and demo limits (20 requests a day per visitor, $10 a month in total) show a clear message.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind + shadcn/ui · Supabase (Postgres, Auth, RLS) · Vercel AI SDK 7 · OpenAI (one-file switch to Claude) · Vercel. Everything is TypeScript; there is no Python service.

## Try the demo

There is no sign-up. Each visitor gets an anonymous session and a private copy of the "Northwind Studio" sample workspace, playing Alex Kim. Use **View as Member / Admin** in the header to switch roles; the switch changes your real role in the database.

A five-minute script:

1. As **Member**, ask *"What's overdue across all projects?"*. You get two tasks and the note "Filtered to your access: 2 of 3 projects searched."
2. Ask *"Show me everything in Mobile beta"*. The assistant says you have no access, and the run is logged as *Blocked by access*.
3. Ask *"Create three tasks for the launch: landing copy, pricing page, email sequence. All due Friday."* Click **Edit**, rename one task, then **Create 3 tasks**. The new cards appear on the board with a "via assistant" tag.
4. Ask it to move every Q1 onboarding task to Done, then **Cancel**.
5. Switch to **Admin** and repeat step 1: overdue tasks now include Mobile beta.
6. Open **Agent log** and click through the runs to see the trace, arguments, tokens and cost.

## How it works

```
browser                                    server (visitor's session)            Postgres
-------                                    --------------------------            --------
board / list  --server actions-------->    supabase (anon key + JWT) ----------> RLS: can_see_project()
assistant     --POST /api/chat-------->    streamText(model, tools)                 |
                                             read tool  -> query via RLS  ------>   |
                                             write tool -> validate + resolve       |
                                                        -> pending_actions (no task write)
approval card --decideAction()-------->    commit_pending_action()  (SECURITY INVOKER,
                                             all-or-nothing, at most once) ----> RLS again
                                           agent_runs / agent_tool_calls (service role, read-only for people)
```

- **Permission filter = RLS.** Tools use the visitor's own Supabase client and never the service role. When a Member asks for everything, the query is `select * from tasks`, and Postgres returns only their projects. There is no role check in TypeScript to forget. `scripts/check-rls.mjs` proves it end to end.
- **Approval.** Write tools only *prepare*: they validate, resolve names (an unknown "Sam" fails here, before any card exists) and store a proposal. The card shows it; Edit changes titles in place. Approve calls a Postgres function that runs as the visitor, so RLS checks the writes again. If you switch from Admin to Member before approving a Mobile beta change, the commit is refused. The outcome is written back into the conversation, so the model sees it on the next turn.
- **Activity.** A trigger on `tasks` writes one activity row per changed field in the same transaction. Writes made through approval are tagged `assistant` ("via assistant" in the UI). No code path can skip it.
- **Agent log.** Each request records the model, tokens in and out, cost (from `lib/ai/pricing.ts`), latency, and every tool call with its arguments, result, rows and duration. The run result is one of Awaiting approval, Approved, Cancelled, Read only, Blocked by access or Tool error.
- **Demo limits and reset.** Limits are checked before any model call. Every night at 03:00 KST a Vercel cron (`/api/cron/reset`, guarded by `CRON_SECRET`) deletes all sandboxes and anonymous users. The monthly spend counter (`usage_daily`) is kept.

## Bring your own model (self-hosted / OpenAI-compatible)

An Admin can point the assistant at any OpenAI-compatible endpoint (vLLM, LiteLLM, Ollama, …) from the **model badge** in the assistant header: base URL (e.g. `https://llm.example.com/v1`), model id and API key, with **Test connection** that checks the endpoint answers, lists the model and returns a tool call. Members see the active model but cannot change it (enforced by RLS).

- The API key is encrypted with `PROVIDER_KEY_SECRET` (AES-256-GCM), is never readable from the browser (not even the ciphertext) and is shown only as its last four characters.
- The server calls a URL a person typed, so requests go through a guarded fetch: http(s) only, no redirects, and connections to loopback / private / link-local / CGNAT addresses are refused at connect time. Set `ALLOW_PRIVATE_AI_ENDPOINTS=true` only when Briefly itself runs inside the same private network as the model server.
- Custom runs are logged with their model id and token counts at **$0** (not our bill); the 20-requests-a-day limit still applies.
- For a deployment-wide self-hosted default instead of per-workspace settings, set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL`.
- The assistant depends on tool calling. On vLLM start the model with `--enable-auto-tool-choice` and the `--tool-call-parser` that matches the model family; Test connection tells you if tool calls come back.

## Switching the default provider

Provider choice lives in one file, [`lib/ai/provider.ts`](lib/ai/provider.ts) (workspace endpoint → `AI_BASE_URL` → OpenAI). To make Claude the hosted default, run `npm i @ai-sdk/anthropic` and replace the two lines marked `// provider`:

```ts
import { anthropic } from "@ai-sdk/anthropic";
const hosted = () => anthropic(defaultModelId);
```

Then set `AI_MODEL` to a Claude model id and add its price to [`lib/ai/pricing.ts`](lib/ai/pricing.ts). An unknown model id fails at startup instead of logging wrong costs.

## Local setup

Requires Node 22+, Docker and the Supabase CLI.

```bash
npm install
supabase start                      # local Postgres/Auth on port 55321, applies migrations
cp .env.example .env.local          # keys printed by `supabase start`, OPENAI_API_KEY, PROVIDER_KEY_SECRET
npm run dev
```

Checks:

```bash
npm run typecheck
npm run test:unit                   # pricing, run classification, name resolver
npm run check:rls                   # isolation, Member/Admin scope, approval commit, forged rows
```

## Deploy

1. Create a Supabase project and enable **Anonymous sign-ins** (Authentication → Providers).
2. `supabase link --project-ref <ref>` and `supabase db push`.
3. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `AI_MODEL`, `PROVIDER_KEY_SECRET`, `CRON_SECRET` and `NEXT_PUBLIC_SOURCE_URL`, then deploy. The cron in `vercel.json` runs the reset at 18:00 UTC (03:00 KST).

The planning documents (proposal, specs, design, tasks) are in [`openspec/changes/briefly-agent-saas/`](openspec/changes/briefly-agent-saas/). The visual source of truth is [`docs/Briefly Workspace.html`](docs/Briefly%20Workspace.html).
