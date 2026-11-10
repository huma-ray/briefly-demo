## 1. Project setup

- [x] 1.1 `git init`, scaffold Next.js 16 (App Router, TypeScript strict, Tailwind v4, ESLint) in the repo root keeping `docs/` and `openspec/`; verify `npm run build` and `npm run typecheck` pass on the empty app
- [x] 1.2 Install `@supabase/supabase-js`, `@supabase/ssr`, `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`; init shadcn/ui and add Command, Popover, DropdownMenu, Sheet, Dialog; verify the build still passes
- [x] 1.3 Add `.env.example` with every variable from design.md (Migration Plan) and `lib/supabase/{server,client}.ts` request-scoped clients; verify typecheck passes
- [ ] 1.4 Create the Supabase project with anonymous sign-ins enabled and link the CLI (user provides project ref and keys); verify `supabase db push --dry-run` connects

## 2. Database: schema, RLS, functions

- [x] 2.1 Migration with all tables, enums, constraints and cascades from design.md section 2 (including `next_number` trigger for task keys); verify `supabase db push` applies cleanly
- [x] 2.2 Migration with helpers `my_member`, `can_see_project`, `project_counts`, `project_access` and all RLS policies from design.md section 3; verify with `select` as an anon test user in SQL that RLS is on for every table
- [x] 2.3 Migration with the `tasks` activity trigger (one row per changed field, `briefly.source` setting, `last_source`); verify an `update` of status writes one activity row with source `ui`
- [x] 2.4 Migration with the `seed` schema holding the Northwind Studio template (3 projects, 5 people, 5 labels, every task from the design file incl. ONB-7, 3 recent teammate activity entries) and `demo_ensure_sandbox()` + `demo_set_role()`; verify calling `demo_ensure_sandbox()` twice returns the same workspace id
- [x] 2.5 Migration with `commit_pending_action(id, edits)` (security invoker, idempotent status flip, all-or-nothing, sets `briefly.source`) and `record_usage(cost)` into `usage_daily`; verify a second call on the same id writes nothing
- [x] 2.6 Write `scripts/check-rls.mjs`: two anonymous users get separate sandboxes, cannot read each other's rows, Member cannot read `MOB` tasks, Admin (after `demo_set_role`) can, commit as Member on a MOB proposal fails; verify `npm run check:rls` passes

## 3. Session, sandbox and app shell

- [x] 3.1 `proxy.ts`: refresh session, `signInAnonymously()` when none; `(app)/layout.tsx` calls `demo_ensure_sandbox()`; `/` redirects to `/p/WEB/board`; verify a fresh browser lands on the board with no form
- [x] 3.2 Port the design tokens to Tailwind `@theme`, load Geist / Geist Mono via `next/font`, copy SVG symbols, status and priority icons into `components/icons.tsx`; verify a token test page renders the same colours as the design file
- [x] 3.3 Build the shell: sidebar (workspace button, Search, Inbox / My tasks / Agent log with counts, Projects with key and admin tag, person footer), header (crumbs, tabs, View as, Assistant button), demo strip; verify against the design at 1440px in the browser
- [x] 3.4 View-as control calls `demo_set_role` and refreshes; verify switching to Admin shows Mobile beta with the admin tag and the footer reads "Admin · demo account"
- [x] 3.5 Assistant open/close (button, close, `⌘J`), drawers and scrim below 1200px and 760px, `Escape` closes, reduced-motion rule; verify at 1440, 1024 and 375px with no horizontal scroll at 375px

## 4. Task management

- [x] 4.1 Board view (columns, cards, ghost add, toolbar with count) from Server Component reads; verify a fresh Member sandbox shows 4 / 3 / 4 and "11 tasks"
- [x] 4.2 Drag and drop with `@dnd-kit` (between and within columns, keyboard, touch), `moveTask` server action, optimistic update with rollback; verify a move persists after reload and appears in activity
- [x] 4.3 List view grouped by status with label column hidden under 640px main width; verify same tasks and count as the board
- [x] 4.4 New task dialog (toolbar, column +, ghost add with preselected status) and task editor sheet for all fields with Zod validation and assignee-must-be-project-member check; verify "QA checklist" gets the next key and an empty title shows a field error
- [x] 4.5 My tasks page and sidebar count; verify the count equals the not-Done tasks listed
- [x] 4.6 Search palette (`⌘K`) over visible tasks and projects; verify "WEB-25" opens the task and "Mobile" returns nothing as Member
- [x] 4.7 Filter (assignee incl. Unassigned, priority, label) in URL params, and Display options in `localStorage`; verify filtering by Alex Kim updates the count and hidden labels stay hidden after reload
- [x] 4.8 Overdue styling by KST date; verify WEB-18 shows the red due pill and Done tasks never do

## 5. Activity feed

- [x] 5.1 "via assistant" tag on cards, rows and activity entries driven by `last_source` / `source`; verify a hand edit removes the card tag but keeps the activity tag
- [x] 5.2 Inbox page (sentences, avatars, KST relative time, click opens task) and unread count from `inbox_seen_at`; verify a fresh sandbox shows "Inbox 3" and the count clears after opening

## 6. Assistant: chat and tools

