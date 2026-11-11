## MODIFIED Requirements

### Requirement: Deterministic briefing
Today SHALL show three blocks:
1. **Briefing**: an assistant message with the greeting, "N things need you today" (N = waiting items) and one sentence naming what waits (changes awaiting approval, overdue tasks, tasks due today, Slack mentions needing a reply, unread updates), or that the person is all caught up.
2. **Waiting for you**: the waiting items themselves, grouped as Waiting for your approval, Overdue, Due today and Needs your reply, each row with its source, title, a context line, its due date when it has one, and an action that hands it to the assistant: Review (opens Approvals) for a proposal, Ask assistant (attaches the task) for a task, Draft reply (attaches the thread) for a mention.
3. **Hand it to the assistant**: buttons that open the assistant panel and send a fixed question right away (What's overdue across all projects?, What's due this week?, What needs my reply in Slack?, Summarize this project); they work in scripted mode.

Everything SHALL be built from the database with the person's own permissions and SHALL NOT call a language model. Empty groups SHALL be left out.

#### Scenario: Member briefing in a fresh sandbox
- **WHEN** a Member opens Today in a fresh sandbox
- **THEN** the heading reads "6 things need you today", the approval group shows the WEB-25 assignment with Review, the overdue group shows WEB-18 and ONB-7 with Ask assistant, and the reply group shows the three Slack mentions with Draft reply

#### Scenario: Role switch changes the briefing
- **WHEN** the person switches to Admin and Today reloads
- **THEN** the overdue group also lists Mobile beta tasks

#### Scenario: Hand a task to the assistant
- **WHEN** the person clicks Ask assistant on WEB-18
- **THEN** the panel opens with the WEB-18 chip and the task's questions

#### Scenario: Quick action
- **WHEN** the person clicks "What's due this week?"
- **THEN** the panel opens and the question is sent without typing, answered with the week's open tasks

#### Scenario: Nothing waiting
- **WHEN** there are no pending proposals, no overdue or due-today tasks, no mentions waiting and no unread activity
- **THEN** the briefing says the person is all caught up and the Waiting for you block is not shown

#### Scenario: No model call
- **WHEN** Today is rendered
- **THEN** no assistant run is recorded in the Agent log

## ADDED Requirements

### Requirement: One shape for waiting work
Every item that waits for the person SHALL be represented as `{ source, id, title, due, status, link }` with `source` one of briefly, slack or jira, `status` one of awaiting_approval, overdue, due_today or needs_reply, `due` a date or null and `link` where the item lives, optionally with a context line and how to attach it to the assistant. Today SHALL render only this list, so adding a source SHALL require only a new collector.

#### Scenario: Sources in one list
- **WHEN** a fresh sandbox has a pending proposal, overdue tasks and simulated Slack mentions
- **THEN** all of them appear in Waiting for you, the Slack ones labelled "Slack (sim)"

### Requirement: Sample assistant history
Every new sandbox SHALL contain earlier assistant runs made through the real tools and approval commit: an approved task creation (WEB-26), an approved status change (WEB-21 to Done), an approved assignment (ONB-6 to the visitor), a run blocked by access (Mobile beta), a tool error (assign to "Sam"), a cancelled proposal and a read-only run, dated earlier the same KST day. Their changes SHALL carry the "via assistant" tag on the board and in the activity feed.

#### Scenario: First visit
- **WHEN** a new visitor opens the Website relaunch board and the Agent log
- **THEN** the board shows WEB-26 and WEB-21 tagged "via assistant" with the assistant line above the columns, and the log lists eight runs with Approved, Blocked by access, Tool error, Cancelled, Read only and Awaiting approval results
