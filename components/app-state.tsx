"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Label, Member, Project, Role } from "@/lib/model";

export type DisplayOptions = { priority: boolean; due: boolean; label: boolean; assignee: boolean };
const DISPLAY_DEFAULT: DisplayOptions = { priority: true, due: true, label: true, assignee: true };
const DISPLAY_KEY = "briefly.display";

/** What the composer chip needs to know about an attached simulated Slack thread. */
export type AttachedThread = { id: string; channel: string; excerpt: string; korean: boolean; waiting: boolean };

export type AppData = {
  workspaceName: string;
  me: Member;
  role: Role;
  members: Member[];
  projects: Project[];
  labels: Label[];
  counts: { visible: number; total: number };
  myOpenTasks: number;
  /** Own proposals nobody has decided yet (Approvals badge). */
  pendingApprovals: number;
  inboxUnread: number;
  /** Model the assistant uses now (custom endpoint's model, or the default). */
  modelId: string;
  defaultModelId: string;
  /** Custom endpoint set by an Admin, or null for the default provider. */
  provider: { baseUrl: string; model: string; keyHint: string | null } | null;
  sourceUrl: string;
  /** Public demo: the assistant answers fixed questions only (no free text, no model). */
  scripted: boolean;
};

type AppState = AppData & {
  /** Project in the URL (/p/KEY/...), else the first visible project. */
  currentProject: Project | undefined;
  memberById: (id: string | null | undefined) => Member | undefined;
  labelById: (id: string | null | undefined) => Label | undefined;
  projectById: (id: string | null | undefined) => Project | undefined;
  /** Opens the task editor for a key such as "WEB-18" (adds ?task= to the URL). */
  openTask: (key: string) => void;
  /** Opens the editor in create mode for a project and status. */
  newTask: (projectKey: string, status?: "todo" | "doing" | "done") => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  /** Task ids to highlight once (assistant just created or changed them). */
  freshIds: Set<string>;
  markFresh: (ids: string[]) => void;
  display: DisplayOptions;
  setDisplay: (d: DisplayOptions) => void;
  /** Task attached to the assistant composer as a context chip ("WEB-22"), or null. */
  assistantTask: string | null;
  /** Simulated Slack thread attached instead of a task, or null. */
  assistantThread: AttachedThread | null;
  /** Attaches a task (or clears any attachment with null) and opens the assistant panel. */
  askAbout: (key: string | null) => void;
  /** Attaches a simulated Slack thread (replacing a task) and opens the assistant panel. */
  askAboutThread: (thread: AttachedThread) => void;
  /** Opens the assistant panel on a given conversation (from the Approvals page). */
  openConversation: (id: string) => void;
  /** Reloads a conversation if the panel is showing it, without opening the panel (a decision made elsewhere). */
  refreshConversation: (id: string) => void;
  /** Opens the panel and sends this question right away (Today's quick actions), with no attachment. */
  askAssistant: (prompt: string) => void;
  /** Bumped by askAbout / openConversation / refreshConversation / askAssistant; the shell opens the panel unless `quiet`. */
  assistantRequest: { n: number; convId?: string; quiet?: boolean; prompt?: string };
};

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
}

export function AppProvider({ data, children }: { data: AppData; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [display, setDisplayState] = useState<DisplayOptions>(DISPLAY_DEFAULT);
  // One attachment at a time: a task key or a thread.
  const [attachment, setAttachment] = useState<{ kind: "task"; key: string } | { kind: "thread"; thread: AttachedThread } | null>(null);
  const [assistantRequest, setAssistantRequest] = useState<{ n: number; convId?: string; quiet?: boolean; prompt?: string }>({ n: 0 });

  // Opening is idempotent, so clearing the chip from inside the open panel is harmless.
  const askAbout = useCallback((key: string | null) => {
    setAttachment(key ? { kind: "task", key } : null);
    setAssistantRequest((r) => ({ n: r.n + 1 }));
  }, []);
  const askAboutThread = useCallback((thread: AttachedThread) => {
    setAttachment({ kind: "thread", thread });
    setAssistantRequest((r) => ({ n: r.n + 1 }));
  }, []);
  const openConversation = useCallback((id: string) => setAssistantRequest((r) => ({ n: r.n + 1, convId: id })), []);
  const askAssistant = useCallback((prompt: string) => {
    setAttachment(null);
    setAssistantRequest((r) => ({ n: r.n + 1, prompt }));
  }, []);
  const refreshConversation = useCallback((id: string) => setAssistantRequest((r) => ({ n: r.n + 1, convId: id, quiet: true })), []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISPLAY_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration
      if (raw) setDisplayState({ ...DISPLAY_DEFAULT, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const setDisplay = useCallback((d: DisplayOptions) => {
    setDisplayState(d);
    try {
      localStorage.setItem(DISPLAY_KEY, JSON.stringify(d));
    } catch {}
  }, []);

  const markFresh = useCallback((ids: string[]) => {
    setFreshIds(new Set(ids));
    setTimeout(() => setFreshIds(new Set()), 2800);
  }, []);

  const withParams = useCallback(
    (set: Record<string, string | null>) => {
      const p = new URLSearchParams(search.toString());
      for (const [k, v] of Object.entries(set)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      const q = p.toString();
      router.push(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, search],
  );

  const value = useMemo<AppState>(() => {
    const keyInPath = /^\/p\/([A-Z]+)/.exec(pathname)?.[1];
    const currentProject = data.projects.find((p) => p.key === keyInPath) ?? data.projects[0];
    return {
      ...data,
      currentProject,
      memberById: (id) => data.members.find((m) => m.id === id),
      labelById: (id) => data.labels.find((l) => l.id === id),
      projectById: (id) => data.projects.find((p) => p.id === id),
      openTask: (key) => withParams({ task: key, new: null }),
      newTask: (projectKey, status = "todo") => withParams({ new: `${projectKey}:${status}`, task: null }),
      searchOpen,
      setSearchOpen,
      freshIds,
      markFresh,
      display,
      setDisplay,
      assistantTask: attachment?.kind === "task" ? attachment.key : null,
      assistantThread: attachment?.kind === "thread" ? attachment.thread : null,
      askAbout,
      askAboutThread,
      openConversation,
      refreshConversation,
      askAssistant,
      assistantRequest,
    };
  }, [data, pathname, withParams, searchOpen, freshIds, markFresh, display, setDisplay, attachment, askAbout, askAboutThread, openConversation, refreshConversation, askAssistant, assistantRequest]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
