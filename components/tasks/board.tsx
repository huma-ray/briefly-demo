"use client";

import { useRef, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveTask } from "@/app/actions/tasks";
import { useApp } from "@/components/app-state";
import { StatusIcon } from "@/components/bits";
import { I } from "@/components/icons";
import { useMarks } from "@/components/tasks/marks";
import { STATUSES, STATUS_NAME, type Status, type Task } from "@/lib/model";

function CardBody({ t }: { t: Task }) {
  const m = useMarks(t);
  return (
    <>
      <div className="card-top">
        <StatusIcon status={t.status} />
        <span>{t.key}</span>
        {m.agent}
        {m.avatar}
      </div>
      <div className="card-t">{t.title}</div>
      <div className="meta">
        {m.prio}
        {m.due}
        {m.label}
      </div>
    </>
  );
}

function Card({ t, justDragged }: { t: Task; justDragged: React.RefObject<boolean> }) {
  const { openTask, freshIds } = useApp();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  return (
    <article
      ref={setNodeRef}
      className={`card${t.status === "done" ? " done" : ""}${freshIds.has(t.id) ? " fresh" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, cursor: "pointer", touchAction: "manipulation" }}
      {...attributes}
      {...listeners}
      aria-label={`${t.key} ${t.title}`}
      onClick={() => !justDragged.current && openTask(t.key)}
      onKeyDown={(e) => {
        listeners?.onKeyDown?.(e);
        if (e.key === "Enter") openTask(t.key);
      }}
    >
      <CardBody t={t} />
    </article>
  );
}

function Column({ status, items, projectKey, justDragged }: { status: Status; items: Task[]; projectKey: string; justDragged: React.RefObject<boolean> }) {
  const { newTask } = useApp();
  const { setNodeRef } = useDroppable({ id: `col:${status}` });
  return (
    <div className="col">
      <div className="col-h">
        <StatusIcon status={status} />
        {STATUS_NAME[status]}
        <span className="n">{items.length}</span>
        <button className="icon-btn" type="button" aria-label={`Add task to ${STATUS_NAME[status]}`} onClick={() => newTask(projectKey, status)}>
          <I name="plus" />
        </button>
      </div>
      <div className="col-b" ref={setNodeRef}>
        <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {items.map((t) => (
            <Card key={t.id} t={t} justDragged={justDragged} />
          ))}
        </SortableContext>
        {status !== "done" && (
          <button className="ghost-add" type="button" onClick={() => newTask(projectKey, status)}>
            <I name="plus" />
            New task
          </button>
        )}
      </div>
    </div>
  );
}

const byPosition = (a: Task, b: Task) => a.position - b.position;

export function Board({ tasks: initial, projectKey }: { tasks: Task[]; projectKey: string }) {
  const [source, setSource] = useState(initial);
  const [tasks, setTasks] = useState(initial);
  const [active, setActive] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const justDragged = useRef(false);
  // Server data changed (after a save or reload): adopt it.
  if (initial !== source) {
    setSource(initial);
    setTasks(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    }),
  );

  const onDragStart = (e: DragStartEvent) => setActive(tasks.find((t) => t.id === e.active.id) ?? null);

  async function onDragEnd({ active: a, over }: DragEndEvent) {
    setActive(null);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 0);
    const moving = tasks.find((t) => t.id === a.id);
    if (!over || !moving || over.id === a.id) return;

    const overTask = tasks.find((t) => t.id === over.id);
    const status = overTask ? overTask.status : (String(over.id).slice(4) as Status);
    const column = tasks.filter((t) => t.status === status).sort(byPosition);
    const from = column.findIndex((t) => t.id === moving.id);
    const rest = column.filter((t) => t.id !== moving.id);
    let at = overTask ? rest.findIndex((t) => t.id === overTask.id) : rest.length;
    if (overTask && from !== -1 && from < column.findIndex((t) => t.id === overTask.id)) at += 1;

    const prev = rest[at - 1];
    const next = rest[at];
    const position = prev && next ? (prev.position + next.position) / 2 : prev ? prev.position + 1000 : next ? next.position - 1000 : 1000;

    const before = tasks;
    setError(null);
    setTasks(tasks.map((t) => (t.id === moving.id ? { ...t, status, position } : t)));
    const res = await moveTask(moving.id, status, position);
    if (!res.ok) {
      setTasks(before);
      setError(res.error);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="px-4 pt-2 text-[var(--danger)]">
          {error}
        </p>
      )}
      <div className="board-wrap">
        <DndContext
          id="board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActive(null)}
        >
          <div className="board">
            {STATUSES.map((s) => (
              <Column key={s} status={s} items={tasks.filter((t) => t.status === s).sort(byPosition)} projectKey={projectKey} justDragged={justDragged} />
            ))}
          </div>
          <DragOverlay>{active && <article className={`card${active.status === "done" ? " done" : ""}`}><CardBody t={active} /></article>}</DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
