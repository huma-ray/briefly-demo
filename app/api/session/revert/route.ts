import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// "Revert all changes" in the demo strip: drop this visitor's sandbox and anonymous user,
// then start over. The next page load gets a new anonymous session and a fresh sandbox.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  await supabase.auth.signOut({ scope: "local" });
  // Only an anonymous demo visitor, and only their own demo workspace.
  if (claims?.sub && claims.is_anonymous) {
    const admin = createAdminClient();
    const { data: me } = await admin.from("members").select("workspace_id").eq("user_id", claims.sub).maybeSingle();
    if (me) await admin.from("workspaces").delete().eq("id", me.workspace_id).eq("is_demo", true);
    await admin.auth.admin.deleteUser(claims.sub);
  }
  return NextResponse.redirect(new URL("/today?welcome=1", request.url), 303);
}
