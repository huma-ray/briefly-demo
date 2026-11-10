import { Suspense } from "react";
import { AppProvider } from "@/components/app-state";
import { Shell } from "@/components/shell";
import { getContext } from "@/lib/context";
import { defaultModelId } from "@/lib/ai/provider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  const [mine, unread] = await Promise.all([
    ctx.supabase.from("tasks").select("id", { count: "exact", head: true }).eq("assignee_id", ctx.me.id).neq("status", "done"),
    ctx.supabase
      .from("activity")
      .select("id", { count: "exact", head: true })
      .gt("created_at", ctx.me.inboxSeenAt)
      .neq("actor_id", ctx.me.id),
  ]);

  return (
    // useSearchParams in the provider needs a boundary
    <Suspense>
      <AppProvider
        data={{
          workspaceName: ctx.workspace.name,
          me: ctx.me,
          role: ctx.me.role,
          members: ctx.members,
          projects: ctx.projects,
          labels: ctx.labels,
          counts: ctx.counts,
          myOpenTasks: mine.count ?? 0,
          inboxUnread: unread.count ?? 0,
          modelId: ctx.aiSettings?.model ?? defaultModelId,
          provider: ctx.aiSettings,
          defaultModelId,
          sourceUrl: process.env.NEXT_PUBLIC_SOURCE_URL ?? "https://github.com/",
        }}
      >
        <Shell>{children}</Shell>
      </AppProvider>
    </Suspense>
  );
}
