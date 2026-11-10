## Purpose

Records who changed what and when for every task change, marks changes made through the assistant, and shows the history in the Inbox.

## ADDED Requirements

### Requirement: Activity record for every task change
Every task creation and every change to title, description, status, priority, label, due date or assignee SHALL produce an activity entry with the actor, the time, the task, the field, the old value and the new value, and the source: UI or assistant. Entries SHALL be written by the database in the same transaction as the change, so no change path can skip them. Entries SHALL NOT be editable or deletable by people.

#### Scenario: UI change
- **WHEN** Alex Kim changes WEB-22's due date from Nov 12 to Nov 14 in the task editor
- **THEN** an entry records Alex Kim, the time, WEB-22, due date, Nov 12 → Nov 14, source UI

#### Scenario: Assistant change
- **WHEN** the assistant creates WEB-26 after Alex Kim approves
- **THEN** an entry records Alex Kim as the actor, task created, source assistant

### Requirement: Via-assistant attribution
Tasks whose latest change came from the assistant SHALL show the "via assistant" tag on board cards and list rows, and activity entries with source assistant SHALL show the same tag.

#### Scenario: Tag after manual edit
- **WHEN** a person edits by hand a task that the assistant created
- **THEN** the card no longer shows the tag, and the earlier activity entry still does

### Requirement: Inbox
The Inbox SHALL show the activity of the projects the person can see, newest first, with actor avatar, sentence ("Priya Shah moved WEB-20 to In progress"), relative time in KST, and the "via assistant" tag where applicable. Clicking an entry SHALL open its task. The sidebar SHALL show the number of entries made by other people since the person last opened the Inbox.

#### Scenario: Unread count clears
- **WHEN** the sidebar shows "Inbox 3" and the person opens the Inbox
- **THEN** the three entries are listed and the count disappears

#### Scenario: Member scope
- **WHEN** a Member opens the Inbox
- **THEN** no activity from Mobile beta is shown
