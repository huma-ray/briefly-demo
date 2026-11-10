"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { I } from "@/components/icons";
import { ProjectPill } from "@/components/bits";
import { useApp } from "@/components/app-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDue, formatTime, todayKst } from "@/lib/dates";
import { getComposerData, type ComposerData } from "@/app/actions/assistant-ui";
import type { BrieflyMessage, ChatRequest, Decision } from "@/lib/agent/contract";
import { ApprovalCard, isPending, isTool, ReadResult, ToolChip } from "./tool-parts";

const UNAVAILABLE = "The assistant is unavailable right now.";

function Text({ text }: { text: string }) {
  return text
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((para, i) => (
      <p key={i}>
        {para.split("\n").map((line, j) => (
          <span key={j}>
            {j > 0 && <br />}
            {line}
          </span>
        ))}
      </p>
    ));
}

const textOf = (m: BrieflyMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

export function Conversation({ convId, initialMessages, focusOnOpen }: { convId: string; initialMessages: BrieflyMessage[]; focusOnOpen: boolean }) {
  const router = useRouter();
  const { currentProject, members } = useApp();
  const projectKey = currentProject?.key ?? "";
  const transport = useMemo(
    () =>
      new DefaultChatTransport<BrieflyMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ id, messages, trigger, body: extra }) => {
          const body: ChatRequest = { id, message: messages[messages.length - 1], projectKey: extra?.projectKey, trigger };
          return { body };
        },
      }),
    [],
  );
  const { messages, sendMessage, regenerate, stop, status, error, clearError, setMessages } = useChat<BrieflyMessage>({ id: convId, messages: initialMessages, transport });
  const busy = status === "submitted" || status === "streaming";

  const [text, setText] = useState("");
  const [data, setData] = useState<ComposerData>({ tasks: [], assignSuggestion: null });
  const [filter, setFilter] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!projectKey) return;
    let live = true;
    getComposerData(projectKey)
      .then((d) => live && setData(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [projectKey]);

  useEffect(() => {
    if (focusOnOpen) area.current?.focus();
  }, [focusOnOpen]);

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, error]);

  function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    void sendMessage({ text: t, metadata: { createdAt: Date.now() } }, { body: { projectKey } });
  }

  function fill(t: string) {
    setText(t);
    area.current?.focus();
  }

  function insert(s: string) {
    const el = area.current;
    const at = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? at;
    setText(text.slice(0, at) + s + " " + text.slice(end));
    setMentionOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = at + s.length + 1;
      el?.setSelectionRange(pos, pos);
    });
  }

  function onDecided(actionId: string, decision: Decision, confirmation?: BrieflyMessage) {
    setMessages((ms) => {
      const next = ms.map((m) => ({
        ...m,
        parts: m.parts.map((p) =>
          isTool(p) && isPending(p.output) && p.output.actionId === actionId ? ({ ...p, output: { ...p.output, decision } } as typeof p) : p,
        ),
      }));
      return confirmation && !next.some((m) => m.id === confirmation.id) ? [...next, confirmation] : next;
    });
    router.refresh();
  }

  const first = messages[0]?.metadata?.createdAt;
  const dayLabel = (() => {
    if (!first) return null;
    const d = new Date(first);
    return `${todayKst(d) === todayKst() ? "Today" : formatDue(todayKst(d))}, ${formatTime(d)}`;
  })();

  const f = filter.trim().toLowerCase();
  const people = members.filter((m) => m.name.toLowerCase().includes(f));
  const tasks = data.tasks.filter((t) => (t.key + " " + t.title).toLowerCase().includes(f)).slice(0, 30);
  const sugs = ["Summarize this project", "What's due this week?", ...(data.assignSuggestion ? [data.assignSuggestion] : [])];
  const row = "block w-full truncate rounded px-2 py-1 text-left text-[12.5px] hover:bg-[var(--hover)]";

  return (
    <>
      <div className="thread" ref={thread}>
        {dayLabel && <div className="day">{dayLabel}</div>}
        {messages.map((m) =>
          m.role === "user" ? (
            <div className="msg-u" key={m.id}>
              {textOf(m)}
            </div>
          ) : (
            <div className="msg-a" key={m.id}>
              <div className="who">
                <span className="mark">
                  <I name="spark" />
                </span>
                Assistant
                {m.metadata?.createdAt && <time>{formatTime(new Date(m.metadata.createdAt))}</time>}
              </div>
              {/* Design order: tool chips, then the reply text, then what it refers to (rows, approval cards). */}
              {m.parts.map((p) => (isTool(p) ? <ToolChip key={p.toolCallId} part={p} /> : null))}
              {m.parts.map((p, i) => (p.type === "text" ? <Text key={i} text={p.text} /> : null))}
              {m.parts.map((p) =>
                isTool(p) && p.state === "output-available" ? (
                  isPending(p.output) ? (
                    <ApprovalCard key={`r-${p.toolCallId}`} tool={p.type.slice(5)} output={p.output} onDecided={onDecided} />
                  ) : (
                    <ReadResult key={`r-${p.toolCallId}`} output={p.output} />
                  )
                ) : null,
              )}
            </div>
          ),
        )}
        {error && (
          <div className="msg-a" role="alert">
            {/* The server adds the reason only for a self-hosted endpoint, so its admin can fix it. */}
            <p>{error.message.startsWith(UNAVAILABLE) ? error.message : UNAVAILABLE}</p>
            <div>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  clearError();
                  void regenerate({ body: { projectKey } });
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="sugs">
          {sugs.map((s) => (
            <button className="sug" type="button" key={s} onClick={() => fill(s)}>
              {s}
            </button>
          ))}
        </div>
        <div className="box">
          <textarea
            ref={area}
            rows={2}
            value={text}
            placeholder="Ask about tasks, or tell the assistant what to change…"
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="box-f">
            {currentProject && <ProjectPill name={currentProject.name} color={currentProject.color} />}
            <Popover open={mentionOpen} onOpenChange={(o) => { setMentionOpen(o); setFilter(""); }}>
              <PopoverTrigger className="icon-btn" aria-label="Mention a person or task">
                <I name="at" />
              </PopoverTrigger>
              <PopoverContent align="start" side="top" className="w-64 gap-1 p-1.5">
                <input autoFocus value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter people and tasks" aria-label="Filter" className="w-full rounded border border-[var(--line)] bg-[var(--bg)] px-2 py-1 text-[12.5px] outline-none" />
                <div className="max-h-56 overflow-auto">
                  {people.map((m) => (
                    <button type="button" key={m.id} className={row} onClick={() => insert(`@${m.name}`)}>
                      @{m.name}
                    </button>
                  ))}
                  {tasks.map((t) => (
                    <button type="button" key={t.key} className={row} onClick={() => insert(t.key)}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--faint)" }}>{t.key}</span> {t.title}
                    </button>
                  ))}
                  {!people.length && !tasks.length && <div className="px-2 py-1 text-[12px] text-[var(--faint)]">No matches</div>}
                </div>
              </PopoverContent>
            </Popover>
            {busy && (
              <button className="icon-btn" type="button" aria-label="Stop" style={{ marginLeft: "auto" }} onClick={() => stop()}>
                <I name="x" />
              </button>
            )}
            <button className="send" type="submit" aria-label="Send" disabled={busy || !text.trim()} style={busy ? { marginLeft: 0, opacity: 0.5 } : !text.trim() ? { opacity: 0.5 } : undefined}>
              <I name="up" />
            </button>
          </div>
        </div>
        <div className="fine">
          <I name="lock" />
          Changes always ask for approval first · 20 requests a day in the demo
        </div>
      </form>
    </>
  );
}
