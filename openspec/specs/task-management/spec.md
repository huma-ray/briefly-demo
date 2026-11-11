# task-management Specification

## Purpose

Defines the project and task model and every non-assistant way to see and change tasks: board, list, drag and drop, task editing, My tasks, search, filter and display options. All of it works with the assistant closed.

## Requirements

### Requirement: Task model
A task SHALL belong to exactly one project and SHALL have: a key made of the project key and a per-project number (for example `WEB-18`) that never changes or repeats, a required title, an optional description, a status (Todo, In progress, Done), a priority (No priority, Low, Medium, High, Urgent), an optional label, an optional due date, an optional assignee who is a member of the project, and its position within its status column.

#### Scenario: Sequential keys
- **WHEN** a task is created in `WEB` whose highest existing number is 25
- **THEN** it receives key `WEB-26`

#### Scenario: Assignee must be a project member
- **WHEN** someone tries to assign a `WEB` task to a person who is not a member of `WEB`
- **THEN** the change is rejected with a readable error

### Requirement: Overdue tasks
A task SHALL be overdue when its due date is before today in the workspace time zone (Asia/Seoul) and its status is not Done. Overdue due dates SHALL be shown with the danger style.

#### Scenario: Done tasks are never overdue
- **WHEN** a Done task has a due date in the past
- **THEN** its due pill uses the normal style

### Requirement: Board view
The board SHALL show three columns (Todo, In progress, Done) with status icon, name, count and an add button. Each card SHALL show status icon, key, "via assistant" tag when the last change came from the assistant, assignee avatar (dashed when unassigned), title, priority icon, due pill and label pill. Todo and In progress columns SHALL end with a "New task" ghost button. Done cards SHALL show the title in the muted colour. The toolbar SHALL show Filter, Display, the visible task count and the New task button.

#### Scenario: Board content
- **WHEN** a Member opens Website relaunch in a fresh sandbox
- **THEN** the board shows 4 Todo, 3 In progress and 4 Done tasks and the toolbar reads "11 tasks"

### Requirement: Drag and drop
A person SHALL be able to move a card to another column and reorder it within a column with mouse, touch or keyboard. A move SHALL persist, change the status when the column changes, and be recorded in the activity feed. A failed move SHALL return the card to its previous place and show an error.

#### Scenario: Move to Done
- **WHEN** a person drags WEB-21 from In progress to Done
- **THEN** WEB-21 shows as Done after reload and the activity feed records the status change by that person

#### Scenario: Keyboard move
- **WHEN** a person focuses a card, picks it up with Space, moves it with arrow keys and drops it with Space
- **THEN** the card moves exactly as with the mouse

### Requirement: List view
The list SHALL group tasks under Todo, In progress and Done headers with counts. Each row SHALL show status icon, key, title with "via assistant" tag when applicable, label pill, due pill and assignee avatar. Below 640px main width the label column SHALL be hidden.

#### Scenario: Same data as board
- **WHEN** the person switches from Board to List
- **THEN** the same tasks appear, grouped by status, with the same count

### Requirement: Create and edit tasks
A person SHALL be able to create a task with New task (toolbar, column add button or ghost button, with the column's status preselected), and open any task to edit every field. Tasks SHALL open in a centred modal: the project and key as breadcrumbs; on the left the title (large, editable in place), the description and, for existing tasks, the task's activity history newest first with "via assistant" tags; on the right a status button and a Details panel with Assignee, Priority, Label, Due date and Project, each opening a styled menu or date picker, plus when the task was created and last updated. Changes SHALL be saved only with Save (or `⌘↵`); while there are unsaved changes the footer SHALL say so and offer Discard. The modal SHALL have an "Ask assistant" button (see "Ask about a task"). Invalid input (for example an empty title) SHALL be rejected with a message next to the field. On phone widths the two columns SHALL stack.

#### Scenario: Create from column
- **WHEN** a person clicks the add button on In progress and saves the title "QA checklist"
- **THEN** a new In progress task with the next key appears in that column

#### Scenario: Edit description
- **WHEN** a person opens WEB-22, changes the description and saves
- **THEN** the description persists and the activity feed records the change

#### Scenario: Unsaved changes
- **WHEN** a person changes the priority of WEB-18 in the modal
- **THEN** the footer shows "Unsaved changes" with Discard and an enabled "Save changes", and closing without saving leaves the task unchanged

#### Scenario: Task history in the modal
- **WHEN** a person opens a task the assistant assigned earlier
- **THEN** the Activity section lists that assignment with the "via assistant" tag

### Requirement: My tasks
My tasks SHALL list, grouped by status, every task assigned to the current person across all projects they can see. The sidebar SHALL show the count of their tasks that are not Done.

#### Scenario: Count matches list
- **WHEN** the sidebar shows "My tasks 4"
- **THEN** My tasks lists 4 tasks that are not Done

### Requirement: Search
Search (sidebar button, `⌘K` / `Ctrl+K`) SHALL open a command palette that finds visible tasks by key or title and projects by name, and opens the chosen item.

#### Scenario: Search by key
- **WHEN** the person types "WEB-25" and presses Enter
- **THEN** task WEB-25 opens

#### Scenario: Hidden project not searchable
- **WHEN** a Member searches for "Mobile"
- **THEN** no Mobile beta project or task is returned

### Requirement: Filter
Filter SHALL narrow the board, list and My tasks by assignee (including Unassigned), priority and label. Active filters SHALL be reflected in the URL and in the task count.

#### Scenario: Filter by assignee
- **WHEN** the person filters by Alex Kim on the Website relaunch board
- **THEN** only tasks assigned to Alex Kim show and the count updates

### Requirement: Display options
Display SHALL let the person show or hide priority, due date, label and assignee on cards and rows. The choice SHALL be remembered in that browser.

#### Scenario: Hide labels
- **WHEN** the person turns off Label in Display and reloads
- **THEN** cards and rows still show no label pills

### Requirement: Assistant activity on the board
Above the board columns a single line SHALL show the latest assistant-made changes in the current project (up to three, newest first), each with the action, task key, who approved it and the time, for example "Assistant created WEB-26 · approved by Alex Kim · 14:03". Clicking an entry SHALL open that task. The line SHALL be hidden when the project has no assistant-made changes. Only changes the person can see SHALL be shown.

#### Scenario: After an approval
- **WHEN** the person approves the assistant's three launch tasks and returns to the Website relaunch board
- **THEN** the line shows the three creations with "approved by Alex Kim"

#### Scenario: No assistant changes yet
- **WHEN** a project has no assistant-made changes
- **THEN** the line is not shown

### Requirement: Ask about a task
Each board card and list row SHALL show a small assistant icon on hover or keyboard focus, and the task modal SHALL have an "Ask assistant" button. Either SHALL open the assistant panel with that task attached to the composer as a context chip (see the assistant-chat capability's "Task context"), without changing the task.

#### Scenario: From the board
- **WHEN** the person hovers WEB-22 on the board and clicks its assistant icon
- **THEN** the assistant panel opens with a "WEB-22 · Write hero and value-prop copy" chip in the composer

#### Scenario: From the modal
- **WHEN** the person clicks "Ask assistant" in the WEB-18 modal
- **THEN** the modal closes and the panel opens with the WEB-18 chip attached
