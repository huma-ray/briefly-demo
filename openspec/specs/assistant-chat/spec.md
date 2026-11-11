# assistant-chat Specification

## Purpose

Defines the assistant panel: streaming conversation, the tool catalogue, permission-scoped tool execution, how results are rendered, mentions, conversation history, usage limits and error handling.

## Requirements

### Requirement: Streaming conversation
The assistant panel SHALL send the person's message with the current project as context and stream the reply token by token. The header SHALL show "Assistant", the active model id badge, a History button and a close button. A context bar SHALL read "Acting as <name> · <role> · can see <n> of <m> projects" (or "can see all <m> projects"). Messages SHALL be laid out as in the design: user bubbles on the right, assistant messages with mark, name and time.

#### Scenario: Streamed reply
- **WHEN** the person asks "What's due this week?"
- **THEN** the reply starts appearing before it is complete, and the send button is disabled until it finishes or the person stops it

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

### Requirement: Tools run with the requester's permissions
Every tool SHALL read and write with the requesting person's own permissions, never with elevated rights. Data from projects the person cannot see SHALL never be sent to the model. When the person names a project they cannot open, the tool SHALL report that access is denied and the assistant SHALL explain the limit.

#### Scenario: Member asks for everything
- **WHEN** a Member asks "What's overdue across all projects?"
- **THEN** only overdue tasks from WEB and ONB are returned, and the reply shows the note "Filtered to your access: 2 of 3 projects searched."

#### Scenario: Member asks for a hidden project
- **WHEN** a Member asks "Show me everything in Mobile beta"
- **THEN** the assistant says the person has no access to Mobile beta, no Mobile beta data reaches the model, and the run is logged as "Blocked by access"

#### Scenario: Same question as Admin
- **WHEN** the person switches to Admin and asks the same overdue question
- **THEN** overdue tasks from all three projects are returned

### Requirement: Tool call rendering
Each tool call SHALL appear in the assistant message as a collapsible chip with status icon (done, waiting, failed, cancelled), the tool name with "× n" for batches, a result summary (for example "2 rows · 412 ms" or "waiting for approval") and the arguments as formatted JSON when expanded. Task results SHALL be rendered as compact task rows (status, key, title, due pill, avatar) that open the task when clicked.

#### Scenario: Read tool chip
- **WHEN** `list_overdue` returns two tasks
- **THEN** the chip reads `list_overdue` with "2 rows · <duration>", and two task rows follow the assistant text

### Requirement: Composer
The composer SHALL offer suggestion chips ("Summarize this project", "What's due this week?", and one assign suggestion using a real unassigned task and teammate), a text box where Enter sends and Shift+Enter adds a new line, the current project pill, an `@` button that inserts a visible person or task, and the note "Changes always ask for approval first · 20 requests a day in the demo".

#### Scenario: Mention a task
- **WHEN** the person clicks `@`, types "red" and picks WEB-25
- **THEN** "WEB-25" is inserted at the cursor

### Requirement: Conversation history
Conversations SHALL be saved per person. History SHALL list the person's past conversations by first message and date; picking one SHALL reload its messages, tool chips and approval cards in their final state. A new conversation SHALL be startable from History.

#### Scenario: Reopen a conversation
- **WHEN** the person reloads the page and opens yesterday's conversation from History
- **THEN** the messages appear with approved and cancelled cards shown as approved and cancelled

### Requirement: Honest failure reporting
When a tool fails, the assistant SHALL state what failed and what was not done, and SHALL NOT invent data or claim success. When the model provider fails, the panel SHALL show an error message with a Retry action.

#### Scenario: Tool error
- **WHEN** a tool returns an error
- **THEN** the chip shows the failed state with the error, and the reply says nothing was changed

#### Scenario: Provider outage
- **WHEN** the model provider returns an error or times out
- **THEN** the panel shows "The assistant is unavailable right now." with Retry, and the run is logged as an error

### Requirement: Demo usage limits
Each visitor SHALL be limited to 20 assistant requests per KST day, and all visitors together to $10 of model spend per calendar month. A request over either limit SHALL NOT reach the model and SHALL get a demo message that names the limit and when it resets.

#### Scenario: Daily limit reached
- **WHEN** a visitor sends their 21st request of the day
- **THEN** the panel shows "Demo limit reached: 20 requests a day. It resets at 00:00 KST." and no model call is made

#### Scenario: Monthly cap reached
- **WHEN** this month's recorded spend has reached $10
- **THEN** every visitor gets the demo message about the monthly cap and no model call is made

### Requirement: Custom model endpoint
An Admin SHALL be able to point the workspace's assistant at their own OpenAI-compatible endpoint (for example a self-hosted vLLM or LiteLLM server) by entering a base URL, a model id and an optional API key from the assistant header's model badge, and SHALL be able to go back to the default provider. Members SHALL see the active model but SHALL NOT be able to change it; this SHALL be enforced by the database. The API key SHALL be stored encrypted on the server, SHALL never be sent back to the browser, and SHALL be shown only as its last four characters. A "Test connection" action SHALL report whether the endpoint answers, whether the model exists and whether it returns tool calls. While a custom endpoint is active the assistant SHALL use it for every member of the workspace, the model badge and Agent log SHALL show its model id, its runs SHALL be recorded with tokens and zero cost, and the daily request limit SHALL still apply; only default-provider spend SHALL count toward the monthly cap.

#### Scenario: Admin connects a self-hosted model
- **WHEN** an Admin enters `https://llm.example.com/v1`, model `deepseek-v4-flash` and a key, runs Test connection and saves
- **THEN** the test reports the endpoint, model and tool calling as working, the badge shows `deepseek-v4-flash`, and the next question is answered by that endpoint

#### Scenario: Member cannot change the provider
- **WHEN** a Member opens the model badge or sends a hand-crafted save request
- **THEN** the settings are read-only in the UI and the save is rejected

#### Scenario: Key is write-only
- **WHEN** the settings are loaded in the browser after saving a key
- **THEN** only the last four characters of the key are present in the page

#### Scenario: Internal address rejected
- **WHEN** an Admin enters a URL that resolves to a loopback, private or link-local address (for example `http://169.254.169.254/` or `http://localhost:4000/v1`) on a deployment that does not allow private endpoints
- **THEN** saving and testing are refused with a message and no request is sent to that address

#### Scenario: Custom endpoint fails
- **WHEN** the custom endpoint is down or rejects the key
- **THEN** the panel shows "The assistant is unavailable right now." with the endpoint's reason, offers Retry, and the run is logged as an error

#### Scenario: Daily limit still applies
- **WHEN** a visitor using a custom endpoint sends their 21st request of the day
- **THEN** they get the daily demo-limit message and no model call is made

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
