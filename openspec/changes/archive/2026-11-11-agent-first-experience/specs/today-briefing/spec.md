## Purpose

Makes the assistant the first thing a visitor sees: a Today page where the assistant has already summarized what needs the person, and an opening conversation with a ready-to-approve proposal in every new sandbox.

## ADDED Requirements

### Requirement: Today is the landing page
Opening the application root SHALL show the Today page. Today SHALL appear first in the sidebar navigation, above Inbox. The board and list views SHALL stay reachable from the sidebar projects and the header tabs.

#### Scenario: First visit
- **WHEN** a new visitor opens `/`
- **THEN** the Today page is shown, not a project board

#### Scenario: Board still one click away
- **WHEN** the person clicks Website relaunch in the sidebar from Today
- **THEN** the Website relaunch board opens

### Requirement: Deterministic briefing
Today SHALL open with a message from the assistant that counts what needs the person now and lists one row per item type with a count and an action:
- proposals waiting for approval (own, undecided) → opens the Approvals page;
- overdue open tasks in projects the person can see → opens the list of those tasks;
- tasks assigned to the person and due this week (KST) → opens My tasks;
- unread activity from teammates → opens the Inbox.

The briefing SHALL be built from the database with the person's own permissions and SHALL NOT call a language model. Item types with a count of zero SHALL be left out. When every count is zero the message SHALL say the person is all caught up.

#### Scenario: Member briefing in a fresh sandbox
- **WHEN** a Member opens Today in a fresh sandbox
- **THEN** the message reads like "4 things need you today" and shows 1 approval waiting, the overdue tasks in Website relaunch and Q1 onboarding only, their tasks due this week, and 3 unread updates, each with a button

#### Scenario: Role switch changes the briefing
- **WHEN** the person switches to Admin and Today reloads
- **THEN** the overdue row also counts Mobile beta tasks

#### Scenario: Nothing waiting
- **WHEN** there are no pending proposals, no overdue tasks, nothing due this week and no unread activity
- **THEN** the briefing says the person is all caught up and shows no item rows

#### Scenario: No model call
- **WHEN** Today is rendered
- **THEN** no assistant run is recorded in the Agent log

### Requirement: Opening conversation in a new sandbox
Every new sandbox SHALL contain one conversation for the visitor titled "Today's briefing", already open in the assistant panel on first visit. It SHALL hold an assistant message that introduces what the assistant can do and one pending proposal rendered as an approval card that commits for real when approved: assigning the unassigned task WEB-25 to Tomás García. Creating this conversation SHALL NOT call a language model and SHALL NOT be recorded as a request against the daily limit.

#### Scenario: Approve on the first click
- **WHEN** a new visitor opens the app and clicks "Assign 1 task" on the card in the assistant panel
- **THEN** WEB-25 is assigned to Tomás García, its card on the board shows the "via assistant" tag, and the conversation shows the card as approved with a confirmation message

#### Scenario: Cancel the seeded proposal
- **WHEN** the visitor clicks Cancel on the seeded card
- **THEN** nothing is written and the card shows as cancelled

#### Scenario: Counted as pending
- **WHEN** the visitor opens Today before deciding the seeded card
- **THEN** the briefing shows 1 approval waiting
