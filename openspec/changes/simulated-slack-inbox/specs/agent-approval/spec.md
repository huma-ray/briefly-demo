## ADDED Requirements

### Requirement: Reply approval card
A `reply_in_thread` proposal SHALL render as an approval card headed "Reply in #channel (simulated)" showing the thread's first words, the reply text and, when the reply is not in English, its English meaning, with the note "Nothing is posted until you approve." and the buttons "Post reply", Edit and Cancel. Edit SHALL make the reply text editable; an empty reply SHALL be rejected. Approving SHALL, at most once and all or nothing, add the reply to the simulated thread as the approving person and mark the thread as done; the card SHALL then show "Reply posted to the simulated thread" and the conversation SHALL get a confirmation message. The commit SHALL run with the person's own permissions, so a thread outside their sandbox cannot be replied to. The proposal SHALL appear in the Approvals queue like any other.

#### Scenario: Post a Korean reply
- **WHEN** the person approves a Korean reply to `#partner-kr`
- **THEN** the reply appears as the last message of that thread with Alex Kim as author, the thread shows Done, and the Slack tab count drops by one

#### Scenario: Edit before posting
- **WHEN** the person clicks Edit, changes the reply text and clicks "Post reply"
- **THEN** the edited text is what appears in the thread

#### Scenario: Cancel
- **WHEN** the person cancels the card
- **THEN** nothing is added to the thread and it still waits for a reply

#### Scenario: From the queue
- **WHEN** the person posts the reply from the Approvals page
- **THEN** the result is the same as approving in the chat
