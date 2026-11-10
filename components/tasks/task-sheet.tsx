"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createTask, getProjectMembers, getTask, updateTask, type FieldErrors, type TaskInput } from "@/app/actions/tasks";
import { useApp } from "@/components/app-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { PRIORITY_NAME, STATUSES, STATUS_NAME, type Status } from "@/lib/model";

const EMPTY: TaskInput = { title: "", description: "", status: "todo", priority: 0, labelId: null, dueDate: null, assigneeId: null };
const select = "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm";

type Target = { mode: "edit"; key: string } | { mode: "new"; projectKey: string; status: Status };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium">
      {label}
      {children}
      {error && (
        <span role="alert" className="font-normal text-[var(--danger)]">
          {error}
        </span>
      )}
    </label>
  );
}

function TaskForm({ target, onDone }: { target: Target; onDone: () => void }) {
  const { members, labels } = useApp();
  const [form, setForm] = useState<TaskInput>(target.mode === "new" ? { ...EMPTY, status: target.status } : EMPTY);
  const [taskId, setTaskId] = useState<string>();
  const [memberIds, setMemberIds] = useState<string[]>();
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, start] = useTransition();
  const projectKey = target.mode === "new" ? target.projectKey : target.key.split("-")[0];

  useEffect(() => {
    let live = true;
    if (target.mode === "new") {
      getProjectMembers(target.projectKey).then((r) => {
        if (!live) return;
        if (r.ok) setMemberIds(r.memberIds);
        setState(r.ok ? "ready" : "missing");
      });
    } else {
      getTask(target.key).then((r) => {
        if (!live) return;
        if (r.ok) {
          const t = r.task;
          setTaskId(t.id);
          setMemberIds(r.memberIds);
          setForm({ title: t.title, description: t.description, status: t.status, priority: t.priority, labelId: t.labelId, dueDate: t.dueDate, assigneeId: t.assigneeId });
        }
        setState(r.ok ? "ready" : "missing");
      });
    }
    return () => {
      live = false;
    };
  }, [target]);

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = target.mode === "new" ? await createTask(target.projectKey, form) : await updateTask(taskId!, form);
      if (res.ok) onDone();
      else setErrors(res.fieldErrors);
    });
  };

  if (state === "loading") return <p className="p-4 text-[var(--muted)]">Loading…</p>;
  if (state === "missing") return <p className="p-4 text-[var(--muted)]">Task not found, or you don&apos;t have access.</p>;

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
      {errors.form && (
        <p role="alert" className="text-[var(--danger)]">
          {errors.form}
        </p>
      )}
      <Field label="Title" error={errors.title}>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} autoFocus />
      </Field>
      <Field label="Description" error={errors.description}>
        <Textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status" error={errors.status}>
          <select className={select} value={form.status} onChange={(e) => set("status", e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_NAME[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority" error={errors.priority}>
          <select className={select} value={form.priority} onChange={(e) => set("priority", Number(e.target.value))}>
            {PRIORITY_NAME.map((n, i) => (
              <option key={n} value={i}>
                {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Label" error={errors.labelId}>
          <select className={select} value={form.labelId ?? ""} onChange={(e) => set("labelId", e.target.value || null)}>
            <option value="">No label</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date" error={errors.dueDate}>
          <Input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value || null)} />
        </Field>
      </div>
      <Field label="Assignee" error={errors.assigneeId}>
        <select className={select} value={form.assigneeId ?? ""} onChange={(e) => set("assigneeId", e.target.value || null)}>
          <option value="">Unassigned</option>
          {members
            .filter((m) => memberIds?.includes(m.id))
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label="Project">
        <Input value={projectKey} disabled />
      </Field>
      <Button type="submit" disabled={pending} className="mt-auto">
        {pending ? "Saving…" : target.mode === "new" ? "Create task" : "Save"}
      </Button>
    </form>
  );
}

/** Right-side editor driven by ?task=KEY (edit) or ?new=KEY:status (create). */
export function TaskSheetHost() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const task = search.get("task");
  const created = search.get("new");
  const [pk, st] = created?.split(":") ?? [];
  const target: Target | null = task
    ? { mode: "edit", key: task }
    : pk
      ? { mode: "new", projectKey: pk, status: (STATUSES as string[]).includes(st) ? (st as Status) : "todo" }
      : null;
  // Keep one target object per URL value so the form's effect does not refire.
  const id = task ?? created ?? "";
  const [stable, setStable] = useState<{ id: string; target: Target | null }>({ id, target });
  if (stable.id !== id) setStable({ id, target });

  const close = () => {
    const p = new URLSearchParams(search.toString());
    p.delete("task");
    p.delete("new");
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };

  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && close()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{task ?? "New task"}</SheetTitle>
        </SheetHeader>
        {stable.target && <TaskForm key={stable.id} target={stable.target} onDone={close} />}
      </SheetContent>
    </Sheet>
  );
}
