## ADDED Requirements

### Requirement: Approvals queue
An Approvals page SHALL list every proposal the person has not decided yet, from all of their conversations, newest first. Each entry SHALL render the same approval card as in the chat (header, rows, Approve / Edit / Cancel) plus the question that produced it, its time and a link that opens that conversation in the assistant panel. Deciding from the queue SHALL follow exactly the same rules as deciding in the chat: the commit runs with the person's current permissions, at most once, all or nothing; the decision and confirmation message are written into the conversation; and the entry leaves the queue. Proposals SHALL appear only to the person who asked for them. When nothing is waiting the page SHALL say so and link to Today.

#### Scenario: Two pending proposals
- **WHEN** the person has an undecided create card in one conversation and an undecided assign card in another
- **THEN** the Approvals page lists both, newest first, each with its question and an "Open conversation" link

#### Scenario: Approve from the queue
- **WHEN** the person clicks "Create 3 tasks" on a queue entry
- **THEN** the tasks are created with the "via assistant" tag, the entry disappears, the Approvals count drops by one, and the original conversation shows the card as approved with the confirmation message

#### Scenario: Decided in two places
- **WHEN** the person approves a proposal in the chat and then clicks Approve on the same proposal in an Approvals page that was already open
- **THEN** nothing is written twice and the queue entry shows the existing decision

#### Scenario: Role changed before deciding
- **WHEN** an Admin's Mobile beta proposal is waiting, the person switches to Member and approves it from the queue
- **THEN** the commit is refused, nothing is written and the card shows the failure

#### Scenario: Empty queue
- **WHEN** nothing is waiting
- **THEN** the page says there is nothing to approve and links to Today
