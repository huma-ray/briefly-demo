import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Label, Member, Project, Role } from "@/lib/model";
import { seedBriefing } from "@/lib/agent/briefing";

/**
 * Everything a page needs about the visitor and their sandbox, read once per
 * request with the visitor's own client (RLS decides what comes back).
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/api/session/reset");

  const { data: workspaceId, error } = await supabase.rpc("demo_ensure_sandbox");
  // A session whose user was removed by the nightly reset: start over.
  if (error || !workspaceId) redirect("/api/session/reset");

  const [ws, members, projects, labels, mine, counts, ai] = await Promise.all([
    supabase.from("workspaces").select("id, name, briefing_seeded_at").eq("id", workspaceId).single(),
    supabase.from("members").select("id, name, handle, initials, avatar, role, user_id, inbox_seen_at").order("name"),
    supabase.from("projects").select("id, key, name, color, position").order("position"),
    supabase.from("labels").select("id, name, color").order("name"),
    supabase.from("project_members").select("project_id, members!inner(user_id)").eq("members.user_id", userId),
    supabase.rpc("project_counts").single(),
    supabase.from("ai_settings").select("base_url, model, key_hint").eq("workspace_id", workspaceId).maybeSingle(),
  ]);

  const meRow = members.data?.find((m) => m.user_id === userId);
  if (!ws.data || !meRow) redirect("/api/session/reset");
  const memberOf = new Set((mine.data ?? []).map((r) => r.project_id));

  const me: Member & { inboxSeenAt: string } = {
    id: meRow.id,
    name: meRow.name,
    handle: meRow.handle,
    initials: meRow.initials,
    avatar: meRow.avatar,
    role: meRow.role as Role,
    inboxSeenAt: meRow.inbox_seen_at,
  };

  const ctx = {
    supabase,
    userId,
    workspace: ws.data,
    me,
    members: (members.data ?? []).map(
      (m): Member => ({ id: m.id, name: m.name, handle: m.handle, initials: m.initials, avatar: m.avatar, role: m.role as Role }),
    ),
    projects: (projects.data ?? []).map((p) => ({ ...p, adminOnly: !memberOf.has(p.id) })) as Project[],
    labels: (labels.data ?? []) as Label[],
    counts: counts.data ?? { visible: 0, total: 0 },
    /** Custom model endpoint, if an Admin set one. The key itself is never readable here. */
    aiSettings: ai.data ? { baseUrl: ai.data.base_url, model: ai.data.model, keyHint: ai.data.key_hint } : null,
  };
  // A new sandbox opens with a briefing and one ready-to-approve card (once per workspace).
  // Done here, inside the per-request cache, so the layout and the page both see it.
  if (!ws.data.briefing_seeded_at) await seedBriefing(ctx);
  return ctx;
});

export type Context = Awaited<ReturnType<typeof getContext>>;
