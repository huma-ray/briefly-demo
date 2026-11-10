"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Label, Member, Project, Role } from "@/lib/model";

export type DisplayOptions = { priority: boolean; due: boolean; label: boolean; assignee: boolean };
const DISPLAY_DEFAULT: DisplayOptions = { priority: true, due: true, label: true, assignee: true };
const DISPLAY_KEY = "briefly.display";

export type AppData = {
  workspaceName: string;
  me: Member;
  role: Role;
  members: Member[];
  projects: Project[];
  labels: Label[];
  counts: { visible: number; total: number };
  myOpenTasks: number;
  inboxUnread: number;
  /** Model the assistant uses now (custom endpoint's model, or the default). */
  modelId: string;
  defaultModelId: string;
  /** Custom endpoint set by an Admin, or null for the default provider. */
  provider: { baseUrl: string; model: string; keyHint: string | null } | null;
  sourceUrl: string;
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
    };
  }, [data, pathname, withParams, searchOpen, freshIds, markFresh, display, setDisplay]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