- [x] 6.1 `lib/ai/provider.ts` and `lib/ai/pricing.ts` (confirm current model id and price), unknown model fails fast; add `lib/ai/pricing.test.ts`; verify `npm run test:unit` passes
- [x] 6.2 Resolver for people, projects and tasks by name / key / id with candidate errors; unit-test exact, ambiguous and missing matches; verify tests pass
- [x] 6.3 Read tools `list_tasks`, `list_overdue`, `summarize_project` with strict Zod schemas, `project_access` blocked handling, row counts and durations; verify in the chat that a Member asking about Mobile beta gets the access message and no MOB rows reach the model (check logged args/result)
- [x] 6.4 Write tools `create_task`, `update_task_status`, `assign_task` as prepare-only: validate, resolve, insert `pending_actions`, return preview with "NOT executed" text; verify a request creates a pending action and no task rows
- [x] 6.5 `/api/chat` route: auth, limits check (20/day per visitor KST, $10/month from `usage_daily`) with demo message, run row, `streamText` with system prompt and step limit, `onFinish` recording tokens, cost, latency, tool calls, result classification, usage and saved messages; unit-test the result classification; verify a read question produces a complete run row
- [x] 6.6 Chat panel UI: header with model badge, History, close; context bar with `project_counts`; message layout; streaming; stop; verify against the design's thread
- [x] 6.7 Tool chips (status icon, name × n, summary, JSON args) and inline task rows that open the task; scope note "Filtered to your access: n of m projects searched."; verify the overdue question renders like the design
- [x] 6.8 Composer: suggestion chips (assign chip uses a real unassigned task and teammate), Enter / Shift+Enter, project pill, `@` mention popover; verify picking WEB-25 inserts "WEB-25"
- [x] 6.9 Conversation history: save per person, list, reopen with final card states, new conversation; verify a reloaded conversation shows an approved card as approved
- [x] 6.10 Error flows: tool `{ error }` rendering, provider failure message with Retry (logged as error run), demo-limit message; verify by asking to assign to "Sam", by setting an invalid API key locally, and by lowering the daily limit to 1 locally

## 7. Approval step

- [x] 7.1 Approval card component in pending / editing / approved / cancelled states with exact copy from the design and per-tool headers ("Approve 3 new tasks", "Update 1 task", …); verify visually against the design
- [x] 7.2 `decideAction` server action: Zod-validate edits, call `commit_pending_action`, patch the tool part output in the stored conversation, update run result / approver / wait, append the deterministic confirmation message; verify approve, cancel and double-approve behave as in the agent-approval spec
- [x] 7.3 After approval: chip shows rows written and timing, `router.refresh()`, `fresh` highlight on returned task ids, "View in Agent log" link; verify three created tasks appear highlighted with the "via assistant" tag
- [x] 7.4 Follow-up awareness: verify that after approving three tasks, "assign them to Tomás" produces an assign card for those three keys

## 8. Agent log page

- [x] 8.1 Stats row, range control, person and tool filters, runs table with result pills and numeric columns, caption, empty state; verify numbers match the `agent_runs` rows for the range
- [x] 8.2 Run detail panel with trace steps per result type and JSON arguments, default to newest, keyboard selection, stacked under 900px; verify a blocked run shows "Permission filter applied" and a cancelled run shows "nothing written"
- [x] 8.3 Member sees own runs, Admin sees all; verify with `check:rls` extended to `agent_runs`

## 9. Operations, docs, deploy

- [x] 9.1 `/api/cron/reset` with `CRON_SECRET` check and `vercel.json` cron `0 18 * * *`; verify 401 without the secret and that a call with it deletes sandboxes and anonymous users while keeping `usage_daily`
- [ ] 9.2 README: what the demo shows, architecture diagram, permission model, approval flow, agent log, provider swap to Claude in `lib/ai/provider.ts` (exact lines), env vars, local setup, deploy; verify the setup steps work from a clean clone
- [ ] 9.3 Deploy to Vercel with production env; verify the deployed site creates a sandbox on first visit and the cron is listed in the Vercel dashboard
- [ ] 9.4 End-to-end walkthrough on the deployed site of the demo script: Member overdue question (filtered), Mobile beta request (blocked), three tasks with Edit then Approve, cancel a batch, switch to Admin and repeat the overdue question, open the Agent log and inspect each run; verify every step matches the specs at 1440px and 375px

## 10. Custom model endpoint

- [x] 10.1 Migration `ai_settings` with admin-only writes and the key column hidden from people; verify with `check:rls` that a Member cannot save and the browser cannot select `api_key_enc`
- [x] 10.2 `lib/ai/secret.ts` (AES-256-GCM) and `lib/ai/endpoint.ts` (URL rules, private-address check, guarded fetch with connect-time lookup, no redirects); verify with unit tests for the address ranges and an encrypt/decrypt round trip
- [x] 10.3 Provider resolution (workspace setting → env `AI_BASE_URL` → OpenAI) used by the chat route; custom runs cost 0 and keep the daily limit; verify against a local OpenAI-compatible stub that a question is answered and logged with the custom model id
- [x] 10.4 Server actions save / clear / test (models list + tool-call probe); verify a Member save is rejected and a loopback URL is refused without a request
- [x] 10.5 Provider popover on the model badge (Admin form, Member read-only, masked key, test results, reset to default); verify in the browser in both roles
