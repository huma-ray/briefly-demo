"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { setRole } from "@/app/actions/session";
import { useApp } from "@/components/app-state";
import { Avatar } from "@/components/bits";
import { I, IconSprite } from "@/components/icons";
import { AssistantPanel } from "@/components/assistant/assistant-panel";
import { DemoActions } from "@/components/demo-actions";
import { RolePicker } from "@/components/role-picker";
import { SearchPalette } from "@/components/tasks/search-palette";
import { TaskSheetHost } from "@/components/tasks/task-sheet";
import type { Role } from "@/lib/model";

const NARROW = "(max-width: 1199px)";
const PHONE = "(max-width: 759px)";
const CHAT_W = { min: 300, max: 640, step: 16, key: "briefly.chatWidth" };

/** Drag (or arrow keys) on the assistant's left edge to resize it; the width is kept per browser. */
function ChatResizer({ app }: { app: React.RefObject<HTMLDivElement | null> }) {
  const drag = useRef<{ x: number; w: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const width = () => app.current?.querySelector(".chat")?.getBoundingClientRect().width ?? 344;
  const apply = (w: number) => {
    // Leave the board at least 480px.
    const max = Math.min(CHAT_W.max, innerWidth - 224 - 480);
    const v = Math.round(Math.max(CHAT_W.min, Math.min(max, w)));
    app.current?.style.setProperty("--chat-w", `${v}px`);
    return v;
  };
  const save = (w: number) => {
    try {
      localStorage.setItem(CHAT_W.key, String(w));
    } catch {}
  };

  useEffect(() => {
    try {
      const w = Number(localStorage.getItem(CHAT_W.key));
      if (w) apply(w);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  return (
    <div
      className="chat-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize assistant"
      tabIndex={0}
      data-drag={dragging || undefined}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { x: e.clientX, w: width() };
        setDragging(true);
      }}
      onPointerMove={(e) => drag.current && apply(drag.current.w + drag.current.x - e.clientX)}
      onPointerUp={() => {
        drag.current = null;
        setDragging(false);
        save(width());
      }}
      onDoubleClick={() => {
        app.current?.style.removeProperty("--chat-w");
        try {
          localStorage.removeItem(CHAT_W.key);
        } catch {}
      }}
      onKeyDown={(e) => {
        const d = e.key === "ArrowLeft" ? CHAT_W.step : e.key === "ArrowRight" ? -CHAT_W.step : 0;
        if (!d) return;
        e.preventDefault();
        save(apply(width() + d));
      }}
    />
  );
}

/** The app frame from the design: sidebar | main | assistant, with drawers below 1200px / 760px. */
export function Shell({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const pathname = usePathname();
  // null = default: open on wide screens, closed where it would cover the board
  const [chatChoice, setChatChoice] = useState<boolean | null>(null);
  const [sideOpen, setSideOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [phone, setPhone] = useState(false);
  const [pending, startTransition] = useTransition();
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const n = matchMedia(NARROW);
    const p = matchMedia(PHONE);
    const sync = () => {
      setNarrow(n.matches);
      setPhone(p.matches);
      if (!p.matches) setSideOpen(false);
    };
    sync();
    n.addEventListener("change", sync);
    p.addEventListener("change", sync);
    return () => {
      n.removeEventListener("change", sync);
      p.removeEventListener("change", sync);
    };
  }, []);

  // askAbout / openConversation from anywhere in the app open the panel (adjusting state during render, no effect).
  const [seenRequest, setSeenRequest] = useState(app.assistantRequest.n);
  if (app.assistantRequest.n !== seenRequest) {
    setSeenRequest(app.assistantRequest.n);
    if (!app.assistantRequest.quiet) setChatChoice(true);
  }

  const chatOpen = chatChoice ?? !narrow;
  const toggleChat = useCallback(() => setChatChoice(!chatOpen), [chatOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "j") {
        e.preventDefault();
        toggleChat();
      } else if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        app.setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSideOpen(false);
        if (matchMedia(NARROW).matches) setChatChoice(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggleChat, app]);

  // Navigating closes the phone sidebar drawer.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reacting to navigation
  useEffect(() => setSideOpen(false), [pathname]);

  const scrim = (narrow && chatOpen) || (phone && sideOpen);
  const view = viewOf(pathname);
  const project = app.currentProject;

  const switchRole = (role: Role) => {
    if (role === app.role || pending) return;
    startTransition(async () => {
      await setRole(role);
    });
  };

  return (
    <div
      ref={appRef}
      className="app"
      data-role={app.role}
      data-chat={chatOpen ? "open" : "closed"}
      data-side={sideOpen ? "open" : "closed"}
      data-scrim={scrim ? "on" : "off"}
    >
      <IconSprite />
      <div
        className="scrim"
        onClick={() => {
          setSideOpen(false);
          if (narrow) setChatChoice(false);
        }}
      />

      <aside className="side" aria-label="Workspace navigation">
        <div className="ws">
          <span className="logo">B</span>
          {app.workspaceName}
          <I name="down" />
        </div>
        <button className="search" type="button" onClick={() => app.setSearchOpen(true)}>
          <I name="search" />
          Search<kbd>⌘K</kbd>
        </button>

        <nav className="nav" aria-label="Main">
          <Link href="/today" aria-current={view.kind === "today" ? "page" : undefined}>
            <I name="spark" />
            Today
          </Link>
          <Link href="/inbox" aria-current={view.kind === "inbox" ? "page" : undefined}>
            <I name="inbox" />
            Inbox{app.inboxUnread > 0 && <span className="count">{app.inboxUnread}</span>}
          </Link>
          <Link href="/my" aria-current={view.kind === "my" ? "page" : undefined}>
            <I name="mine" />
            My tasks{app.myOpenTasks > 0 && <span className="count">{app.myOpenTasks}</span>}
          </Link>
          <Link href="/approvals" aria-current={view.kind === "approvals" ? "page" : undefined}>
            <I name="check" />
            Approvals{app.pendingApprovals > 0 && <span className="count accent">{app.pendingApprovals}</span>}
          </Link>
          <Link href="/log" aria-current={view.kind === "log" ? "page" : undefined}>
            <I name="activity" />
            Agent log
          </Link>
        </nav>

        <div>
          <div className="sec-label">Projects</div>
          <nav className="nav" aria-label="Projects">
            {app.projects.map((p) => (
              <Link
                key={p.id}
                href={`/p/${p.key}/board`}
                aria-current={view.kind === "project" && project?.id === p.id ? "page" : undefined}
              >
                <span className="proj-sq" style={{ background: `var(--av${p.color}-fg)` }} />
                {p.name}
                {p.adminOnly ? <span className="lock-tag">admin</span> : <span className="key">{p.key}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="me">
          <Avatar member={app.me} large />
          <div>
            <div className="n">{app.me.name}</div>
            <div className="r">{app.role === "admin" ? "Admin" : "Member"} · demo account</div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="top">
          <button className="icon-btn menu-btn" type="button" aria-label="Open navigation" onClick={() => setSideOpen(true)}>
            <I name="menu" />
          </button>
          <div className="crumbs">
            <span className="muted">{view.kind === "project" ? project?.name : app.workspaceName}</span>
            <I name="right" />
            <span>{view.title}</span>
          </div>
          <nav className="tabs" aria-label="Views">
            <Link href={`/p/${project?.key ?? "WEB"}/board`} aria-current={view.tab === "board" ? "page" : undefined}>
              <I name="board" />
              Board
            </Link>
            <Link href={`/p/${project?.key ?? "WEB"}/list`} aria-current={view.tab === "list" ? "page" : undefined}>
              <I name="list" />
              List
            </Link>
            <Link href="/log" aria-current={view.tab === "log" ? "page" : undefined}>
              <I name="activity" />
              Agent log
            </Link>
          </nav>
          <span className="spacer" />
          <span className="break" />
          <div className="seg" role="group" aria-label="View as">
            <span className="seg-l">View as</span>
            {(["member", "admin"] as const).map((r) => (
              <button key={r} type="button" aria-pressed={app.role === r} disabled={pending} onClick={() => switchRole(r)}>
                {r === "member" ? "Member" : "Admin"}
              </button>
            ))}
          </div>
        </header>

        <div className="strip">
          <span className="tag-demo">Demo</span>
          <span>Sample workspace. Data resets every night at 03:00 KST.</span>
          <span className="r strip-actions">
            <a href={app.sourceUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              Self-built demo · source on GitHub
            </a>
            <DemoActions />
          </span>
        </div>

        {children}
      </main>

      <aside className="chat" aria-label="Assistant">
        <ChatResizer app={appRef} />
        <AssistantPanel onClose={() => setChatChoice(false)} focusOnOpen={narrow && chatOpen} />
      </aside>

      {/* Fixed in the corner so it never shifts the header; hidden while the panel is open (the panel has its own close). */}
      {!chatOpen && (
        <button className="fab" type="button" aria-label="Open assistant" onClick={toggleChat}>
          <I name="spark" />
          <span className="lbl">Ask assistant</span>
          <kbd>⌘J</kbd>
        </button>
      )}

      <SearchPalette />
      <TaskSheetHost />
      <RolePicker />
    </div>
  );
}

function viewOf(pathname: string): { kind: "project" | "today" | "approvals" | "inbox" | "my" | "log"; title: string; tab?: "board" | "list" | "log" } {
  if (pathname.startsWith("/today")) return { kind: "today", title: "Today" };
  if (pathname.startsWith("/approvals")) return { kind: "approvals", title: "Approvals" };
  if (pathname.startsWith("/log")) return { kind: "log", title: "Agent log", tab: "log" };
  if (pathname.startsWith("/inbox")) return { kind: "inbox", title: "Inbox" };
  if (pathname.startsWith("/my")) return { kind: "my", title: "My tasks" };
  if (pathname.endsWith("/list")) return { kind: "project", title: "List", tab: "list" };
  return { kind: "project", title: "Board", tab: "board" };
}
