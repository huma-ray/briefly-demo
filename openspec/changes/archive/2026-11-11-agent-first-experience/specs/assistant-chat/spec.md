## MODIFIED Requirements

### Requirement: Tool catalogue
The assistant SHALL have exactly these tools, each with a strict input schema that rejects unknown or malformed arguments:
- `list_tasks` (read): tasks of a project, optionally by status, assignee, label, due-date range (inclusive `YYYY-MM-DD` bounds) and open only (leaving out Done). With a due-date range the rows SHALL be in due-date order.
- `list_overdue` (read): overdue tasks across visible projects or one project.
- `summarize_project` (read): a project's tasks and recent activity for the assistant to summarize.
- `get_task` (read): one task by key with its full fields and its activity history.
- `create_task` (write): one or more tasks with title, project, and optional status, priority, label, due date, assignee, description.
- `update_task_status` (write): one or more tasks to a new status.
- `assign_task` (write): one or more tasks to a person or to nobody.

People and projects in arguments SHALL be accepted by name, key or id and resolved to exactly one visible match, or the tool SHALL fail with the list of candidates. Every task a read tool returns is shown to the person, so the assistant SHALL be instructed to pass filters that make the rows the answer rather than fetching a whole project and choosing in text.

#### Scenario: Batch create
- **WHEN** the person asks for three launch tasks due Friday
- **THEN** the assistant makes one `create_task` call with three tasks and an approval card, not three separate cards

#### Scenario: Ambiguous person
- **WHEN** the person asks to assign WEB-25 to "Sam" and no member matches
- **THEN** the tool fails with "no workspace member matches \"sam\"", the assistant says so and asks who to assign, and nothing is written

#### Scenario: Due this week
- **WHEN** the person asks "What's due this week?" on Wednesday 2026-11-11
- **THEN** `list_tasks` is called with `due_from` 2026-11-09, `due_to` 2026-11-15 and open only, and the rows shown are exactly the open tasks due that week

#### Scenario: Invalid date
- **WHEN** `list_tasks` receives `due_from` "next friday"
- **THEN** the tool fails with a message asking for `YYYY-MM-DD` and nothing is read

## ADDED Requirements

### Requirement: Task context
The composer SHALL accept one attached task, shown as a removable chip with the task's key and title above the text box (or above the fixed questions in scripted mode). While a task is attached, each request SHALL carry only its key; the server SHALL load the task through the person's own permissions and give the assistant its fields, and SHALL refuse the request with "You don't have access to that task." when the person cannot see it, without revealing anything about it. Removing the chip SHALL return the composer to normal. In scripted mode the fixed questions SHALL switch to questions about the attached task:
- Summarize WEB-22 (reads the task and its activity with `get_task`)
- Move WEB-22 to <the next status> (an `update_task_status` approval card; Done tasks offer "Move WEB-22 back to Todo")
- Assign WEB-22 to me (an `assign_task` approval card; left out when the task is already the person's)

#### Scenario: Ask about an attached task
- **WHEN** WEB-22 is attached and the person asks "What is this blocked on?"
- **THEN** the assistant answers using WEB-22's fields and activity without the person typing the key

#### Scenario: Task the person cannot see
- **WHEN** a Member's request carries the key of a Mobile beta task
- **THEN** the request is refused with "You don't have access to that task." and no task data reaches the model

#### Scenario: Scripted task question
- **WHEN** WEB-22 (Todo) is attached in scripted mode and the visitor clicks "Move WEB-22 to In progress"
- **THEN** an approval card proposes moving WEB-22 to In progress, and nothing changes until they approve

#### Scenario: Remove the chip
- **WHEN** the person removes the WEB-22 chip
- **THEN** the composer shows the general questions or plain text box again and later requests carry no task
