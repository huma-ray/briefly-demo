"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createTask, getProjectMembers, getTask, updateTask, type FieldErrors, type TaskActivity, type TaskInput } from "@/app/actions/tasks";
import { useApp } from "@/components/app-state";
import { AgentTag, Avatar, Prio, StatusIcon } from "@/components/bits";
import { I } from "@/components/icons";
import { sentence } from "@/components/inbox/inbox-list";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDue, formatRelative, isOverdue } from "@/lib/dates";
import { PRIORITY_NAME, STATUSES, STATUS_NAME, type Status } from "@/lib/model";

const EMPTY: TaskInput = { title: "", description: "", status: "todo", priority: 0, labelId: null, dueDate: null, assigneeId: null };

type Target = { mode: "edit"; key: string } | { mode: "new"; projectKey: string; status: Status };

type Option = { value: string; label: string; icon: React.ReactNode };

/** A styled menu instead of the browser's native select; Base UI handles focus, arrow keys and typeahead. */
function Picker({ label, value, options, onChange, className, children }: { label: string; value: string; options: Option[]; onChange: (v: string) => void; className: string; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" className={className} aria-label={`${label}: ${options.find((o) => o.value === value)?.label ?? ""}`} />}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="pick">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as string)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="pick-i" closeOnClick>
              {o.icon}
              <span className="txt">{o.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** One row of the Details panel: a name and its picker. */
function Detail({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <>
      <span className="td-k">{label}</span>
      {children}
      {error && (
        <span role="alert" className="td-err">
          {error}
        </span>
      )}
    </>
  );
}

const dot = (color: number | null) => <span className="dot" style={{ background: color ? `var(--av${color}-fg)` : "var(--line-strong)" }} />;

function TaskForm({ target, onDone }: { target: Target; onDone: () => void }) {
  const { members, labels, projects, memberById } = useApp();
  const [initial, setInitial] = useState<TaskInput>(target.mode === "new" ? { ...EMPTY, status: target.status } : EMPTY);
  const [form, setForm] = useState<TaskInput>(initial);
  const [taskId, setTaskId] = useState<string>();
  const [memberIds, setMemberIds] = useState<string[]>();
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, start] = useTransition();
  const projectKey = target.mode === "new" ? target.projectKey : target.key.split("-")[0];
  const project = projects.find((p) => p.key === projectKey);

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
          const loaded = { title: t.title, description: t.description, status: t.status, priority: t.priority, labelId: t.labelId, dueDate: t.dueDate, assigneeId: t.assigneeId };
          setTaskId(t.id);
          setMemberIds(r.memberIds);
          setActivity(r.activity);
          setInitial(loaded);
          setForm(loaded);
        }
        setState(r.ok ? "ready" : "missing");
      });
    }
    return () => {
      live = false;
    };
  }, [target]);

  const set = <K extends keyof TaskInput>(k: K, v: TaskInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const isNew = target.mode === "new";

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pending || (!isNew && !dirty)) return;
    start(async () => {
      const res = isNew ? await createTask(target.projectKey, form) : await updateTask(taskId!, form);
      if (res.ok) onDone();
      else setErrors(res.fieldErrors);
    });
  };

  if (state !== "ready")
    return <p className="tm-msg">{state === "loading" ? "Loading…" : "Task not found, or you don't have access."}</p>;

  const label = labels.find((l) => l.id === form.labelId);
  const assignee = members.find((m) => m.id === form.assigneeId);
  const over = !!form.dueDate && isOverdue(form.dueDate, form.status);
  const created = activity.find((a) => a.kind === "created");
  const updated = activity.at(-1);

  return (
    <form
      className="tm"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
      }}
    >
      <div className="tm-body">
        <div className="tm-main">
          <textarea
            className="tm-title"
            aria-label="Title"
            placeholder="Task title"
            rows={1}
            value={form.title}
            onChange={(e) => set("title", e.target.value.replace(/\n/g, " "))}
            onKeyDown={(e) => e.key === "Enter" && !e.metaKey && !e.ctrlKey && e.preventDefault()}
            autoFocus={isNew}
            aria-invalid={!!errors.title}
          />
          {errors.title && (
            <p role="alert" className="td-err">
              {errors.title}
            </p>
          )}

          <section className="tm-sec">
            <h3>Description</h3>
            <textarea
              className="tm-desc"
              aria-label="Description"
              placeholder="Add a description…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p role="alert" className="td-err">
                {errors.description}
              </p>
            )}
          </section>

          {!isNew && (
            <section className="tm-sec">
              <h3>Activity</h3>
              <ol className="tm-act">
                {activity.length === 0 && <li className="none">No activity yet.</li>}
                {[...activity].reverse().map((a) => {
                  const who = memberById(a.actorId);
                  return (
                    <li key={a.id}>
                      <Avatar member={who} />
                      <span className="what">
                        <b>{who?.name ?? "Someone"}</b> {sentence({ ...a, key: "this task" })}
                        {a.assistant && <AgentTag />}
                      </span>
                      <time dateTime={a.at}>{formatRelative(a.at)}</time>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        <aside className="tm-side" aria-label="Details">
          <Picker
            label="Status"
            className={`tm-status s-${form.status}`}
            value={form.status}
            onChange={(v) => set("status", v as Status)}
            options={STATUSES.map((st) => ({ value: st, label: STATUS_NAME[st], icon: <StatusIcon status={st} /> }))}
          >
            <StatusIcon status={form.status} />
            {STATUS_NAME[form.status]}
            <I name="down" />
          </Picker>

          <div className="tm-card">
            <h3>Details</h3>
            <div className="td">
              <Detail label="Assignee" error={errors.assigneeId}>
                <Picker
                  label="Assignee"
                  className={`td-v${assignee ? "" : " empty"}`}
                  value={form.assigneeId ?? ""}
                  onChange={(v) => set("assigneeId", v || null)}
                  options={[
                    { value: "", label: "Unassigned", icon: <Avatar member={null} /> },
                    ...members.filter((m) => memberIds?.includes(m.id)).map((m) => ({ value: m.id, label: m.name, icon: <Avatar member={m} /> })),
                  ]}
                >
                  <Avatar member={assignee} />
                  <span className="txt">{assignee?.name ?? "Unassigned"}</span>
                  <I name="down" />
                </Picker>
              </Detail>
              <Detail label="Priority">
                <Picker
                  label="Priority"
                  className={`td-v${form.priority ? "" : " empty"}`}
                  value={String(form.priority)}
                  onChange={(v) => set("priority", Number(v))}
                  options={PRIORITY_NAME.map((n, i) => ({ value: String(i), label: n, icon: <Prio p={i} /> })).reverse()}
                >
                  <Prio p={form.priority} />
                  <span className="txt">{PRIORITY_NAME[form.priority]}</span>
                  <I name="down" />
                </Picker>
              </Detail>
              <Detail label="Label">
                <Picker
                  label="Label"
                  className={`td-v${label ? "" : " empty"}`}
                  value={form.labelId ?? ""}
                  onChange={(v) => set("labelId", v || null)}
                  options={[{ value: "", label: "No label", icon: dot(null) }, ...labels.map((l) => ({ value: l.id, label: l.name, icon: dot(l.color) }))]}
                >
                  {dot(label?.color ?? null)}
                  <span className="txt">{label?.name ?? "None"}</span>
                  <I name="down" />
                </Picker>
              </Detail>
              <Detail label="Due date" error={errors.dueDate}>
                <label className={`td-v${form.dueDate ? "" : " empty"}`}>
                  <span className="sr-only">Due date</span>
                  <I name="cal" />
                  <span className={`txt${over ? " over" : ""}`}>{form.dueDate ? `${formatDue(form.dueDate)}${over ? " · overdue" : ""}` : "None"}</span>
                  <I name="down" />
                  <input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value || null)} onClick={(e) => e.currentTarget.showPicker?.()} />
                </label>
              </Detail>
              <span className="td-k">Project</span>
              <span className="td-v static">
                {dot(project?.color ?? null)}
                <span className="txt">{project?.name ?? projectKey}</span>
              </span>
            </div>
          </div>

          {!isNew && (created || updated) && (
            <p className="tm-meta">
              {created && <span>Created {formatRelative(created.at)}</span>}
              {updated && <span>Updated {formatRelative(updated.at)}</span>}
            </p>
          )}
        </aside>
      </div>

      <div className="tm-f">
        {errors.form ? (
          <span role="alert" className="td-err">
            {errors.form}
          </span>
        ) : dirty && !isNew ? (
          <span className="state">
            <span className="pip" /> Unsaved changes
          </span>
        ) : (
          <span className="hint">
            <kbd>⌘</kbd>
            <kbd>↵</kbd> to save
          </span>
        )}
        <button type="button" className="btn" onClick={onDone}>
          {dirty ? "Discard" : "Close"}
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending || (!isNew && !dirty)}>
          {pending ? "Saving…" : isNew ? "Create task" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

/** Modal editor driven by ?task=KEY (edit) or ?new=KEY:status (create). */
export function TaskSheetHost() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const { projects, askAbout } = useApp();
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

  const projectKey = stable.target?.mode === "new" ? stable.target.projectKey : stable.target?.key.split("-")[0];
  const project = projects.find((p) => p.key === projectKey);

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && close()}>
      <DialogContent showCloseButton={false} className="tm-dialog gap-0 overflow-hidden p-0 sm:max-w-[880px]">
        <div className="tm-h">
          <span className="crumb">
            <span className="sq" style={{ background: project ? `var(--av${project.color}-fg)` : "var(--line-strong)" }} />
            {project?.name ?? projectKey}
          </span>
          <span className="sep">/</span>
          <DialogTitle className="key">{task ?? "New task"}</DialogTitle>
          {task && (
            <button
              type="button"
              className="btn ask-btn"
              onClick={() => {
                close();
                askAbout(task);
              }}
            >
              <I name="spark" />
              Ask assistant
            </button>
          )}
          <button type="button" className="icon-btn" aria-label="Close" onClick={close}>
            <I name="x" />
          </button>
        </div>
        {stable.target && <TaskForm key={stable.id} target={stable.target} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}
