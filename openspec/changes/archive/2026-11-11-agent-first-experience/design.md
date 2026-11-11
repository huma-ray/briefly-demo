## Context

See proposal.md for the motivation. The relevant current state:

- `/` redirects to `/p/WEB/board`. The shell (`components/shell.tsx`) owns whether the assistant panel is open; nothing outside the shell can open it or pass it anything.
- A write tool calls `propose()` in `lib/agent/tools.ts`, which inserts a `pending_actions` row (owned by the person, RLS: own rows only, `run_id` required) and returns a `WriteOutput` whose `proposal` is rendered by `ApprovalCard`. The proposal itself lives only in the stored conversation's tool part; `pending_actions.payload` holds the normalized arguments.
- `decideAction` (`app/actions/agent.ts`) commits through `commit_pending_action` (as the person, idempotent), patches the decision into the conversation, appends the confirmation message and updates the run's result. It needs `run_id`.
- Activity rows carry `source = 'assistant'` and `actor_id` = the person who approved, because the commit runs as them.
- Sandboxes are cloned from the `seed` schema by `demo_ensure_sandbox()`, called from `getContext()`.
- The scripted demo already exists: `lib/agent/demo-questions.ts` (client-safe list) and `lib/agent/demo-model.ts` (an OpenAI-compatible model whose `fetch` answers locally), switched by `DEMO_SCRIPTED` and bypassed when the workspace has `ai_settings`.
- The floating assistant button, resizable panel, modal task editor and `list_tasks` date filters are already implemented; this change only records them in the specs.

## Goals / Non-Goals

**Goals:**
- Every new surface is deterministic: no language-model call is added anywhere.
- One code path for approvals: the queue, the chat and the seeded card all go through `decideAction` and the same `ApprovalCard`.
- Task context never trusts the browser: the server re-reads the task through RLS.

**Non-Goals:**
- No new tables and no change to RLS policies.
- No real-time updates between tabs; pages refresh after an action, as today.
- No AI-written briefing text. If a model-written summary is wanted later, it is an explicit "Summarize my day" action, not the landing page.

## Decisions

### 1. Today and the briefing are a server component over existing queries
`app/(app)/today/page.tsx` runs four head-count queries with the person's client (same style as the counters in `app/(app)/layout.tsx`): own `pending_actions` with `status = 'pending'`; open tasks with `due_date < today` (visible projects via RLS); own open tasks due in the KST week; activity since `inbox_seen_at` from others. It renders an assistant-styled message ("4 things need you today") with one row per non-zero count. `app/page.tsx` redirects to `/today`.
*Alternative:* ask the model for a summary on load. Rejected: costs money on every visit, slow first paint, and conflicts with the scripted demo.

### 2. The seeded proposal is produced by the real tool, right after the sandbox is created
The opening conversation must render and commit exactly like a live proposal, so it is created in TypeScript, not in SQL: when `getContext()` sees that `demo_ensure_sandbox()` just created the workspace, it runs a small `seedBriefing(ctx)` that inserts an `agent_runs` row (`model = 'briefing'`, `prompt = "Today's briefing"`, result `await`, 0 tokens, $0), calls `createTools(ctx).assign_task.execute({ tasks: ["WEB-25"], assignee: "Tomás" })` to get the real `pending_actions` row and `WriteOutput`, and stores a conversation titled "Today's briefing" with an assistant text message plus that tool part. The once-only trigger is a `workspaces.briefing_seeded_at` column that the seeder claims with a conditional update (`… where briefing_seeded_at is null returning id`); it runs inside `getContext()`'s per-request cache so the layout and the page both see the seeded proposal. *Considered:* changing `demo_ensure_sandbox`'s return type to report "created now"; the column needs no RPC change and also seeds sandboxes created before this change.
*Alternatives:* building the tool part as JSON in SQL (duplicates the proposal format and drifts); making `pending_actions.run_id` nullable (spreads null checks through `decideAction` and the log). A `briefing` run row keeps every existing path working.
The daily-limit query in `/api/chat` excludes `model = 'briefing'` so the seed does not use one of the visitor's 20 requests.

