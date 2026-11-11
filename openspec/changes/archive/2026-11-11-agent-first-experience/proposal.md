## Why

A visitor who opens Briefly today sees a Kanban board and an empty assistant panel. The agent, which is the whole point of the demo, only shows up after the visitor thinks of something to type, so in the first ten seconds the product reads as "another task board". The approval step that clients ask for by name is buried inside the chat thread. Asking about a task means opening the panel and typing its key by hand.

Separately, the public demo cannot let strangers type into a paid model: a jailbreak or a prompt-injection attempt costs money and risks abuse even with the 20-requests-a-day limit. That scripted demo mode was built during the first change's polishing and is not in any spec yet.

## What Changes

- **Today becomes the landing page.** `/` opens a "Today" view where the assistant has already spoken: "4 things need you today", with one action per item (pending approvals, overdue tasks, unread activity). The briefing is computed from the database, not written by a model. The board stays one click away.
- **Approvals queue.** A sidebar item "Approvals" with a count, and a page listing every proposal the assistant prepared that nobody has decided yet, across all conversations, with the same Approve / Edit / Cancel as the card in the chat.
- **The chat is never empty.** A new sandbox opens with an assistant briefing message and one pending approval card already in a conversation, so the first click can be Approve. Seed data only; no model call.
- **Assistant activity on the board.** A one-line ticker above the columns shows the latest assistant actions ("Assistant created WEB-26 · approved by Alex · 14:03"). Cards keep their "via assistant" tag.
- **Ask about a card.** An "Ask assistant" button in the task editor and a spark icon on a hovered board card attach that task to the composer as a context chip. The server re-reads the attached task through the person's own permissions. In the scripted demo the question list switches to questions about that task.
- **Scripted public demo (record).** With `DEMO_SCRIPTED=true` the composer offers eight fixed questions instead of a text box; each runs the real tool with scripted replies and no model call; the server refuses any other text before storing it; a workspace whose Admin connected their own model gets free-form chat back.
- **Record shipped UI changes.** The Assistant toggle moved from the header to a floating button shown while the panel is closed; the assistant panel is resizable; the task editor is a centred two-column modal with the task's activity; `list_tasks` filters by due-date range and open-only.

Out of scope: natural-language commands in `⌘K`, Slack and Jira inboxes (a separate future change).

## Capabilities

### New Capabilities
- `today-briefing`: the Today landing page, its deterministic briefing, and the opening conversation seeded into every new sandbox.
- `scripted-demo`: the public-demo mode with fixed questions, scripted replies over real tools, server-side refusal of free text, and the bring-your-own-model exception.

### Modified Capabilities
- `app-shell`: landing route, sidebar items (Today, Approvals with count), floating assistant button instead of the header toggle, resizable assistant panel.
- `task-management`: assistant activity ticker on the board, hover "ask" icon on cards, the task editor as a modal with an Activity section and an "Ask assistant" button.
- `assistant-chat`: task context chip in the composer and its server-side handling; `list_tasks` due-date and open-only filters.
- `agent-approval`: approvals queue page that decides proposals outside the chat with the same rules as the card.

## Impact

- **Routes**: new `/today` (and `/` redirect) and `/approvals` in `app/(app)/`; `/api/chat` accepts an optional attached task key.
- **Data**: seed template gains a briefing conversation and one pending action per sandbox (`supabase/migrations/…_seed_template.sql` successor migration and `demo_ensure_sandbox`); no new tables. The approvals page reads `pending_actions` (own rows, existing RLS).
- **Code**: `components/shell.tsx` (sidebar items, landing), `components/assistant/conversation.tsx` (context chip, card-specific demo questions), `components/tasks/board.tsx` (ticker, hover icon), `components/tasks/task-sheet.tsx` (Ask button), `lib/agent/demo-model.ts` and `demo-questions.ts` (task questions), `app/actions/agent.ts` (reuse `decideAction`).
- **Order**: this change's deltas modify requirements introduced by `briefly-agent-saas`; archive that change first.
- **No new dependencies.** No model calls are added; every new surface is deterministic.
