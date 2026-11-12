import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Reached when the session points at a user removed by the nightly reset.
// Clearing it lets proxy.ts start a fresh anonymous session and sandbox.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/today", request.url));
}
