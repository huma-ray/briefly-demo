// End-to-end permission check against a running Supabase (local or hosted).
// Run: npm run check:rls   (reads .env.local)
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, service, opts);

async function visitor() {
  const sb = createClient(url, anon, opts);
  const { error } = await sb.auth.signInAnonymously();
  assert.ifError(error);
  const { data: ws, error: e2 } = await sb.rpc("demo_ensure_sandbox");
  assert.ifError(e2);
  const { data: me } = await sb.from("members").select("id, name, role").not("user_id", "is", null).single();
  return { sb, ws, me };
}

const tasksOf = async (sb, key) => {
  const { data, error } = await sb.from("tasks").select("id, number, projects!inner(key)").eq("projects.key", key);
  assert.ifError(error);
  return data;
};

const a = await visitor();
const b = await visitor();

// Isolation
assert.notEqual(a.ws, b.ws, "each visitor gets their own sandbox");
assert.equal(a.me.name, "Alex Kim");
const { data: aCreated } = await a.sb.from("tasks")
  .insert({ project_id: (await a.sb.from("projects").select("id").eq("key", "WEB").single()).data.id, title: "Only for A" })
  .select("id").single();
const { data: seenByB } = await b.sb.from("tasks").select("id").eq("id", aCreated.id);
assert.equal(seenByB.length, 0, "B cannot read A's task");
const { data: bActivity } = await b.sb.from("activity").select("id").eq("workspace_id", a.ws);
assert.equal(bActivity.length, 0, "B cannot read A's activity");

// Member scope
assert.equal((await tasksOf(a.sb, "MOB")).length, 0, "Member sees no MOB tasks");
assert.equal((await tasksOf(a.sb, "WEB")).length, 12, "Member sees WEB (11 seeded + 1 created)");
const { data: counts } = await a.sb.rpc("project_counts");
assert.deepEqual(counts[0], { visible: 2, total: 3 });
const { data: access } = await a.sb.rpc("project_access", { project_key: "MOB" });
assert.equal(access, "hidden");

// Member cannot write into MOB, even by id
const { data: mobId } = await admin.from("projects").select("id").eq("workspace_id", a.ws).eq("key", "MOB").single();
const { error: insErr } = await a.sb.from("tasks").insert({ project_id: mobId.id, title: "sneaky" });
assert.ok(insErr, "Member insert into MOB is rejected");

// Admin scope
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "admin" })).error);
assert.equal((await tasksOf(a.sb, "MOB")).length, 6, "Admin sees MOB");
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "member" })).error);

// Approval commit: proposal made while Admin, approved as Member -> refused, nothing written
const { data: run } = await admin.from("agent_runs")
  .insert({ workspace_id: a.ws, member_id: a.me.id, role: "admin", prompt: "t", model: "test" })
  .select("id").single();
const mobTask = (await tasksOf(admin, "MOB")).find(() => true);
const proposal = async (tool, payload) =>
  (await admin.from("pending_actions").insert({
    workspace_id: a.ws, member_id: a.me.id, run_id: run.id, tool_call_id: crypto.randomUUID(), tool, payload,
  }).select("id").single()).data.id;

const mobProposal = await proposal("create_task", { tasks: [{ project_id: mobId.id, title: "From admin time" }] });
const { error: commitErr } = await a.sb.rpc("commit_pending_action", { action_id: mobProposal });
assert.ok(commitErr, "commit as Member into MOB fails");
const { data: stillPending } = await admin.from("pending_actions").select("status").eq("id", mobProposal).single();
assert.equal(stillPending.status, "pending", "failed commit rolls back the status flip");
void mobTask;

