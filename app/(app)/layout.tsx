import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "../globals.css";
import { AppProvider } from "@/components/app-state";
import { Shell } from "@/components/shell";
import { getContext } from "@/lib/context";
import { defaultModelId } from "@/lib/ai/provider";
import { DEMO_MODEL_ID, demoScripted } from "@/lib/agent/demo-model";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Briefly",
  description:
    "A small team task tracker with an assistant that asks before it writes.",
};

// Root layout of the app (the homepage in (site) has its own, so their CSS never mixes).
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getContext();
  const scripted = demoScripted() && !ctx.aiSettings;
  const [mine, unread, pending] = await Promise.all([
    ctx.supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee_id", ctx.me.id)
      .neq("status", "done"),
    ctx.supabase
      .from("activity")
      .select("id", { count: "exact", head: true })
      .gt("created_at", ctx.me.inboxSeenAt)
      .neq("actor_id", ctx.me.id),
    ctx.supabase
      .from("pending_actions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {/* useSearchParams in the provider needs a boundary */}
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
              pendingApprovals: pending.count ?? 0,
              modelId:
                ctx.aiSettings?.model ??
                (scripted ? DEMO_MODEL_ID : defaultModelId),
              provider: ctx.aiSettings,
              defaultModelId,
              sourceUrl:
                process.env.NEXT_PUBLIC_SOURCE_URL ??
                "https://github.com/huma-ray/briefly-demo",
              scripted,
            }}
          >
            <Shell>{children}</Shell>
          </AppProvider>
        </Suspense>
      </body>
    </html>
  );
}
