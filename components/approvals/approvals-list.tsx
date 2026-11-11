"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { decideAction } from "@/app/actions/agent";
import { useApp } from "@/components/app-state";
import { I } from "@/components/icons";
import { ApprovalCard } from "@/components/assistant/tool-parts";
import { formatRelative } from "@/lib/dates";

export type ApprovalEntry = { actionId: string; tool: string; at: string; conversationId: string | null; title: string | null; question: string; output: unknown };

/** Approval queue: the same card as in the chat, so deciding here follows exactly the same rules. */
export function ApprovalsList({ entries }: { entries: ApprovalEntry[] }) {
  const router = useRouter();
  const { openConversation, refreshConversation } = useApp();
  const [error, setError] = useState<string | null>(null);

  if (!entries.length)
    return (
      <section className="view" aria-label="Approvals">
        <div className="appr-empty">
          <I name="check" />
          <p>Nothing to approve. When the assistant prepares a change, it waits here until you decide.</p>
          <Link className="btn" href="/today">
            Back to Today
          </Link>
        </div>
      </section>
    );

  return (
    <section className="view" aria-label="Approvals">
      <div className="appr">
        <p className="appr-lead">
          {entries.length} {entries.length === 1 ? "change is" : "changes are"} waiting for you. Nothing is written until you approve.
        </p>
        {error && (
          <p role="alert" className="td-err">
            {error}
          </p>
        )}
        {entries.map((e) => (
          <article className="appr-item" key={e.actionId}>
            <header>
              <span className="q">{e.question || e.title || "Assistant proposal"}</span>
              <time dateTime={e.at}>{formatRelative(e.at)}</time>
              {e.conversationId && (
                <button type="button" className="link" onClick={() => openConversation(e.conversationId!)}>
                  Open conversation
                </button>
              )}
            </header>
            {e.output ? (
              <ApprovalCard
                tool={e.tool}
                output={e.output}
                onDecided={() => {
                  if (e.conversationId) refreshConversation(e.conversationId);
                  router.refresh();
                }}
              />
            ) : (
              // The conversation lost the card (should not happen): still let the person drop the proposal.
              <div className="approve">
                <div className="approve-h">
                  <I name="lock" />
                  <span>{e.tool} proposal</span>
                </div>
                <div className="approve-f">
                  <button
                    type="button"
                    className="btn"
                    onClick={async () => {
                      const r = await decideAction({ actionId: e.actionId, decision: "cancel" }).catch(() => null);
                      if (!r?.ok) setError(r?.error ?? "Could not reach the server.");
                      router.refresh();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
