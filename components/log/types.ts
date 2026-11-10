export type Call = {
  name: string;
  kind: string;
  args: unknown;
  result: unknown;
  error: string | null;
  status: string;
  rows: number | null;
  duration_ms: number | null;
};

export type Run = {
  id: string;
  shortId: string;
  memberId: string;
  role: string;
  prompt: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latencyMs: number;
  result: "await" | "approved" | "cancelled" | "read" | "blocked" | "error";
  error: string | null;
  approverId: string | null;
  approvalWaitMs: number | null;
  createdAt: string;
  calls: Call[];
};

export const RESULT_LABEL: Record<Run["result"], string> = {
  approved: "Approved",
  read: "Read only",
  blocked: "Blocked by access",
  error: "Tool error",
  cancelled: "Cancelled",
  await: "Awaiting approval",
};

export const toolSummary = (calls: Call[]) => {
  const n = new Map<string, number>();
  for (const c of calls) n.set(c.name, (n.get(c.name) ?? 0) + 1);
  return [...n].map(([k, v]) => (v > 1 ? `${k} × ${v}` : k)).join(", ");
};
