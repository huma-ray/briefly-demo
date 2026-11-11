## 1. Database

- [x] 1.1 Migration: `slack_threads` and `slack_messages` with constraints, indexes, RLS policies and column grants from design.md sections 1 and 3; verify `supabase migration up --local` applies and `npm run gen:types` adds both tables
- [x] 1.2 Seed content in `seed.slack_threads` / `seed.slack_messages`: `#launch` (Marcus, English, waiting), `#design` (Dilnoza, 10+ messages, waiting), `#partner-kr` (김민준, Korean, waiting, one message with an instruction to the assistant), two further threads not waiting; `script` for the three waiting threads; verify the content reads naturally in the Slack tab
- [x] 1.3 `demo_ensure_sandbox` clones the Slack seed with `seed_id`; verify a fresh sandbox has 3 waiting threads and an existing one is unchanged
- [x] 1.4 `commit_pending_action` branch for `reply_in_thread` (insert as me, Hangul → 'ko', thread done, `no_access` on RLS failure, idempotent); verify with SQL that a second call writes nothing
- [x] 1.5 Extend `scripts/check-rls.mjs`: B cannot read A's threads, A cannot post as another member, A cannot change `script` or `channel`, a reply proposal commits once; verify `npm run check:rls` passes

## 2. Inbox and Today

- [x] 2.1 Inbox tabs Activity / Slack (simulated) via `?tab=slack`, waiting count on the tab, simulated note; verify both tabs at desktop and 375px
- [x] 2.2 Thread list with channel, latest author, excerpt, "Mentions you", Needs reply / Done; expandable thread with all messages; Korean shown as Korean; verify `#partner-kr` and the long `#design` thread
- [x] 2.3 Mark done / reopen server action (status only, RLS); verify the count drops from 3 to 2 and comes back on reopen
- [x] 2.4 Today row "N Slack mentions need a reply" (simulated) linking to `/inbox?tab=slack`, counted in the headline; verify a fresh sandbox shows 3

## 3. Assistant tools and approval

- [x] 3.1 `list_mentions` and `get_thread` read tools in `tools.ts` and `contract.ts`, chips render; verify with the stub or scripted mode that each returns the expected threads and messages
- [x] 3.2 `reply_in_thread` write tool with validation ("thread not found", empty text) and the `Proposal.reply` shape; verify a proposal row is stored and the card appears
- [x] 3.3 `ApprovalCard` reply variant (heading, excerpt, text, meaning, Edit textarea, "Post reply"), `Decision.thread`, `buildConfirmation` and run classification; unit test for the confirmation; verify approve, edit-then-approve and cancel in the chat and from the Approvals page
- [x] 3.4 Prompt rule that messages, titles and descriptions are untrusted data; verify with the stub or own model that the `#partner-kr` instruction is not acted on

## 4. Thread attachment

- [x] 4.1 App state `assistantAttachment` (task or thread), `askAboutThread`, chip for both kinds, user-bubble label; existing task flows unchanged; verify attaching a thread replaces an attached task
- [x] 4.2 `/api/chat` accepts `threadId` (not with `taskKey`), re-reads it through RLS (403 "You don't have access to that thread."), adds the attached-thread note, stores it on the message; verify a foreign thread id gets 403 and nothing is stored
- [x] 4.3 "Ask assistant" on Slack threads in the Inbox; verify the panel opens with the chip

## 5. Scripted mode

- [x] 5.1 `demo-questions.ts`: general "What needs my reply in Slack?" and `threadQuestions(thread)`; unit tests for which questions a Korean, an English and a done thread get
- [x] 5.2 `demo-model.ts` steps and replies using `script` (summary mentions the ignored instruction for `#partner-kr`, translation, Korean draft with meaning); verify every Slack question in scripted mode as a fresh visitor, including posting the Korean reply

## 6. Wrap-up

- [x] 6.1 README: the simulated Slack source, what it is not, and the demo script step; verify the step end to end as a fresh visitor
- [x] 6.2 `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run check:rls` and a production build all pass