// Approvals queue: a person lists only their own undecided proposals
const { data: aQueue } = await a.sb.from("pending_actions").select("id").eq("status", "pending");
assert.ok(aQueue.some((r) => r.id === mobProposal), "the owner sees their pending proposal in the queue");
const { data: bQueue } = await b.sb.from("pending_actions").select("id").eq("status", "pending");
assert.ok(!bQueue.some((r) => r.id === mobProposal), "another visitor cannot see it");
assert.ok((await b.sb.rpc("commit_pending_action", { action_id: mobProposal })).error || (await admin.from("pending_actions").select("status").eq("id", mobProposal).single()).data.status === "pending", "another visitor cannot commit it");

// Simulated Slack: per-sandbox, post only as yourself, only status is writable
const { data: aThreads } = await a.sb.from("slack_threads").select("id, channel, status").order("created_at");
assert.equal(aThreads.filter((t) => t.status === "waiting").length, 3, "a fresh sandbox has 3 threads waiting for a reply");
const partner = aThreads.find((t) => t.channel === "#partner-kr");
const { data: bSees } = await b.sb.from("slack_threads").select("id").eq("id", partner.id);
assert.equal(bSees.length, 0, "another visitor cannot read the thread");
const { data: bMsgs } = await b.sb.from("slack_messages").select("id").eq("thread_id", partner.id);
assert.equal(bMsgs.length, 0, "nor its messages");
const { error: impersonate } = await a.sb.from("slack_messages").insert({ workspace_id: a.ws, thread_id: partner.id, author_member_id: (await admin.from("members").select("id").eq("workspace_id", a.ws).is("user_id", null).limit(1).single()).data.id, author_name: "x", author_initials: "x", body: "hi" });
assert.ok(impersonate, "cannot post as another member");
const { error: scriptEdit } = await a.sb.from("slack_threads").update({ channel: "#hacked" }).eq("id", partner.id);
assert.ok(scriptEdit, "cannot change a thread's channel or script");
const replyRunRes = await admin.from("agent_runs").insert({ workspace_id: a.ws, member_id: a.me.id, role: "member", prompt: "reply", model: "x" }).select("id").single();
assert.ifError(replyRunRes.error);
const replyRun = replyRunRes.data;
const replyRes = await admin.from("pending_actions").insert({ workspace_id: a.ws, member_id: a.me.id, run_id: replyRun.id, tool_call_id: "r1", tool: "reply_in_thread", payload: { thread_id: partner.id, text: "Draft" } }).select("id").single();
assert.ifError(replyRes.error);
const replyId = replyRes.data.id;
const r1 = await a.sb.rpc("commit_pending_action", { action_id: replyId, edits: { text: "안녕하세요, 사이즈 보내드립니다" } });
assert.ifError(r1.error);
const r2 = await a.sb.rpc("commit_pending_action", { action_id: replyId });
assert.equal(r2.data.already, true, "a reply posts at most once");
const { data: posted } = await a.sb.from("slack_messages").select("body, lang, author_member_id").eq("thread_id", partner.id).eq("author_member_id", a.me.id);
assert.deepEqual(posted.map((m) => [m.body, m.lang]), [["안녕하세요, 사이즈 보내드립니다", "ko"]], "the edited Korean reply is posted once, as the approver");
const { data: done } = await a.sb.from("slack_threads").select("status").eq("id", partner.id).single();
assert.equal(done.status, "done", "posting resolves the thread");

// Approval commit: happy path, edited title, idempotent
const webId = (await a.sb.from("projects").select("id").eq("key", "WEB").single()).data.id;
const okProposal = await proposal("create_task", { tasks: [{ project_id: webId, title: "Pricing page" }, { project_id: webId, title: "Email sequence" }] });
const first = await a.sb.rpc("commit_pending_action", { action_id: okProposal, edits: { titles: ["Pricing page v2"] } });
assert.ifError(first.error);
assert.deepEqual(first.data.result.tasks.map((t) => t.key), ["WEB-27", "WEB-28"]);
const second = await a.sb.rpc("commit_pending_action", { action_id: okProposal });
assert.equal(second.data.already, true, "second approve is a no-op");
const { data: created } = await a.sb.from("tasks").select("title, last_source").in("number", [27, 28]).eq("project_id", webId).order("number");
assert.deepEqual(created, [{ title: "Pricing page v2", last_source: "assistant" }, { title: "Email sequence", last_source: "assistant" }]);
const { data: viaAssistant } = await a.sb.from("activity").select("source").eq("kind", "created").eq("source", "assistant");
assert.equal(viaAssistant.length, 2, "activity marks assistant source");

