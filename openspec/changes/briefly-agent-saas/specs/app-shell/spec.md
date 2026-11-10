## Purpose

Defines the application frame of Briefly: the sidebar, main view and assistant columns, their responsive behaviour, shortcuts, the demo strip, and fidelity to `docs/Briefly Workspace.html`, which is the visual source of truth.

## ADDED Requirements

### Requirement: Visual fidelity to the design file
The application SHALL reproduce the layout, spacing, typography (Geist UI and Geist Mono), colour tokens, iconography, component shapes and English UI copy of `docs/Briefly Workspace.html`. The application SHALL use the light theme only. The accent colour SHALL be used only for assistant surfaces and primary actions.

#### Scenario: Side-by-side comparison
- **WHEN** the board view with the sample workspace is shown at 1440px width next to the design file
- **THEN** the column widths (224px sidebar, flexible main, 344px assistant), header heights, card anatomy, pills, avatars and colours match the design

#### Scenario: Dark OS preference
- **WHEN** the visitor's operating system prefers a dark colour scheme
- **THEN** the application still renders the light theme

### Requirement: Three-column shell
The application SHALL present a sidebar, a main area and an assistant panel as peers in one shell. The sidebar SHALL contain: the workspace button, Search with `⌘K` hint, the Inbox, My tasks and Agent log navigation items with counts, a Projects section listing visible projects with colour square and key, and the current person with name and role. The main header SHALL contain breadcrumbs (project › view), Board / List / Agent log tabs, the View as Member / Admin segmented control and the Assistant toggle button with `⌘J` hint.

#### Scenario: Admin-only project marker
- **WHEN** the current role is Admin and the workspace has a project the person is not a member of
- **THEN** that project appears in the sidebar with an "admin" tag

#### Scenario: Member sidebar
- **WHEN** the current role is Member
- **THEN** only projects the person is a member of appear in the sidebar

### Requirement: Assistant panel toggle
The assistant panel SHALL open and close with the Assistant button, its close button and the `⌘J` / `Ctrl+J` shortcut. When closed at desktop width, the main area SHALL take the freed space.

#### Scenario: Keyboard toggle
- **WHEN** the visitor presses `⌘J` while the panel is open
- **THEN** the panel closes and the Assistant button shows its unpressed state

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
