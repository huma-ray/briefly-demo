# app-shell Specification

## Purpose

Defines the application frame of Briefly: the sidebar, main view and assistant columns, their responsive behaviour, shortcuts, the demo strip, and fidelity to `docs/Briefly Workspace.html`, which is the visual source of truth.

## Requirements

### Requirement: Visual fidelity to the design file
The application SHALL reproduce the layout, spacing, typography (Geist UI and Geist Mono), colour tokens, iconography, component shapes and English UI copy of `docs/Briefly Workspace.html`. The application SHALL use the light theme only. The accent colour SHALL be used only for assistant surfaces and primary actions.

#### Scenario: Side-by-side comparison
- **WHEN** the board view with the sample workspace is shown at 1440px width next to the design file
- **THEN** the column widths (224px sidebar, flexible main, 344px assistant), header heights, card anatomy, pills, avatars and colours match the design

#### Scenario: Dark OS preference
- **WHEN** the visitor's operating system prefers a dark colour scheme
- **THEN** the application still renders the light theme

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

### Requirement: Responsive drawers
Below 1200px viewport width the assistant panel SHALL become a right-hand drawer over a scrim and SHALL start closed. Below 760px the sidebar SHALL also become a left-hand drawer opened by a menu button, the assistant drawer SHALL take the full width, and the header SHALL wrap as in the design. `Escape` or a scrim click SHALL close open drawers. The page SHALL not scroll horizontally at 375px width.

#### Scenario: Tablet width
- **WHEN** the viewport is 1024px wide and the visitor opens the assistant
- **THEN** the assistant slides in as a drawer over a scrim, and clicking the scrim closes it

#### Scenario: Phone width
- **WHEN** the viewport is 375px wide
- **THEN** the sidebar is hidden behind the menu button, the board shows a single column, and there is no horizontal page scroll

### Requirement: Demo strip
The main area SHALL show the strip with a "Demo" tag, the text "Sample workspace. Data resets every night at 03:00 KST." and a link to the public source repository.

#### Scenario: Strip visible on every view
- **WHEN** the visitor opens Board, List, Agent log, Inbox or My tasks
- **THEN** the demo strip is shown below the header

### Requirement: Reduced motion
The application SHALL disable animations and transitions when the visitor prefers reduced motion.

#### Scenario: Fresh-card highlight with reduced motion
- **WHEN** reduced motion is preferred and the assistant creates tasks
- **THEN** the new cards appear without the highlight animation

### Requirement: Resizable assistant panel
At desktop width the assistant panel SHALL be resizable by dragging its left edge, between 300px and 640px, never leaving the main area narrower than 480px. The edge SHALL be a focusable separator that the arrow keys resize in 16px steps; double-clicking it SHALL restore the default 344px. The chosen width SHALL be remembered in the browser. Below 1200px, where the panel is a drawer, the edge SHALL not be shown.

#### Scenario: Drag to widen
- **WHEN** the visitor drags the panel edge 200px to the left
- **THEN** the panel is 200px wider and keeps that width after a reload

#### Scenario: Keyboard resize and reset
- **WHEN** the visitor focuses the edge, presses ← once, then double-clicks it
- **THEN** the panel first grows by 16px and then returns to 344px
