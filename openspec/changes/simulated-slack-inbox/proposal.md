## Why

The clients we demo to want an agent that gathers work from the tools their team already lives in, not one that only knows its own task board. Briefly today has a single source (its own tasks), so the "assistant that collects and proposes" story stops at the edge of the app. A real Slack integration needs OAuth, tokens, a workspace admin's consent and sends work messages to a model; none of that belongs in a public, anonymous demo. A simulated Slack source seeded into every sandbox shows the same product idea safely and for free.

Real Slack for the author's company (Korean mentions, internal vLLM) is a separate future project and is not part of this change.

## What Changes

- **Simulated Slack data per sandbox.** A handful of channels and threads in English and Korean, cloned into each sandbox like the sample tasks. Some messages mention Alex Kim and wait for a reply; one thread is long; one message from an outside partner carries a prompt-injection attempt. Everything is labelled "Slack (simulated)" and uses no Slack logo or branding.
- **Inbox gets a second source.** The Inbox shows two tabs, Activity (today's feed) and Slack (simulated), with a count of mentions waiting for a reply. Threads open inline; a mention can be marked done by hand.
- **Today counts Slack.** The Today briefing gets a row "N Slack mentions need a reply" that opens the Slack tab.
- **Assistant tools for messages.** New read tools to list mentions waiting for a reply and to read a thread; a new write tool to reply in a thread. The model summarizes and translates (Korean ↔ English) from what it reads. Sending a reply goes through the approval card with the message text editable; on Approve the reply appears in the simulated thread as Alex and the mention is resolved.
- **Ask about a thread.** "Ask assistant" on a Slack thread attaches it to the composer as a chip, like a task.
- **Scripted demo questions for Slack.** With `DEMO_SCRIPTED=true`, fixed questions cover "What needs my reply in Slack?", and with a thread attached: summarize it, translate the latest message, draft a reply (in Korean for a Korean thread). Replies are scripted over the real tools; no model call. With a workspace's own model the same tools work from free text.
- **Untrusted messages.** Message text is treated as data: the assistant never follows instructions found in it, and nothing is "sent" without approval.

Out of scope: the real Slack API, Jira, Uzbek translation, real-time message arrival.

## Capabilities

### New Capabilities
- `slack-inbox`: the simulated Slack source: seeded channels, threads and messages, the Inbox Slack tab, mark done, the Today row, thread attachment, and the scripted Slack questions.

### Modified Capabilities
- `assistant-chat`: tool catalogue gains `list_mentions`, `get_thread` and `reply_in_thread`; message text from tools is untrusted data.
- `agent-approval`: a reply proposal renders as an approval card with editable message text and commits by adding the reply and resolving the mention.

## Impact

- **Database**: new tables `slack_threads` and `slack_messages` with RLS (workspace members read; posting a reply only as yourself; resolving only in your workspace), seed tables in the `seed` schema, `demo_ensure_sandbox` clones them, `commit_pending_action` handles `reply_in_thread`. One new migration.
- **Code**: `lib/agent/tools.ts` and `contract.ts` (three tools, reply proposal shape), `components/assistant/tool-parts.tsx` (reply card), `app/(app)/inbox/` and `components/inbox/` (tabs, threads), `app/(app)/today/` (Slack row), `app/api/chat/route.ts` (attached thread), `lib/agent/demo-questions.ts` and `demo-model.ts` (Slack questions), `scripts/check-rls.mjs`.
- **Order**: builds on `agent-first-experience` (Today, attachments, scripted questions). Archive that change before this one; this change's assistant-chat delta restates the tool catalogue including `get_task`.
- **No new dependencies, no external services, no model calls in scripted mode.**
