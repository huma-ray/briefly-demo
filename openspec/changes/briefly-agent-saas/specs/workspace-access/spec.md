## Purpose

Defines how visitors get into the demo, how each visitor's data is isolated, and how Admin and Member roles control what a person can see and change, enforced by the database for both the UI and the assistant.

## ADDED Requirements

### Requirement: Anonymous demo session
The application SHALL NOT have a login or sign-up page. A visitor without a session SHALL be given an anonymous authenticated session automatically on first load. Open registration with email or third-party providers SHALL NOT exist.

#### Scenario: First visit
- **WHEN** a visitor opens the site with no session
- **THEN** an anonymous session is created and the visitor lands on the Website relaunch board without any form

#### Scenario: Returning visitor
- **WHEN** the same browser returns within the same day
- **THEN** the existing session and sandbox are reused

### Requirement: Per-visitor sandbox workspace
On first use, each anonymous visitor SHALL receive a private copy of the sample workspace "Northwind Studio": the projects Website relaunch (`WEB`), Q1 onboarding (`ONB`) and Mobile beta (`MOB`), the labels Copy / Content / SEO / Pricing / Frontend, the teammates Dilnoza Rakhimova, Marcus Lee, Priya Shah and Tomás García, and the sample tasks from the design. The visitor SHALL play "Alex Kim": a Member of `WEB` and `ONB`, not of `MOB`. Seeded tasks assigned to Alex Kim SHALL be assigned to the visitor. No visitor SHALL be able to read or change another visitor's sandbox.

#### Scenario: Isolation between visitors
- **WHEN** visitor A creates a task and visitor B opens their board
- **THEN** visitor B does not see visitor A's task, activity, conversations or agent runs

#### Scenario: Assigned to you
- **WHEN** the visitor opens My tasks in a fresh sandbox
- **THEN** the tasks seeded for Alex Kim (for example WEB-18 and WEB-21) are listed

### Requirement: Roles and project visibility
Each workspace member SHALL have the role Admin or Member. An Admin SHALL see and change every project and task in the workspace. A Member SHALL see and change only projects they belong to, and the tasks, activity and agent runs in those projects. This rule SHALL be enforced by the database for every read and write, whether it comes from the UI or the assistant.

#### Scenario: Member cannot read a foreign project
- **WHEN** a Member requests tasks of `MOB` through any path, including a hand-crafted API request
- **THEN** no `MOB` rows are returned

#### Scenario: Admin sees everything
- **WHEN** the role is Admin
- **THEN** all three projects and their tasks are visible

### Requirement: View-as role toggle
The View as Member / Admin control SHALL change the visitor's own role in their own sandbox and SHALL take effect on the next read without a page reload. The control SHALL only work in sandbox workspaces and only for the visitor's own membership.

#### Scenario: Switch to Admin
- **WHEN** a Member clicks "Admin"
- **THEN** Mobile beta appears in the sidebar with an "admin" tag, the assistant context bar reads "Acting as Alex Kim · Admin · can see all 3 projects", and the person footer reads "Admin · demo account"

#### Scenario: Role is not client-asserted
- **WHEN** a client sends a request that claims an Admin role while the database role is Member
- **THEN** the request is treated as Member

### Requirement: Visible project count
The application SHALL be able to tell a person how many projects they can see out of the workspace total, without exposing any other data about hidden projects.

#### Scenario: Member context
- **WHEN** a Member opens the assistant
- **THEN** the context bar reads "can see 2 of 3 projects"

### Requirement: Nightly reset
All sandboxes and anonymous users SHALL be deleted every night at 03:00 KST by a scheduled job that only a holder of the cron secret can trigger. A visitor arriving after the reset SHALL get a fresh sandbox.

#### Scenario: Unauthorized reset call
- **WHEN** the reset endpoint is called without the cron secret
- **THEN** it responds 401 and deletes nothing

#### Scenario: Visit after reset
- **WHEN** a visitor whose sandbox was deleted reloads the page
- **THEN** they receive a new session and a fresh sample workspace
