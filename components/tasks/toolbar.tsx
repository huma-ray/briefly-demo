"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-state";
import { I } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRIORITY_NAME } from "@/lib/model";

const opt = (on: boolean) =>
  `rounded-md border px-2 py-0.5 text-xs ${on ? "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-strong)]"}`;

function FilterPopover() {
  const app = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const active = ["assignee", "priority", "label"].filter((k) => search.has(k)).length;

  // Click the selected option again to clear it.
  const toggle = (k: string, v: string) => {
    const p = new URLSearchParams(search.toString());
    if (p.get(k) === v) p.delete(k);
    else p.set(k, v);
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  };
  const group = (title: string, k: string, options: [string, string][]) => (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium text-[var(--muted)]">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, name]) => (
          <button key={v} type="button" className={opt(search.get(k) === v)} aria-pressed={search.get(k) === v} onClick={() => toggle(k, v)}>
            {name}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger render={<button className="btn btn-dashed" type="button" aria-pressed={active > 0} />}>
        <I name="filter" />
        Filter{active > 0 && ` · ${active}`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        {group("Assignee", "assignee", [["none", "Unassigned"], ...app.members.map((m): [string, string] => [m.id, m.name])])}
        {group("Priority", "priority", PRIORITY_NAME.map((n, i): [string, string] => [String(i), n]))}
        {group("Label", "label", [["none", "No label"], ...app.labels.map((l): [string, string] => [l.id, l.name])])}
      </PopoverContent>
    </Popover>
  );
}

function DisplayPopover() {
  const { display, setDisplay } = useApp();
  return (
    <Popover>
      <PopoverTrigger render={<button className="btn" type="button" />}>
        <I name="sliders" />
        Display
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48">
        <div className="text-xs font-medium text-[var(--muted)]">Show on cards and rows</div>
        {(["priority", "due", "label", "assignee"] as const).map((k) => (
          <label key={k} className="flex items-center gap-2 capitalize">
            <input type="checkbox" checked={display[k]} onChange={(e) => setDisplay({ ...display, [k]: e.target.checked })} />
            {k === "due" ? "Due date" : k}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/** Filter, Display, visible count and (when a project is open) New task. */
export function Toolbar({ count, projectKey }: { count: number; projectKey?: string }) {
  const { newTask } = useApp();
  return (
    <div className="toolbar">
      <FilterPopover />
      <DisplayPopover />
      <span className="count">
        {count} {count === 1 ? "task" : "tasks"}
      </span>
      {projectKey && (
        <button className="btn btn-primary" type="button" onClick={() => newTask(projectKey, "todo")}>
          <I name="plus" />
          New task
        </button>
      )}
    </div>
  );
}
