// Shared contract between the agent backend (lib/agent/*, app/api/chat, app/actions/agent.ts)
// and the assistant panel UI (components/assistant/*). Change both sides together.
import type { UIMessage } from "ai";
import type { Status } from "@/lib/model";

export const READ_TOOLS = ["list_tasks", "list_overdue", "summarize_project"] as const;
export const WRITE_TOOLS = ["create_task", "update_task_status", "assign_task"] as const;
export type ReadTool = (typeof READ_TOOLS)[number];
export type WriteTool = (typeof WRITE_TOOLS)[number];
export type ToolName = ReadTool | WriteTool;

/** Compact task row rendered inline in assistant messages ("mini rows"). */
export type MiniTask = {
  id: string;
  key: string; // "WEB-18"
  title: string;
  status: Status;
  dueDate: string | null; // YYYY-MM-DD
  assigneeId: string | null;
  projectKey: string;
};

/** Every tool failure has this shape; it is also what the model reads. */
export type ToolFailure = {
  ok: false;
  error: string; // human sentence, e.g. 'no workspace member matches "sam"'
  blocked?: boolean; // true when denied for access (run result "Blocked by access")
  project?: string; // blocked only: key of the hidden project (for the Agent log trace)
  candidates?: string[];
  durationMs: number;
};

/** Output of list_tasks / list_overdue / summarize_project. */
export type ReadSuccess = {
  ok: true;
  rows: number;
  durationMs: number;
  tasks: MiniTask[];
  /** Projects searched vs total in the workspace: "Filtered to your access: 2 of 3 projects searched." */
  scope: { searched: number; total: number };
  /** summarize_project only: counts and recent activity lines for the model to summarize. */
  summary?: unknown;
};
export type ReadOutput = ReadSuccess | ToolFailure;

/** One row on an approval card. */
export type PreviewItem = {
  taskId?: string; // existing task (status / assign)
  key?: string; // existing task key
  title: string;
  titleEditable: boolean; // true for create_task rows only
  projectName: string;
  projectColor: number;
  status: Status;
  dueDate: string | null;
  assigneeName: string | null; // null = "Unassigned"
};

export type Proposal = {
  heading: string; // "Approve 3 new tasks" | "Approve 1 status change" | "Approve 2 assignments"
  approveLabel: string; // "Create 3 tasks" | "Update 1 task" | "Assign 2 tasks"
  items: PreviewItem[];
};

export type Decision = {
  status: "approved" | "cancelled" | "failed";
  byName: string;
  at: string; // ISO
  tasks?: { id: string; key: string }[]; // approved: created / changed tasks
  rows?: number;
  durationMs?: number;
  error?: string; // failed
};

/** Output of a write tool. `decision` is added (patched into the stored
 *  conversation) when the person approves, cancels, or the commit fails. */
export type WriteOutput =
  | {
      ok: true;
      status: "pending_approval";
      actionId: string;
      proposal: Proposal;
      note: string; // tells the model nothing was written yet
      decision?: Decision;
    }
  | ToolFailure;

/** Metadata on assistant messages. */
export type MessageMeta = {
  createdAt?: number; // ms epoch
  runId?: string;
  model?: string;
  /** Set on the demo-limit reply: no model was called. */
  limited?: boolean;
};

export type BrieflyMessage = UIMessage<MessageMeta>;

/** POST /api/chat body (the client sends only the newest message; the server
 *  loads history from the conversation row). */
export type ChatRequest = {
  id: string; // conversation id (uuid, generated client-side for a new chat)
  message: BrieflyMessage; // newest user message
  projectKey: string; // project shown in the composer pill
  trigger?: "submit-message" | "regenerate-message";
};

// ---- Server actions in app/actions/agent.ts (implemented by the backend) ----
export type DecideInput = { actionId: string; decision: "approve" | "cancel"; titles?: string[] };
export type DecideResult =
  | { ok: true; decision: Decision; confirmation: BrieflyMessage }
  | { ok: false; error: string; decision?: Decision };
export type ConversationSummary = { id: string; title: string; updatedAt: string };
// export async function decideAction(input: DecideInput): Promise<DecideResult>
// export async function listConversations(): Promise<ConversationSummary[]>
// export async function loadConversation(id: string): Promise<BrieflyMessage[]>
