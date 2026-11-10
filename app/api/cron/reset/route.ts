import { createAdminClient } from "@/lib/supabase/server";

// Nightly reset (03:00 KST, see vercel.json): drops demo workspaces and anonymous users.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { data, error } = await createAdminClient().rpc("demo_reset");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
