// Run result classification (spec "Run result"): blocked > error > await > read.
export type CallStatus = "ok" | "error" | "blocked" | "pending";
export type RunResult = "blocked" | "error" | "await" | "read";

export function classifyRun(calls: { status: CallStatus }[], providerError: boolean): RunResult {
  if (calls.some((c) => c.status === "blocked")) return "blocked";
  if (providerError || calls.some((c) => c.status === "error")) return "error";
  if (calls.some((c) => c.status === "pending")) return "await";
  return "read";
}
