-- Briefly: schema, task triggers and row level security.
-- Permission model: every read and write from the UI or the assistant runs as the
-- signed-in visitor, so these policies are the permission filter. Log tables are
-- read-only for people; the server writes them with the service role.

create table workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Seoul',
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  user_id uuid unique references auth.users on delete cascade,
  name text not null,
  handle text not null,
  initials text not null,
  avatar smallint not null check (avatar between 1 and 5),
  role text not null default 'member' check (role in ('admin', 'member')),
  inbox_seen_at timestamptz not null default now(),
  unique (workspace_id, handle)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  key text not null check (key ~ '^[A-Z]{2,5}$'),
  name text not null,
  color smallint not null check (color between 1 and 5),
  next_number int not null default 1,
  position int not null default 0,
  unique (workspace_id, key)
);

create table project_members (
  project_id uuid not null references projects on delete cascade,
  member_id uuid not null references members on delete cascade,
  primary key (project_id, member_id)
);

create table labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  name text not null,
  color smallint not null check (color between 1 and 5),
  unique (workspace_id, name)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  number int not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  description text not null default '' check (length(description) <= 5000),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  priority smallint not null default 0 check (priority between 0 and 4),
  label_id uuid references labels on delete set null,
  due_date date,
  assignee_id uuid references members on delete set null,
  position float8 not null,
  last_source text not null default 'ui' check (last_source in ('ui', 'assistant')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number)
);
create index tasks_project_status on tasks (project_id, status, position);
create index tasks_assignee on tasks (assignee_id);

create table activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  project_id uuid not null references projects on delete cascade,
  task_id uuid not null references tasks on delete cascade,
  actor_id uuid references members on delete set null,
  source text not null check (source in ('ui', 'assistant')),
  kind text not null check (kind in ('created', 'updated')),
  field text,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
create index activity_ws_time on activity (workspace_id, created_at desc);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  member_id uuid not null references members on delete cascade,
  title text not null default 'New conversation',
  messages jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_member on conversations (member_id, updated_at desc);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  member_id uuid not null references members on delete cascade,
  role text not null,
  conversation_id uuid references conversations on delete set null,
  prompt text not null,
  model text not null,
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  latency_ms int,
  result text not null default 'read'
    check (result in ('await', 'approved', 'cancelled', 'read', 'blocked', 'error')),
  error text,
  approver_id uuid references members on delete set null,
  approval_wait_ms int,
  created_at timestamptz not null default now()
);
create index agent_runs_ws_time on agent_runs (workspace_id, created_at desc);
create index agent_runs_member_time on agent_runs (member_id, created_at desc);

create table agent_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references agent_runs on delete cascade,
  tool_call_id text not null,
  name text not null,
  kind text not null check (kind in ('read', 'write')),
  args jsonb not null default '{}',
  result jsonb,
  error text,
  status text not null check (status in ('ok', 'error', 'blocked', 'pending', 'approved', 'cancelled')),
  rows int,
  duration_ms int,
  created_at timestamptz not null default now()
);
create index agent_tool_calls_run on agent_tool_calls (run_id);

create table pending_actions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces on delete cascade,
  member_id uuid not null references members on delete cascade,
  run_id uuid not null references agent_runs on delete cascade,
  conversation_id uuid references conversations on delete cascade,
  tool_call_id text not null,
  tool text not null check (tool in ('create_task', 'update_task_status', 'assign_task')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'cancelled', 'failed')),
  result jsonb,
  decided_by uuid references members on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- Survives the nightly reset so the monthly spend cap is real.
create table usage_daily (
  day date primary key,
  runs int not null default 0,
  cost_usd numeric(12, 6) not null default 0
);

-- ---------------------------------------------------------------- helpers

create function my_member_id(ws uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from members where workspace_id = ws and user_id = auth.uid()
$$;

create function is_ws_member(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid())
$$;

create function is_ws_admin(ws uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where workspace_id = ws and user_id = auth.uid() and role = 'admin')
$$;

create function can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects pr
    join members m on m.workspace_id = pr.workspace_id and m.user_id = auth.uid()
    where pr.id = p
      and (m.role = 'admin'
           or exists (select 1 from project_members pm where pm.project_id = p and pm.member_id = m.id))
  )
$$;

-- ---------------------------------------------------------------- task triggers