### 3. The panel opens the newest conversation
`AssistantPanel` already loads the most recent conversation, which in a new sandbox is the seeded one, and the panel is open by default at desktop width. No change needed beyond verifying it; on narrow screens the floating button opens it.

### 4. Approvals page reads proposals from the conversations they live in
`app/(app)/approvals/page.tsx` selects own pending `pending_actions` (id, tool_call_id, conversation_id, created_at) and the matching conversations' `messages` and `title`, then picks the tool part with the same `toolCallId` to get the `WriteOutput`. A client list renders `ApprovalCard` for each and calls `router.refresh()` after a decision (the card's existing `onDecided`). "Open conversation" sets the panel's conversation through the app state (Decision 6).
*Alternative:* copy the proposal into `pending_actions.payload` at propose time. Rejected for now: a migration and a second source of truth for the same data; reading the conversation is one extra query on a small page.
The sidebar "Approvals" count is one more head query in the layout.

### 5. Board ticker from activity
The board page adds one query: the project's latest 3 `activity` rows with `source = 'assistant'`, joined to the task number and the actor's name. Rendered as a one-line strip above the columns; entries call `openTask`. Text: "Assistant {created|moved|assigned|…} {key} · approved by {actor} · {HH:MM}", reusing the Inbox `sentence()` wording where it fits.

### 6. App state owns "open the assistant with this task"
`AppState` gains `assistantTask: string | null` and `askAbout(key: string | null)`. `askAbout` sets the task and opens the panel; the shell reads an `assistantOpenRequest` counter from app state to open itself (it keeps owning the open/closed state for ⌘J and drawers). The task modal's "Ask assistant" closes the modal then calls `askAbout(key)`; board cards and list rows get a small spark button (visible on hover and `:focus-within`) that calls `askAbout(key)` and stops the click from opening the modal.

### 7. Task context on the wire and on the server
`ChatRequest` gains `taskKey?: string`. The composer shows the chip from `assistantTask` and sends it in the request body. `/api/chat` validates the format (`/^[A-Z]{2,10}-\d{1,6}$/`), loads the task with the person's client (same query as `getTask`) before storing anything, and returns 403 "You don't have access to that task." when it is not visible. The key is stored in the user message's metadata (`taskKey`) so the thread can show a small chip on that bubble and regenerate keeps it. For model runs, the instructions gain a short "Attached task" section with the task's fields as data (the existing rule that titles and descriptions are data applies). The new `get_task` read tool returns the task as a single row plus its activity lines, so the model can fetch history when asked.

### 8. Scripted questions for an attached task
`demo-questions.ts` gains `taskQuestions(task)` that builds the three questions from the key, current status and assignee (pure function, client-safe). `demoQuestionFor(prompt, task)` checks against the general list or that task's list. `demo-model.ts` adds the matching steps: `get_task`, `update_task_status` to the next status (Done → Todo), `assign_task` to "me". The route passes the loaded task to both.

## Risks / Trade-offs

- [The seed runs on the request that creates the sandbox, adding latency to the first page] → It is one run insert, one tool call and one conversation insert (tens of ms locally); measure on the hosted database and move it behind the first response only if it is noticeable.
- [A `briefing` run appears in the Agent log and in "runs today"] → That is honest (the assistant did prepare a proposal); its model column reads `briefing` and costs $0.
- [Approvals page depends on the tool part still being in the conversation] → Conversations are never edited except by `decideAction`'s patch; if a part is missing (corrupt history), the entry falls back to a plain row with the question, time and Cancel only.
- [Two tabs deciding the same proposal] → Already handled: `commit_pending_action` is idempotent and `decideAction` returns the existing decision.
- [Hover-only affordance on touch screens] → The icon also shows on focus and is always visible on phone widths.

## Migration Plan

1. `briefly-agent-saas` specs are synced into `openspec/specs/` (it stays open for its deploy tasks; archive it with `--skip-specs`), so the MODIFIED deltas here have base specs.
2. One SQL migration adds `workspaces.briefing_seeded_at`. Existing sandboxes get their briefing on their next request.
3. Deploy; `/` now lands on Today. Rollback is a redeploy of the previous build; the migration is backward compatible (old code ignores the extra column).
