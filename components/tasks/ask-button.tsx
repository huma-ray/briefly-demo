"use client";

import { useApp } from "@/components/app-state";
import { I } from "@/components/icons";

/** Attaches a task to the assistant composer. Stops the click so the card does not open or start a drag. */
export function AskButton({ taskKey }: { taskKey: string }) {
  const { askAbout } = useApp();
  return (
    <button
      type="button"
      className="ask"
      aria-label={`Ask the assistant about ${taskKey}`}
      title="Ask the assistant"
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        askAbout(taskKey);
      }}
    >
      <I name="spark" />
    </button>
  );
}
