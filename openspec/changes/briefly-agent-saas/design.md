## Context

Greenfield: the repository holds only `docs/Briefly Workspace.html` (a static, self-contained mock with sample data and scripted interactions) and the OpenSpec setup. Motivation and scope are in `proposal.md`; behaviour is in `specs/`. Constraints: TypeScript only (no Python service), Next.js App Router, Supabase (Postgres, Auth, RLS), Vercel AI SDK, Vercel hosting, OpenAI as the default provider with Claude as a one-file swap. The sibling project `sneakerblend` already uses Next 16 + `@supabase/ssr` + Zod + shadcn, so the same conventions apply.

## Goals / Non-Goals

**Goals:**
- Pixel-level match with the design file, real behaviour behind every control in it.
- Permission enforcement that lives in Postgres, so the UI, the assistant and a hand-crafted API call all get the same answer.
- An approval gate that cannot be bypassed by the model: the model can only propose; only a human action commits.
- Every assistant turn measurable after the fact (tools, args, outcome, tokens, cost, latency).

**Non-Goals:**
- Real accounts, invitations, password login, multiple workspaces per person, workspace switching.
- Realtime multi-user sync (each visitor has a private sandbox).
- Dark theme, i18n, comments, attachments, notifications by email.
- Seeding fake agent runs: the Agent log shows only what really happened in the visitor's sandbox.

## Decisions

