## Purpose

Records every assistant turn (what was asked, which tools ran with which arguments, the outcome, tokens, cost and latency) and presents it on the Agent log page, so the cost and behaviour of the agent are measured, not claimed.

## ADDED Requirements

### Requirement: Run recording
Every assistant request SHALL be recorded as a run with: id, time, person and their role at the time, the request text, the model id, input and output tokens, cost in USD computed from the model's published per-token prices, total latency, and each tool call with its name, arguments, result or error, row count and duration. Requests refused by a demo limit SHALL be recorded with zero tokens and cost. Runs SHALL be readable under the same project visibility rules as tasks and SHALL NOT be editable by people.

#### Scenario: Read run recorded
- **WHEN** the person asks "What's overdue across all projects?"
- **THEN** a run is stored with `list_overdue`, its arguments, "2 rows", token counts, cost and latency

### Requirement: Run result
Each run SHALL have one result: Awaiting approval, Approved, Cancelled, Read only, Blocked by access or Tool error. Blocked by access SHALL win when a tool was denied for access; Tool error when any tool failed; otherwise the approval outcome for write runs and Read only for runs without writes. The result SHALL update when a pending proposal is approved or cancelled.

#### Scenario: Result follows the card
- **WHEN** a run is Awaiting approval and the person clicks Approve
- **THEN** the run's result becomes Approved and records the approver and the approval wait time

### Requirement: Agent log page
The Agent log page SHALL show the title, the explanation line, a range control (Today, 7 days, 30 days), person and tool filters, four stats (runs and distinct people; tool calls split into reads and writes; write approval rate with "n of m write requests approved"; spend for the range and month-to-date spend against the $10 monthly cap), and a runs table with time (KST), person with role, request (truncated, full text on hover), tools, result pill, tokens in / out, cost to four decimals, and latency in seconds. A caption SHALL state how many runs are shown out of the total.

#### Scenario: Filter by tool
- **WHEN** the person picks the tool filter `create_task`
- **THEN** only runs that called `create_task` are listed and the stats reflect the filtered runs

#### Scenario: Empty log
- **WHEN** a fresh sandbox has no runs
- **THEN** the page shows an empty state that suggests opening the assistant, and the stats show zeros

### Requirement: Run detail
Selecting a run (click or Enter) SHALL show a detail panel with run id and result pill, the request, person and role, model, tokens, cost, latency, a trace of steps (request received, planned with the model, tool call prepared, then the outcome-specific steps such as waiting for approval, approved by and written to database with rows and time, permission filter applied, tool returned an error, cancelled by, reply streamed) and the arguments as formatted JSON. The newest run SHALL be selected by default. Below 900px main width the panel SHALL move under the table.

#### Scenario: Blocked run detail
- **WHEN** the person selects a Blocked by access run
- **THEN** the trace shows "Permission filter applied" with "Member has no access to MOB · 0 rows" and "no data from MOB was sent to the model"

### Requirement: Visibility of runs
An Admin SHALL see all runs in the workspace. A Member SHALL see only their own runs.

#### Scenario: Member log
- **WHEN** a Member opens the Agent log
- **THEN** only runs requested by that person are listed
