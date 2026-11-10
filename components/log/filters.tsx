"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const RANGES = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"]] as const;

export function Filters({ range, person, tool, people, tools }: {
  range: string; person: string; tool: string;
  people: { id: string; name: string }[]; tools: string[];
}) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    p.delete("run");
    if (v && !(k === "range" && v === "today")) p.set(k, v);
    else p.delete(k);
    router.replace(`${path}?${p}`);
  };
  return (
    <div className="filters">
      <div className="seg" role="group" aria-label="Range">
        {RANGES.map(([v, l]) => (
          <button key={v} type="button" aria-pressed={range === v} onClick={() => set("range", v)}>{l}</button>
        ))}
      </div>
      <select className="btn" aria-label="Person" value={person} onChange={(e) => set("person", e.target.value)}>
        <option value="">All people</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select className="btn" aria-label="Tool" value={tool} onChange={(e) => set("tool", e.target.value)}>
        <option value="">All tools</option>
        {tools.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );
}
