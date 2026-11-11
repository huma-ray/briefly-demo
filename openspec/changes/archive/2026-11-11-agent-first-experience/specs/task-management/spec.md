## MODIFIED Requirements

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

## ADDED Requirements

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
