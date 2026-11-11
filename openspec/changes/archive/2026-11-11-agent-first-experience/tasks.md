## 1. Record what is already built

- [x] 1.1 Scripted demo mode: `DEMO_SCRIPTED`, `lib/agent/demo-questions.ts`, `lib/agent/demo-model.ts`, server refuses free text before storing, own endpoint unlocks free chat; verified by asking all eight questions as a fresh visitor and posting free text to `/api/chat` (400, nothing stored)
- [x] 1.2 Floating "Ask assistant" button instead of the header toggle, resizable assistant panel (300–640px, arrow keys, double-click reset, remembered); verified in the browser at desktop and 375px
- [x] 1.3 Task editor as a two-column modal with Activity, Details menus, unsaved state; `list_tasks` `due_from` / `due_to` / `open_only`; verified with the real model asking "What's due this week?" (one call, 7 rows)

## 2. Groundwork

- [x] 2.1 Sync `briefly-agent-saas` specs into `openspec/specs/` so this change's MODIFIED deltas have base specs (that change stays open for its deploy tasks and is archived later with `--skip-specs`); verified: `openspec validate agent-first-experience --strict` reports no archive warnings
- [x] 2.2 App state: add `assistantTask` and `askAbout(key | null)`, and let the shell open the panel on request while keeping ⌘J and drawer behaviour; verify `askAbout("WEB-22")` from the browser console opens the panel at desktop and phone widths

## 3. Approvals queue

- [x] 3.1 `app/(app)/approvals/page.tsx`: own pending proposals newest first, each with its question, time, "Open conversation" link and the existing `ApprovalCard` built from the conversation's tool part; fallback row when the part is missing; empty state linking to Today; verify with two pending proposals from two conversations
- [x] 3.2 Sidebar "Approvals" item with a pending count from the layout; refresh after decisions; verify approving from the queue removes the entry, drops the count and shows the card as approved in the original conversation
- [x] 3.3 Extend `scripts/check-rls.mjs`: a second visitor cannot see the first visitor's pending proposals, and a Member approving an Admin's Mobile beta proposal from the queue path is refused; verify `npm run check:rls` passes

## 4. Opening conversation and Today

- [x] 4.1 Migration: `workspaces.briefing_seeded_at`, claimed atomically by the seeder (simpler than changing `demo_ensure_sandbox`'s return type; also backfills existing sandboxes); verified: exactly one `briefing` run per workspace
- [x] 4.2 `seedBriefing(ctx)`: a `briefing` run, the real `assign_task` proposal for WEB-25 → Tomás, and a "Today's briefing" conversation with the intro message and that tool part; exclude `model = 'briefing'` from the daily limit; verify a fresh visitor sees the card in the open panel and "Assign 1 task" assigns WEB-25 with the "via assistant" tag
- [x] 4.3 `app/(app)/today/page.tsx` with the deterministic briefing (approvals, overdue, mine due this week, unread), zero rows hidden, all-caught-up state; `/` redirects to `/today`; Today first in the sidebar; verify Member vs Admin counts differ by the Mobile beta overdue tasks and no run is logged for rendering Today
- [x] 4.4 Each briefing row's button opens its target (Approvals, overdue list, My tasks, Inbox); verify each button at desktop and 375px

## 5. Board ticker

- [x] 5.1 Latest three assistant changes in the current project above the columns ("Assistant created WEB-26 · approved by Alex Kim · 14:03"), click opens the task, hidden when none; verify after approving the three launch tasks and on a project with no assistant changes

## 6. Ask about a task

- [x] 6.1 Spark button on board cards and list rows (hover, focus, always on phone) and "Ask assistant" in the task modal, both calling `askAbout(key)`; verify neither opens or changes the task by accident
- [x] 6.2 Composer chip (key · title, remove ×) from `assistantTask`; `ChatRequest.taskKey`; the user bubble shows the attached key; verify regenerate keeps the task
- [x] 6.3 `/api/chat`: validate the key, load it through RLS before storing anything, 403 "You don't have access to that task." when hidden, add the attached task to the instructions as data; verify a Member posting a MOB key gets 403 and nothing is stored
- [x] 6.4 `get_task` read tool (task row plus activity lines) in the tool catalogue and contract; verify a unit test or a scripted call returns the task and its history
- [x] 6.5 Scripted task questions: `taskQuestions(task)` (summarize, move to next status / back to Todo, assign to me unless already mine), server validation against them, matching steps in `demo-model.ts`; verify each question on a Todo, a Done and an own task in scripted mode

## 7. Wrap-up

- [x] 7.1 Update README (Today, Approvals, ask about a task, demo script) and the five-minute demo script to start from Today; verify the script end to end as a fresh visitor in scripted mode
- [x] 7.2 Run `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run check:rls` and a production build; all pass
