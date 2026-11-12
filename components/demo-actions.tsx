"use client";
// Demo strip actions: leave for the homepage, or wipe everything this visitor did and start fresh.
import Link from "next/link";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function DemoActions() {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <>
      {/* The homepage has its own root layout, so Next does a full page load here. */}
      <Link className="strip-btn" href="/">
        ← Back to homepage
      </Link>
      <button type="button" className="strip-btn" onClick={() => setConfirm(true)}>
        Revert all changes
      </button>
      <Dialog open={confirm} onOpenChange={(o) => !pending && setConfirm(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogTitle>Revert all changes?</DialogTitle>
          <DialogDescription>
            Everything you did in this demo (tasks, approvals, replies, conversations, the model setting) is deleted, and you start again with a fresh copy of the sample workspace. This can&apos;t be undone.
          </DialogDescription>
          {/* A plain form post: one request clears the session, the 303 loads /today once, and proxy.ts signs in once. */}
          <form className="revert-f" method="post" action="/api/session/revert" onSubmit={() => setPending(true)}>
            <button type="button" className="btn" disabled={pending} onClick={() => setConfirm(false)}>
              Keep my changes
            </button>
            <button type="submit" className="btn btn-danger" disabled={pending}>
              {pending ? "Reverting…" : "Revert and start fresh"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
