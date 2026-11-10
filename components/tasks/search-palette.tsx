"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { searchIndex, type SearchIndex } from "@/app/actions/tasks";
import { useApp } from "@/components/app-state";
import { StatusIcon } from "@/components/bits";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

/** ⌘K palette: tasks by key or title, projects by name. */
export function SearchPalette() {
  const { searchOpen, setSearchOpen, openTask } = useApp();
  const router = useRouter();
  const [index, setIndex] = useState<SearchIndex>();

  useEffect(() => {
    if (searchOpen) searchIndex().then(setIndex);
  }, [searchOpen]);

  return (
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Search" description="Find tasks and projects">
      <Command>
        <CommandInput placeholder="Search tasks and projects…" />
        <CommandList>
          <CommandEmpty>{index ? "No results." : "Loading…"}</CommandEmpty>
          <CommandGroup heading="Projects">
            {index?.projects.map((p) => (
              <CommandItem
                key={p.key}
                value={`${p.key} ${p.name}`}
                onSelect={() => {
                  setSearchOpen(false);
                  router.push(`/p/${p.key}/board`);
                }}
              >
                {p.name}
                <span className="ml-auto font-mono text-xs text-[var(--faint)]">{p.key}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tasks">
            {index?.tasks.map((t) => (
              <CommandItem
                key={t.key}
                value={`${t.key} ${t.title}`}
                onSelect={() => {
                  setSearchOpen(false);
                  openTask(t.key);
                }}
              >
                <StatusIcon status={t.status} />
                <span className="shrink-0 whitespace-nowrap font-mono text-xs text-[var(--faint)]">{t.key}</span>
                <span className="truncate">{t.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
