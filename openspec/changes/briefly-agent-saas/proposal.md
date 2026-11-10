## Why

"Add an AI agent to our SaaS" is the most common shape of the job posts we answer, and there is no demo to point at. Briefly is a deliberately boring team task tracker (about 10% of Trello/Linear) whose real subject is the assistant inside it: the client should see an agent that streams, calls typed tools, asks before it writes, obeys the caller's permissions, and logs what every turn cost. The ORBIT post spelled this out and asked for the approval step by name.

The visual target is fixed: `docs/Briefly Workspace.html`. The build reproduces that layout, density, tokens and copy exactly. Its behaviour is static mock data; the build makes it real.

## What Changes

- New greenfield Next.js (16.x, App Router) + TypeScript app, Tailwind + shadcn/ui themed to the design's tokens (Geist / Geist Mono, light theme only, iris accent reserved for the assistant and primary actions).
- **App shell** exactly as designed: sidebar | main | assistant columns, chat becomes a drawer below 1200px, sidebar becomes a drawer below 760px, `⌘J` toggles the assistant, demo strip ("Data resets every night at 03:00 KST").
- **Demo access without a login page**: every visitor gets their own anonymous session and their own copy of the "Northwind Studio" sample workspace, playing "Alex Kim". The top-bar **View as Member / Admin** toggle changes that visitor's real role in the database, so the permission story is enforced by Postgres, not by UI.
- **Task management**: Workspace → Project (with key, e.g. `WEB`) → Task (`WEB-18`): title, description, status (Todo / In progress / Done), priority, label, due date, assignee. Board (drag and drop between and within columns) and grouped List views, New task, task detail editing, My tasks, Search `⌘K`, Filter (assignee / priority / label), Display (which card fields show).
- **Activity feed** (sidebar "Inbox", unread count): who changed what and when; assistant-made changes carry a "via assistant" tag, also shown on cards and rows.
- **Assistant panel**: streaming chat, model badge, "Acting as … can see N of M projects" context bar, collapsible tool-call chips with arguments and timing, inline task rows in answers, scope note, suggestion chips, project context pill, `@` mention of people and tasks, conversation history.
- **Tools** (each with a Zod schema): reads `list_tasks`, `list_overdue`, `summarize_project`; writes `create_task` (one or many), `update_task_status`, `assign_task`.
- **Approval step**: every write is shown as a card ("Approve 3 new tasks") with Approve / Edit (task titles editable in place) / Cancel; nothing is written before Approve; approved or cancelled state stays visible in the thread and links to the Agent log.
- **Permission filter**: tools run with the requesting user's session; a Member asking for everything sees only their projects, and asking for a project they cannot open is reported as blocked without sending its data to the model.
- **Agent log page**: stats (runs, tool calls reads/writes, write approval rate, spend vs monthly cap), runs table (time, person, request, tools, result, tokens in/out, cost, latency) filterable by range / person / tool, and a run detail panel with trace steps and arguments.
- **Failure flows**: a failed tool is reported, not guessed around; a per-visitor limit of 20 requests a day and a $10 monthly spend cap end in a clear demo message.
- **Custom model endpoint**: an Admin can switch the assistant to their own OpenAI-compatible endpoint (base URL, model, API key) from the model badge, e.g. a self-hosted vLLM/LiteLLM server; the key is stored encrypted and never returned to the browser; the daily request limit still applies.
- **Operations**: nightly Vercel cron removes all sandboxes (fresh copy on next visit); provider swap (OpenAI default, Claude alternative) in one file, documented in README; deployed on Vercel + Supabase.

## Capabilities

### New Capabilities
- `app-shell`: three-column layout, responsive drawers, keyboard shortcuts, demo strip and visual fidelity to the design file.
- `workspace-access`: anonymous demo sessions, per-visitor sandbox workspace, Admin/Member roles, View-as toggle, project membership enforced in the database, nightly reset.
- `task-management`: projects and tasks, board and list views, drag and drop, task create/edit, My tasks, search, filter, display options.
- `activity-feed`: change history for every task mutation, "via assistant" attribution, Inbox with unread count.
- `assistant-chat`: chat panel, streaming replies, tool catalogue and schemas, permission-scoped tool execution, result rendering, mentions, history, limits and error flows.
- `agent-approval`: approval cards for every write tool call, edit-before-approve, cancel, server-side re-validation and commit.
- `agent-log`: per-turn recording of tools, arguments, results, tokens, cost and latency, and the Agent log page.

### Modified Capabilities
(none, greenfield project)

## Impact

- New repository content: Next.js app, Supabase migrations (schema, RLS policies, seed template, sandbox functions), `vercel.json` cron, README.
- Dependencies: `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`, `ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `zod`, shadcn/ui primitives, `@dnd-kit` for accessible drag and drop.
- External services: Supabase project with anonymous sign-ins enabled, OpenAI API key (or Anthropic key after the one-file swap), Vercel project with `CRON_SECRET`.
- No FastAPI or Python; the whole project is TypeScript.
