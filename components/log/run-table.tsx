"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/components/app-state";
import { Avatar } from "@/components/bits";
import { formatTime } from "@/lib/dates";
import { RESULT_LABEL, toolSummary, type Run } from "./types";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function RunTable({ runs, selected }: { runs: Run[]; selected: string | undefined }) {
  const { memberById } = useApp();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const select = (id: string) => {
    const p = new URLSearchParams(params.toString());
    p.set("run", id);
    router.replace(`${path}?${p}`, { scroll: false });
  };
  return (
    <tbody>
      {runs.map((r) => {
        const m = memberById(r.memberId);
        return (
          <tr
            key={r.id}
            tabIndex={0}
            aria-selected={r.id === selected}
            onClick={() => select(r.id)}
            onKeyDown={(e) => e.key === "Enter" && select(r.id)}
          >
            <td className="time">{formatTime(r.createdAt)}</td>
            <td className="user">
              <span className="u">
                <Avatar member={m} />
                <span>{m?.name.split(" ")[0]} <span className="role">{cap(r.role)}</span></span>
              </span>
            </td>
            <td className="prompt" title={r.prompt}>{r.prompt}</td>
            <td className="tools"><code>{toolSummary(r.calls)}</code></td>
            <td><span className={`rp rp-${r.result}`}>{RESULT_LABEL[r.result]}</span></td>
            <td className="num">{r.tokensIn} / {r.tokensOut}</td>
            <td className="num">${r.cost.toFixed(4)}</td>
            <td className="num">{(r.latencyMs / 1000).toFixed(2)} s</td>
          </tr>
        );
      })}
    </tbody>
  );
}