### 1. Anonymous session + per-visitor sandbox clone
`proxy.ts` (Next 16's renamed middleware) refreshes the Supabase session and calls `signInAnonymously()` when there is none. The app layout then calls the RPC `demo_ensure_sandbox()` (idempotent, `security definer`), which copies the template rows from a private `seed` schema into a new workspace and links the caller's `auth.uid()` to the "Alex Kim" member row.

```
browser --> proxy.ts --(no session)--> signInAnonymously()
                |
                v
        app/(app)/layout.tsx --> rpc demo_ensure_sandbox()
                                   |-- has membership? -> return workspace_id
                                   '-- else copy seed.* -> new workspace,
                                       members (Alex Kim -> auth.uid()),
                                       projects, project_members, labels,
                                       tasks, activity (teammates' recent edits)
```

*Why over shared accounts:* isolates visitors (no one reads another client's prompts), makes "assigned to you" true for seeded tasks, and turns the nightly reset into "delete everything". *Why over a login page:* the design has none; the View-as toggle replaces it.

### 2. Data model
```
workspaces(id, name, timezone='Asia/Seoul', is_demo, created_at)
members(id, workspace_id, user_id NULL -> auth.users, name, initials,
        avatar_color 1..5, role 'admin'|'member', inbox_seen_at)
projects(id, workspace_id, key, name, color, next_number)
project_members(project_id, member_id)
labels(id, workspace_id, name, color)
tasks(id, project_id, number, title, description, status 'todo'|'doing'|'done',
      priority 0..4, label_id, due_date, assignee_id -> members,
      position float8, last_source 'ui'|'assistant', created_at, updated_at)
      unique(project_id, number)
activity(id, workspace_id, project_id, task_id, actor_id, source, kind,
         field, old_value, new_value, created_at)
conversations(id, workspace_id, member_id, title, messages jsonb, updated_at)
agent_runs(id, workspace_id, member_id, role, conversation_id, prompt, model,
           tokens_in, tokens_out, cost_usd numeric(10,6), latency_ms, result,
           approver_id, approval_wait_ms, created_at)
agent_tool_calls(id, run_id, tool_call_id, name, kind 'read'|'write', args jsonb,
                 result jsonb, error text, rows int, duration_ms, project_ids uuid[])
pending_actions(id, run_id, tool_call_id, tool, payload jsonb,
                status 'pending'|'approved'|'cancelled'|'failed', decided_by, decided_at)
usage_daily(day date pk, runs int, cost_usd numeric)   -- survives the nightly reset
```
Teammates are `members` rows with `user_id = NULL`; this keeps assignees, avatars and activity uniform without fake auth users. Task keys come from `projects.next_number`, bumped by a `before insert` trigger (`number` is never reused). Everything except `usage_daily` cascades from `workspaces`.

### 3. RLS is the permission filter
Two `stable security definer` helpers: `my_member(ws)` (member row of `auth.uid()` in a workspace) and `can_see_project(project_id)` (admin of the project's workspace, or listed in `project_members`). Policies:
- `projects`, `tasks`, `activity`: select/insert/update where `can_see_project(project_id)`.
- `members`, `labels`, `workspaces`: select within own workspace.
- `agent_runs`: select own runs, or all workspace runs when admin; `agent_tool_calls` via its run.
- `conversations`: own only. `activity`, `agent_runs`, `agent_tool_calls`: no update/delete policies for people.
- Role changes only via `demo_set_role(role)` (`security definer`, checks `is_demo` and `user_id = auth.uid()`).

The chat route and all tools use the request-scoped server client (anon key + the visitor's JWT) for every task read and write. The service-role key is used only for server-owned rows that people must not forge: `agent_runs`, `agent_tool_calls`, `pending_actions` (created at prepare time), `usage_daily`, and the reset cron. People can only read those rows (and decide their own pending proposals), so the Agent log cannot be edited from the browser. *Alternative rejected:* filtering in TypeScript (`if role === 'member'`), which every new code path would have to remember.

Two read-only helpers expose just enough about hidden data: `project_counts()` → `{visible, total}` for the context bar, and `project_access(key)` → `'visible' | 'hidden' | 'missing'` so the assistant can say "no access to Mobile beta" (Blocked) instead of "no such project", without returning any of its rows.

### 4. Activity and "via assistant" written by the database
An `after insert or update` trigger on `tasks` writes one `activity` row per changed field, with `actor_id = my_member(...)` and `source = coalesce(current_setting('briefly.source', true), 'ui')`, and sets `tasks.last_source`. The approval commit RPC does `set_config('briefly.source','assistant', true)` inside its transaction. No code path can change a task without leaving a trace. Seeded activity from teammates is inserted with timestamps a few hours old so the Inbox shows an unread count of 3.

### 5. Agent turn flow (prepare on the server, commit on approval)
```
useChat --POST /api/chat-->  route.ts
  1. user client, member, role            (401 if none)
  2. limits: own runs today (KST) < 20, usage_daily this month < $10
       over -> stream demo message, record run (0 tokens), stop
  3. insert agent_runs (result pending)
  4. streamText(model, system, messages, tools(ctx), stopWhen: 5 steps)
       read tool  -> query via RLS -> rows (+ access check)
       write tool -> Zod parse -> resolve names via RLS -> validate
                  -> insert pending_actions -> return
                     { status: "pending_approval", actionId, preview }
                     (text tells the model: NOT executed yet)
  5. onFinish: tokens, cost(pricing table), latency, tool calls,
               result classification, usage_daily += cost, save messages
<-- UI message stream (text + tool parts)

Approval card --server action decideAction(actionId, 'approve'|'cancel', edits)-->
  Zod-validate edits -> rpc commit_pending_action(id, edits)   [security invoker]
     update pending_actions set status=... where id=$1 and status='pending'
       (0 rows -> already decided: return stored outcome; idempotent)
     set_config('briefly.source','assistant'); apply inserts/updates (RLS applies)
     all-or-nothing in one transaction
  -> patch the tool part output in conversations.messages with the outcome
  -> update agent_runs.result / approver / wait
  -> append deterministic assistant confirmation ("Created WEB-26, ...")
<-- outcome -> card state, chip, board refresh + fresh highlight
```
*Why not AI SDK's built-in tool approval:* it is approve/deny only, so Edit would have to be faked. Prepare-then-commit also surfaces bad arguments (unknown "Sam", hidden project) before a card exists, as the design's error run shows. *Why a deterministic confirmation:* it costs no tokens and cannot hallucinate. The model sees the real outcome on the next turn because the tool output in history is patched.

Commit runs as `security invoker`, so the same RLS policies apply at approval time; switching from Admin to Member before approving makes the commit fail (spec scenario).

### 6. Tools
`lib/agent/tools.ts` builds the six tools for a request context `{ supabase, member, workspace, runId }`. Inputs are Zod schemas (`.strict()`); writes accept arrays (`tasks: [...]`, `ids: [...]`) so one request gets one card. A shared resolver maps names, keys or ids to exactly one visible record or throws with candidates. Errors are returned as `{ error }` tool results (not thrown) so the model can explain them; the system prompt says to report errors plainly and never claim a write before approval. Tool results sent to the model carry only rows that RLS returned.

### 7. Provider and pricing in one place
`lib/ai/provider.ts` exports `model` and `modelId` (`openai(process.env.AI_MODEL ?? 'gpt-4o-mini')`); README shows the two-line swap to `@ai-sdk/anthropic`. `lib/ai/pricing.ts` maps model id to USD per 1M input and output tokens; cost = tokens × price. The model id and price are checked against the provider's current list at implementation time; an unknown model id fails fast at startup.

### 8. UI construction
- Tailwind v4 `@theme` holds the design's tokens verbatim (`--canvas`, `--accent`, `--av1..5`, radii, shadows); `next/font` loads Geist and Geist Mono. shadcn/ui gives the behaviour primitives (Command for ⌘K, Popover/DropdownMenu for Filter, Display, @ and History, Sheet for the task editor and drawers, Dialog for New task), restyled to the tokens.
- The design's SVG symbols, status icons and priority bars are copied into `components/icons.tsx` so they match exactly (no lucide substitutions).
- Routes: `/` → `/p/WEB/board`; `/p/[key]/board`, `/p/[key]/list`, `/my`, `/inbox`, `/log`. The shell and the assistant panel live in the `(app)` layout as a client boundary, so the chat survives navigation.
- Cache Components (on in the Next 16 scaffold) is turned off: every page depends on the session cookie, so there is nothing to prerender.
- Reads in Server Components with the user client; mutations in server actions with `revalidatePath`; after an approval the client calls `router.refresh()` and keeps the returned task ids for the `fresh` highlight.
- Drag and drop: `@dnd-kit` (core + sortable) for mouse, touch and keyboard; `position` is the midpoint of neighbours; optimistic update with rollback on error. *Alternative rejected:* native HTML5 DnD, which has no touch or keyboard support.
- Filters in URL search params; Display options in `localStorage` (wrapped in try/catch).

### 9. Nightly reset
`vercel.json` cron `0 18 * * *` (03:00 KST) → `GET /api/cron/reset` that checks `Authorization: Bearer ${CRON_SECRET}`, then with the service-role client deletes demo workspaces (cascade) and anonymous auth users. `usage_daily` is kept so the monthly cap is real.

### 10. Custom model endpoint (bring your own model)
- `ai_settings(workspace_id pk, base_url, model, api_key_enc, key_hint, updated_at)`. RLS: members read, only `is_ws_admin` inserts/updates/deletes. `api_key_enc` is not granted for SELECT to `authenticated`, so the browser can never read even the ciphertext; the chat route reads it with the service role and decrypts with `PROVIDER_KEY_SECRET` (AES-256-GCM).
- Provider resolution (`lib/ai/provider.ts`): workspace setting if present, else env (`AI_BASE_URL` + `AI_API_KEY` for a deployment-wide self-hosted default), else OpenAI. Custom endpoints use `@ai-sdk/openai-compatible` with `includeUsage` so streamed token counts reach the Agent log. Cost is 0 for custom endpoints (not our bill); the daily per-visitor limit is unchanged.
- SSRF: the server fetches a URL a person typed. URLs must be http(s) without credentials; every connection goes through a guarded fetch whose DNS lookup rejects loopback, private, link-local, CGNAT and unique-local addresses at connect time (so DNS rebinding cannot slip past a pre-check), and redirects are refused. A self-hosted deployment on the same network as its model server sets `ALLOW_PRIVATE_AI_ENDPOINTS=true`.
- Test connection: `GET {base}/models` (model listed?) and one tiny non-streaming chat call with a single trivial tool and `tool_choice: required` (tool call returned?), each with a short timeout.
- [Risk] A weak self-hosted model breaks tool calls and the approval flow → Test connection checks tool calling before the admin relies on it; failures surface as tool errors in the chat and the Agent log.

## Risks / Trade-offs

- [Anonymous sign-in abuse: a script can create many visitors to bypass the 20/day limit] → Supabase's per-IP anonymous sign-in rate limit, the global $10 monthly cap in `usage_daily`, and a cheap default model. Turnstile can be added on `signInAnonymously` if abuse shows up.
- [Model claims success while a write is only pending] → write tool results say "NOT executed, waiting for the person's approval"; the system prompt repeats it; the UI state comes from `pending_actions`, not from model text.
- [Prompt injection through task titles or descriptions] → the model cannot write without a human click, and it can only read what RLS returns to that person.
- [Edited titles bypass validation] → the commit path re-parses edits with the same Zod schema and the database enforces `not null` / length checks.
- [Clone function drifts from the schema as columns are added] → one SQL function, covered by the RLS check script that creates a sandbox on every run.
- [Model or price changes (gpt-4o-mini retired, price change)] → model from env, price table in one file, unknown model fails at startup.
- [Patching stored message JSON is fragile across AI SDK versions] → patch only the `output` of the part with matching `toolCallId`; covered by the conversation-history scenario.
- [Trigger-based activity hides logic in SQL] → accepted: it is the only way to guarantee that every write path logs; documented in README.

## Migration Plan

New project, so no data migration. Deploy order: create the Supabase project and enable anonymous sign-ins → apply migrations (schema, RLS, functions, seed) → set Vercel env (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `AI_MODEL`, `CRON_SECRET`) → deploy. Rollback is redeploying the previous Vercel build; schema changes go forward-only through new migrations.

## Open Questions

- Final default model id and its price, confirmed against OpenAI's model list on the day of implementation (design shows `gpt-4o-mini`).
