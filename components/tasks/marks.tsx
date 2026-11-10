"use client";

import { useApp } from "@/components/app-state";
import { AgentTag, Avatar, DuePill, LabelPill, Prio } from "@/components/bits";
import type { Task } from "@/lib/model";

/** Marks of a task that Display options can hide; shared by cards and rows. */
export function useMarks(t: Task) {
  const { display, labelById, memberById } = useApp();
  return {
    prio: display.priority && <Prio p={t.priority} />,
    due: display.due && <DuePill due={t.dueDate} status={t.status} />,
    label: display.label && <LabelPill label={labelById(t.labelId)} />,
    avatar: display.assignee && <Avatar member={memberById(t.assigneeId)} />,
    agent: t.lastSource === "assistant" && <AgentTag />,
  };
}
