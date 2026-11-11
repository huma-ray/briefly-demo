"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getContext } from "@/lib/context";

/** Mark done / reopen a simulated Slack thread. RLS: workspace members, `status` column only. */
export async function setThreadStatus(id: string, status: "waiting" | "done"): Promise<{ ok: boolean }> {
  const p = z.object({ id: z.uuid(), status: z.enum(["waiting", "done"]) }).safeParse({ id, status });
  if (!p.success) return { ok: false };
  const { supabase } = await getContext();
  const { data, error } = await supabase.from("slack_threads").update({ status }).eq("id", id).eq("mentions_me", true).select("id");
  revalidatePath("/", "layout");
  return { ok: !error && !!data?.length };
}