-- Key numbers, default position, assignee rule, source tag. Runs before RLS
-- checks the new row. Security definer only to bump projects.next_number.
create function tasks_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  src text := coalesce(nullif(current_setting('briefly.source', true), ''), 'ui');
begin
  if tg_op = 'INSERT' then
    if new.number is null then
      update projects set next_number = next_number + 1
      where id = new.project_id
      returning next_number - 1 into new.number;
    end if;
    if new.position is null then
      select coalesce(min(position), 1000) - 1000 into new.position
      from tasks where project_id = new.project_id and status = new.status;
    end if;
    new.last_source := src;
  else
    if new.project_id <> old.project_id or new.number <> old.number then
      raise exception 'task project and key cannot change';
    end if;
    if (new.title, new.description, new.status, new.priority, new.label_id, new.due_date, new.assignee_id)
       is distinct from
       (old.title, old.description, old.status, old.priority, old.label_id, old.due_date, old.assignee_id) then
      new.last_source := src;
      new.updated_at := now();
    end if;
  end if;

  if new.assignee_id is not null
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id)
     and not exists (select 1 from project_members where project_id = new.project_id and member_id = new.assignee_id) then
    raise exception 'assignee is not a member of this project' using errcode = 'P0001', hint = 'assignee_not_member';
  end if;
  return new;
end $$;

create trigger tasks_before_write before insert or update on tasks
for each row execute function tasks_before_write();

-- One activity row per changed field, written in the same transaction.
create function tasks_log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  src text := coalesce(nullif(current_setting('briefly.source', true), ''), 'ui');
  ws uuid;
  actor uuid;
  f text; o text; n text;
begin
  if current_setting('briefly.seeding', true) = 'on' then return null; end if;
  select workspace_id into ws from projects where id = new.project_id;
  actor := (select id from members where workspace_id = ws and user_id = auth.uid());

  if tg_op = 'INSERT' then
    insert into activity (workspace_id, project_id, task_id, actor_id, source, kind, new_value)
    values (ws, new.project_id, new.id, actor, src, 'created', new.title);
    return null;
  end if;

  for f, o, n in
    select * from (values
      ('title', old.title, new.title),
      ('description', old.description, new.description),
      ('status', old.status, new.status),
      ('priority', old.priority::text, new.priority::text),
      ('label', (select name from labels where id = old.label_id), (select name from labels where id = new.label_id)),
      ('due_date', old.due_date::text, new.due_date::text),
      ('assignee', (select name from members where id = old.assignee_id), (select name from members where id = new.assignee_id))
    ) v(vf, vo, vn)
    where vo is distinct from vn
  loop
    insert into activity (workspace_id, project_id, task_id, actor_id, source, kind, field, old_value, new_value)
    values (ws, new.project_id, new.id, actor, src, 'updated', f, o, n);
  end loop;
  return null;
end $$;

create trigger tasks_log_activity after insert or update on tasks
for each row execute function tasks_log_activity();

-- ---------------------------------------------------------------- RLS

alter table workspaces enable row level security;
alter table members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table labels enable row level security;
alter table tasks enable row level security;
alter table activity enable row level security;
alter table conversations enable row level security;
alter table agent_runs enable row level security;
alter table agent_tool_calls enable row level security;
alter table pending_actions enable row level security;
alter table usage_daily enable row level security;

create policy ws_read on workspaces for select using (is_ws_member(id));
create policy members_read on members for select using (is_ws_member(workspace_id));
create policy labels_read on labels for select using (is_ws_member(workspace_id));
create policy projects_read on projects for select using (can_see_project(id));
create policy project_members_read on project_members for select using (can_see_project(project_id));

create policy tasks_read on tasks for select using (can_see_project(project_id));
create policy tasks_insert on tasks for insert with check (can_see_project(project_id));
create policy tasks_update on tasks for update using (can_see_project(project_id)) with check (can_see_project(project_id));

create policy activity_read on activity for select using (can_see_project(project_id));

create policy conversations_own on conversations for all
  using (member_id = my_member_id(workspace_id))
  with check (member_id = my_member_id(workspace_id));

create policy runs_read on agent_runs for select
  using (member_id = my_member_id(workspace_id) or is_ws_admin(workspace_id));
create policy tool_calls_read on agent_tool_calls for select
  using (exists (select 1 from agent_runs r where r.id = run_id
                 and (r.member_id = my_member_id(r.workspace_id) or is_ws_admin(r.workspace_id))));

-- Proposals are created by the server; a person can only decide their own.
create policy pending_read on pending_actions for select using (member_id = my_member_id(workspace_id));
create policy pending_decide on pending_actions for update
  using (member_id = my_member_id(workspace_id) and status = 'pending')
  with check (member_id = my_member_id(workspace_id));
revoke update on pending_actions from anon, authenticated;
grant update (status, result, decided_by, decided_at) on pending_actions to authenticated;

-- Task deletes are not a feature; no policy means no deletes.
revoke delete on tasks, activity, agent_runs, agent_tool_calls from anon, authenticated;