// People cannot forge proposals or log rows
const { error: forge } = await a.sb.from("pending_actions").insert({ workspace_id: a.ws, member_id: a.me.id, run_id: run.id, tool_call_id: "x", tool: "create_task", payload: {} });
assert.ok(forge, "people cannot insert proposals");
const { error: forgeRun } = await a.sb.from("agent_runs").insert({ workspace_id: a.ws, member_id: a.me.id, role: "member", prompt: "x", model: "x" });
assert.ok(forgeRun, "people cannot insert runs");

// Runs: Member sees own, Admin sees all (B cannot see A's)
assert.equal((await a.sb.from("agent_runs").select("id")).data.length, 2); // the task-proposal run and the reply run
assert.equal((await b.sb.from("agent_runs").select("id")).data.length, 0);

// Server-only functions
assert.ok((await a.sb.rpc("demo_reset")).error, "people cannot reset");
assert.ok((await a.sb.rpc("record_usage", { cost: 1 })).error, "people cannot record usage");

// Agent log visibility (8.3): Admin sees all runs of the workspace, Member only their own
const { data: otherMember } = await admin.from("members").select("id").eq("workspace_id", a.ws).is("user_id", null).limit(1).single();
assert.ifError((await admin.from("agent_runs").insert({ workspace_id: a.ws, member_id: otherMember.id, role: "member", prompt: "someone else", model: "test" })).error);
assert.equal((await a.sb.from("agent_runs").select("id")).data.length, 2, "Member sees only own runs");
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "admin" })).error);
assert.equal((await a.sb.from("agent_runs").select("id")).data.length, 3, "Admin sees all runs in the workspace");
assert.equal((await b.sb.from("agent_runs").select("id")).data.length, 0, "other workspace sees none");
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "member" })).error);

// Custom model endpoint: Admin-only writes, the encrypted key is never readable by people
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "member" })).error);
const memberSave = await a.sb.from("ai_settings").insert({ workspace_id: a.ws, base_url: "https://llm.example.com/v1", model: "m" });
assert.ok(memberSave.error, "Member cannot set the provider");
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "admin" })).error);
assert.ifError((await a.sb.from("ai_settings").insert({ workspace_id: a.ws, base_url: "https://llm.example.com/v1", model: "x" })).error);
const adminSave = await a.sb.from("ai_settings").update({ model: "m", api_key_enc: "sealed", key_hint: "abcd" }, { count: "exact" }).eq("workspace_id", a.ws);
assert.ifError(adminSave.error);
assert.equal(adminSave.count, 1, "Admin can update the provider and set a key");
assert.ok((await a.sb.from("ai_settings").select("api_key_enc")).error, "people cannot select the encrypted key");
assert.deepEqual((await a.sb.from("ai_settings").select("model, key_hint").single()).data, { model: "m", key_hint: "abcd" });
assert.equal((await b.sb.from("ai_settings").select("model")).data.length, 0, "other visitors do not see it");
assert.ifError((await a.sb.rpc("demo_set_role", { new_role: "member" })).error);
assert.equal((await a.sb.from("ai_settings").delete({ count: "exact" }).eq("workspace_id", a.ws)).count, 0, "Member cannot clear it");

// Clean up the two sandboxes
for (const v of [a, b]) {
  const { data: u } = await v.sb.auth.getUser();
  await admin.from("workspaces").delete().eq("id", v.ws);
  await admin.auth.admin.deleteUser(u.user.id);
}
console.log("check:rls passed");
