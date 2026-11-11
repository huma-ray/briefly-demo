## Why

A review of the demo found that a visitor still reads it as a task tracker in the first seconds: Today listed counts, the board had no trace of the assistant and the Agent log was empty until the visitor asked something. The waiting items were also collected per source inside the Today page, so adding real Slack or Jira later would mean rewriting it.

## What Changes

- **Today in three blocks.** The assistant's briefing (one sentence over everything waiting), a "Waiting for you" list of the actual items grouped as Waiting for your approval / Overdue / Due today / Needs your reply, each with an action that hands it to the assistant (Review, Ask assistant, Draft reply), and "Hand it to the assistant" quick actions that send a question straight into the chat.
- **One shape for waiting work.** Every waiting item, whatever its source, is a `WorkItem { source, id, title, due, status, link }` (plus optional detail and how to hand it to the assistant). Today renders only that list; a new source is one more collector.
- **Sample assistant history in every new sandbox.** Seven earlier runs (approved, blocked, tool error, cancelled, read) go through the real tools and commit, so the board shows "via assistant" cards and the Agent log shows varied results on the first visit. They are labelled model `sample`, cost $0 and do not count toward the daily limit.
- **History menu.** It is closed on load and after any navigation, so it never covers the "Acting as" line.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `today-briefing`: the briefing becomes three blocks over a shared work-item list; new sandboxes get sample assistant history.
- `agent-log`: sample runs and how they are labelled.

## Impact

`lib/work-items.ts` (new), `app/(app)/today/page.tsx`, `components/today/today.tsx`, `lib/agent/sample-history.ts` (new), `lib/agent/briefing.ts`, `app/api/chat/route.ts` (limit excludes sample runs), `components/app-state.tsx` and `components/assistant/conversation.tsx` (quick actions), `components/assistant/assistant-panel.tsx` (history menu). No schema change.
