"use client";

import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import { useApp } from "@/components/app-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelative } from "@/lib/dates";
import { listConversations, loadConversation } from "@/app/actions/agent";
import type { BrieflyMessage, ConversationSummary } from "@/lib/agent/contract";
import { Conversation } from "./conversation";
import { ProviderPopover } from "./provider-popover";

const STORE = "briefly.conversation";
type Conv = { id: string; messages: BrieflyMessage[] };

export function AssistantPanel({ onClose, focusOnOpen }: { onClose: () => void; focusOnOpen: boolean }) {
  const { me, role, counts } = useApp();
  const [conv, setConv] = useState<Conv | null>(null);
  const [history, setHistory] = useState<ConversationSummary[]>([]);
  const [open, setOpen] = useState(false);

  // Resume the last conversation of this browser, else start a new one.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORE);
    } catch {}
    const fresh = () => setConv({ id: crypto.randomUUID(), messages: [] });
    if (!saved) return fresh();
    loadConversation(saved)
      .then((messages) => (messages.length ? setConv({ id: saved, messages }) : fresh()))
      .catch(fresh);
  }, []);

  useEffect(() => {
    if (!conv) return;
    try {
      localStorage.setItem(STORE, conv.id);
    } catch {}
  }, [conv]);

  async function pick(id: string) {
    setOpen(false);
    setConv({ id, messages: await loadConversation(id).catch(() => []) });
  }

  return (
    <>
      <div className="chat-h">
        <div className="title">
          <I name="spark" />
          Assistant
        </div>
        <ProviderPopover />
        <div className="acts">
          <Popover
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (o) listConversations().then(setHistory).catch(() => setHistory([]));
            }}
          >
            <PopoverTrigger className="icon-btn" aria-label="Conversation history">
              <I name="history" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 gap-0.5 p-1.5">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[12.5px] font-medium hover:bg-[var(--hover)]"
                onClick={() => {
                  setOpen(false);
                  setConv({ id: crypto.randomUUID(), messages: [] });
                }}
              >
                <I name="plus" />
                New conversation
              </button>
              <div className="max-h-64 overflow-auto">
                {history.map((c) => (
                  <button type="button" key={c.id} onClick={() => pick(c.id)} className="block w-full rounded px-2 py-1.5 text-left text-[12.5px] hover:bg-[var(--hover)]">
                    <span className="block truncate">{c.title}</span>
                    <span className="text-[11px] text-[var(--faint)]">{formatRelative(c.updatedAt)}</span>
                  </button>
                ))}
                {!history.length && <div className="px-2 py-1 text-[12px] text-[var(--faint)]">No earlier conversations</div>}
              </div>
            </PopoverContent>
          </Popover>
          <button className="icon-btn" type="button" aria-label="Close assistant" onClick={onClose}>
            <I name="x" />
          </button>
        </div>
      </div>
      <div className="ctx">
        <I name="shield" />
        <span>
          Acting as <b>{me.name}</b> · {role === "admin" ? `Admin · can see all ${counts.total} projects` : `Member · can see ${counts.visible} of ${counts.total} projects`}
        </span>
      </div>
      {conv && <Conversation key={conv.id} convId={conv.id} initialMessages={conv.messages} focusOnOpen={focusOnOpen} />}
    </>
  );
}
