"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** View as Member / Admin: changes the visitor's real role in their sandbox. */
export async function setRole(role: "admin" | "member") {
  const parsed = z.enum(["admin", "member"]).parse(role);
  const supabase = await createClient();
  const { error } = await supabase.rpc("demo_set_role", { new_role: parsed });
  if (error) return { error: "Could not switch role." };
  revalidatePath("/", "layout");
  return { ok: true };
}
