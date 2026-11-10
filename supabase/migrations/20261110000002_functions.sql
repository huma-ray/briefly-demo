-- Briefly: demo sandbox, role toggle, visibility helpers, approval commit,
-- usage accounting and the nightly reset.

-- Template for every visitor's sandbox. Not exposed through the API.
create schema seed;
revoke all on schema seed from public, anon, authenticated;

create table seed.members (key text primary key, name text, handle text, initials text, avatar smallint, role text, is_visitor boolean default false, sort int);
create table seed.projects (key text primary key, name text, color smallint, next_number int, position int);
create table seed.project_members (project_key text, member_key text);
create table seed.labels (name text primary key, color smallint);
create table seed.tasks (project_key text, number int, title text, description text, status text, priority smallint, label text, due_offset int, assignee_key text, position float8);
-- minutes_ago keeps the Inbox fresh whenever the sandbox is created
create table seed.activity (project_key text, task_number int, actor_key text, kind text, field text, old_value text, new_value text, minutes_ago int);

-- Deterministic ids per sandbox: no mapping tables needed while copying.
-- Version (4) and variant (8) nibbles are set so strict UUID validators accept them.
create function seed_id(ws uuid, kind text, k text) returns uuid
language sql immutable as $$
  select (substr(h, 1, 12) || '4' || substr(h, 14, 3) || '8' || substr(h, 18, 15))::uuid
  from md5(ws::text || ':' || kind || ':' || k) h
$$;

-- Idempotent: returns the caller's workspace, creating a fresh copy on first use.
create function demo_ensure_sandbox() returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  ws uuid;
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select workspace_id into ws from members where user_id = uid;
  if ws is not null then return ws; end if;

  perform pg_advisory_xact_lock(hashtext(uid::text));
  select workspace_id into ws from members where user_id = uid;
  if ws is not null then return ws; end if;

  perform set_config('briefly.seeding', 'on', true);
  insert into workspaces (name) values ('Northwind Studio') returning id into ws;

  insert into members (id, workspace_id, user_id, name, handle, initials, avatar, role, inbox_seen_at)
  select seed_id(ws, 'm', key), ws, case when is_visitor then uid end, name, handle, initials, avatar, role,
         now() - interval '1 day'
  from seed.members;

  insert into projects (id, workspace_id, key, name, color, next_number, position)
  select seed_id(ws, 'p', key), ws, key, name, color, next_number, position from seed.projects;

  insert into project_members (project_id, member_id)
  select seed_id(ws, 'p', project_key), seed_id(ws, 'm', member_key) from seed.project_members;

  insert into labels (id, workspace_id, name, color)
  select seed_id(ws, 'l', name), ws, name, color from seed.labels;

  insert into tasks (id, project_id, number, title, description, status, priority, label_id, due_date, assignee_id, position)
  select seed_id(ws, 't', project_key || '-' || number), seed_id(ws, 'p', project_key), number, title, description,
         status, priority, case when label is not null then seed_id(ws, 'l', label) end,
         case when due_offset is not null then today + due_offset end,
         case when assignee_key is not null then seed_id(ws, 'm', assignee_key) end, position
  from seed.tasks;

  insert into activity (workspace_id, project_id, task_id, actor_id, source, kind, field, old_value, new_value, created_at)
  select ws, seed_id(ws, 'p', project_key), seed_id(ws, 't', project_key || '-' || task_number),
         seed_id(ws, 'm', actor_key), 'ui', kind, field, old_value, new_value,
         now() - make_interval(mins => minutes_ago)
  from seed.activity;

  perform set_config('briefly.seeding', 'off', true);
  return ws;
end $$;

