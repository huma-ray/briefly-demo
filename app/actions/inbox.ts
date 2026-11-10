"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Opening the Inbox clears the sidebar count. */
export async function markInboxSeen() {
  const supabase = await createClient();
  await supabase.rpc("mark_inbox_seen");
  revalidatePath("/", "layout");
}
