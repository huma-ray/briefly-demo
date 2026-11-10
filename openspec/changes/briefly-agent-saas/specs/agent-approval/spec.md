## Purpose

Guarantees that the assistant never changes data without the person's explicit approval, and gives the person a clear card to approve, edit or cancel every proposed write.

## ADDED Requirements

### Requirement: No write without approval
Every call to a write tool (`create_task`, `update_task_status`, `assign_task`) SHALL first be validated and resolved with the person's permissions and turned into a pending proposal. No task data SHALL change until the person approves that proposal. Invalid or unauthorized proposals SHALL fail before any card is shown.

#### Scenario: Nothing written while pending
- **WHEN** an approval card is shown and the person reloads the board
- **THEN** none of the proposed changes are present

#### Scenario: Proposal for a hidden project
- **WHEN** a Member asks the assistant to create a task in Mobile beta
- **THEN** no approval card is shown and the assistant reports that the person has no access

### Requirement: Approval card
Each proposal SHALL render as a card in the thread with a header naming the action and tool (for example "Approve 3 new tasks", `create_task`), one row per affected task showing its title and the resulting project, status, due date and assignee as pills, the note "Nothing is written until you approve.", and the buttons Approve (labelled with the action, for example "Create 3 tasks"), Edit and Cancel. The assistant's message SHALL tell the person what it will do before the card.

#### Scenario: Status change card
- **WHEN** the person asks to move WEB-20 to In progress
- **THEN** a card shows WEB-20 with the new status and an Approve button "Update 1 task"

### Requirement: Edit before approve
Edit SHALL make each proposed task title editable in place and change to "Done editing". On Approve, the edited titles SHALL be used. Edited values SHALL pass the same validation as the original proposal.

#### Scenario: Rename before creating
- **WHEN** the person clicks Edit, changes "Pricing page" to "Pricing page v2" and clicks "Create 3 tasks"
- **THEN** the created task is titled "Pricing page v2"

#### Scenario: Empty title rejected
- **WHEN** the person clears a title and clicks Approve
- **THEN** the card shows a validation error and nothing is written

### Requirement: Approve commits once
Approve SHALL re-validate the proposal against the person's current permissions and the current data, then apply all of its changes together or none of them. A proposal SHALL be committed at most once, even if Approve is sent twice. After commit, the card SHALL turn to the approved state ("3 tasks created", "Approved by Alex Kim at 14:03", link "View in Agent log"), the tool chip SHALL show the rows written and timing, the new or changed cards SHALL be highlighted on the board, and the assistant SHALL confirm the result in a new message.

#### Scenario: Successful approval
- **WHEN** the person clicks "Create 3 tasks"
- **THEN** WEB-26, WEB-27 and WEB-28 exist in Website relaunch with the "via assistant" tag, and the assistant replies with the created keys

#### Scenario: Permissions changed before approval
- **WHEN** a proposal was made as Admin for Mobile beta, the person switches to Member, then clicks Approve
- **THEN** the commit is refused, nothing is written, and the card shows the access error

#### Scenario: Double click
- **WHEN** Approve is sent twice for the same proposal
- **THEN** the changes are applied once

### Requirement: Cancel
Cancel SHALL discard the proposal without writing anything. The card SHALL turn to the cancelled state (rows faded and struck through, "Cancelled by Alex Kim · nothing was written") and the assistant SHALL confirm that nothing changed.

#### Scenario: Cancel a batch
- **WHEN** the person cancels a 9-task status change
- **THEN** no task changes and the run is logged as Cancelled

### Requirement: Decision is visible to the assistant
The outcome of every proposal (approved with results, cancelled, or failed) SHALL be part of the conversation the assistant sees on later turns.

#### Scenario: Follow-up after approval
- **WHEN** after approving three new tasks the person says "assign them to Tomás"
- **THEN** the assistant proposes assigning WEB-26, WEB-27 and WEB-28 to Tomás García
