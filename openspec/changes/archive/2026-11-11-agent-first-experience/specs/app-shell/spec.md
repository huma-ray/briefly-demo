## MODIFIED Requirements

### Requirement: Three-column shell
The application SHALL present a sidebar, a main area and an assistant panel as peers in one shell. The sidebar SHALL contain: the workspace button, Search with `⌘K` hint, the Today, Inbox, My tasks, Approvals and Agent log navigation items (Inbox, My tasks and Approvals with counts), a Projects section listing visible projects with colour square and key, and the current person with name and role. The main header SHALL contain breadcrumbs (project › view), Board / List / Agent log tabs and the View as Member / Admin segmented control. The header SHALL NOT change its layout when the assistant panel opens or closes.

#### Scenario: Admin-only project marker
- **WHEN** the current role is Admin and the workspace has a project the person is not a member of
- **THEN** that project appears in the sidebar with an "admin" tag

#### Scenario: Member sidebar
- **WHEN** the current role is Member
- **THEN** only projects the person is a member of appear in the sidebar

#### Scenario: Approvals count
- **WHEN** the person has two undecided proposals in any conversation
- **THEN** the Approvals item shows 2, and the count drops to 1 after one of them is approved or cancelled

### Requirement: Assistant panel toggle
The assistant panel SHALL open with a floating "Ask assistant" button in the bottom-right corner of the window and with the `⌘J` / `Ctrl+J` shortcut, and SHALL close with its own close button and the same shortcut. The floating button SHALL be shown only while the panel is closed, and on phone widths SHALL show only its icon. When the panel is closed at desktop width, the main area SHALL take the freed space.

#### Scenario: Keyboard toggle
- **WHEN** the visitor presses `⌘J` while the panel is open
- **THEN** the panel closes and the floating button appears

#### Scenario: Header stays put
- **WHEN** the visitor opens and closes the panel repeatedly
- **THEN** no header control moves

## ADDED Requirements

### Requirement: Resizable assistant panel
At desktop width the assistant panel SHALL be resizable by dragging its left edge, between 300px and 640px, never leaving the main area narrower than 480px. The edge SHALL be a focusable separator that the arrow keys resize in 16px steps; double-clicking it SHALL restore the default 344px. The chosen width SHALL be remembered in the browser. Below 1200px, where the panel is a drawer, the edge SHALL not be shown.

#### Scenario: Drag to widen
- **WHEN** the visitor drags the panel edge 200px to the left
- **THEN** the panel is 200px wider and keeps that width after a reload

#### Scenario: Keyboard resize and reset
- **WHEN** the visitor focuses the edge, presses ← once, then double-clicks it
- **THEN** the panel first grows by 16px and then returns to 344px