-- The View as toggle: only in demo workspaces, only your own membership.
create function demo_set_role(new_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if new_role not in ('admin', 'member') then raise exception 'invalid role'; end if;
  update members m set role = new_role
  from workspaces w
  where m.workspace_id = w.id and w.is_demo and m.user_id = auth.uid();
  if not found then raise exception 'no demo membership'; end if;
end $$;

create function mark_inbox_seen() returns void
language sql security definer set search_path = public as $$
  update members set inbox_seen_at = now() where user_id = auth.uid()
$$;

-- "can see 2 of 3 projects" without exposing anything else about hidden ones.
create function project_counts() returns table (visible int, total int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where can_see_project(p.id))::int, count(*)::int
  from projects p join members m on m.workspace_id = p.workspace_id
  where m.user_id = auth.uid()
$$;

-- Lets the assistant say "no access" instead of "no such project", returning no rows.
create function project_access(project_key text) returns text
language sql stable security definer set search_path = public as $$
  select case
    when p.id is null then 'missing'
    when can_see_project(p.id) then 'visible'
    else 'hidden' end
  from (select 1) one
  left join members m on m.user_id = auth.uid()
  left join projects p on p.workspace_id = m.workspace_id and p.key = upper(project_key)
$$;

-- Applies an approved proposal. SECURITY INVOKER on purpose: RLS checks the
-- writes exactly as for a manual change. All or nothing; at most once.
create function commit_pending_action(action_id uuid, edits jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  a pending_actions;
  me uuid;
  item jsonb;
  i int := 0;
  out_tasks jsonb := '[]';
  t record;
  ids uuid[];
  n int;
begin
  -- Lock the pending row; a concurrent second approve waits here, then finds it
  -- decided (RLS only lets people update pending rows) and returns the stored outcome.
  select * into a from pending_actions where id = action_id and status = 'pending' for update;
  if not found then
    select * into a from pending_actions where id = action_id;
    if not found then raise exception 'proposal not found' using hint = 'not_found'; end if;
    return jsonb_build_object('status', a.status, 'result', a.result, 'already', true);
  end if;
  me := my_member_id(a.workspace_id);

  perform set_config('briefly.source', 'assistant', true);

  if a.tool = 'create_task' then
    for item in select * from jsonb_array_elements(a.payload -> 'tasks') loop
      insert into tasks (project_id, title, description, status, priority, label_id, due_date, assignee_id)
      values (
        (item ->> 'project_id')::uuid,
        btrim(coalesce(edits -> 'titles' ->> i, item ->> 'title')),
        coalesce(item ->> 'description', ''),
        coalesce(item ->> 'status', 'todo'),
        coalesce((item ->> 'priority')::smallint, 0),
        (item ->> 'label_id')::uuid,
        (item ->> 'due_date')::date,
        (item ->> 'assignee_id')::uuid)
      returning id, number, project_id into t;
      out_tasks := out_tasks || jsonb_build_object('id', t.id,
        'key', (select key from projects where id = t.project_id) || '-' || t.number);
      i := i + 1;
    end loop;
  else
    ids := array(select (x ->> 'id')::uuid from jsonb_array_elements(a.payload -> 'tasks') x);
    if a.tool = 'update_task_status' then
      update tasks set status = a.payload ->> 'status' where id = any(ids);
    else
      update tasks set assignee_id = (a.payload ->> 'assignee_id')::uuid where id = any(ids);
    end if;
    get diagnostics n = row_count;
    if n <> cardinality(ids) then
      raise exception 'no access to one or more tasks' using hint = 'no_access';
    end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', tk.id, 'key', p.key || '-' || tk.number)), '[]')
    into out_tasks from tasks tk join projects p on p.id = tk.project_id where tk.id = any(ids);
  end if;

  update pending_actions
  set status = 'approved', decided_by = me, decided_at = now(), result = jsonb_build_object('tasks', out_tasks)
  where id = action_id;
  return jsonb_build_object('status', 'approved', 'result', jsonb_build_object('tasks', out_tasks));
end $$;

-- Server-only bookkeeping.
create function record_usage(cost numeric) returns void
language sql security definer set search_path = public as $$
  insert into usage_daily (day, runs, cost_usd)
  values ((now() at time zone 'Asia/Seoul')::date, 1, cost)
  on conflict (day) do update set runs = usage_daily.runs + 1, cost_usd = usage_daily.cost_usd + excluded.cost_usd
$$;

create function demo_reset() returns jsonb
language plpgsql security definer set search_path = public as $$
declare w int; u int;
begin
  delete from workspaces where is_demo;
  get diagnostics w = row_count;
  delete from auth.users where is_anonymous;
  get diagnostics u = row_count;
  return jsonb_build_object('workspaces', w, 'users', u);
end $$;

revoke execute on function record_usage(numeric), demo_reset() from public, anon, authenticated;
grant execute on function record_usage(numeric), demo_reset() to service_role;
revoke execute on function seed_id(uuid, text, text) from public, anon, authenticated;
