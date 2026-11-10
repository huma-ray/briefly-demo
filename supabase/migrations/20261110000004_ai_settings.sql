-- Custom model endpoint per workspace (bring your own OpenAI-compatible model).
-- Members can see which model is active; only Admins can change it. The encrypted
-- key column is never readable by people: the chat route reads it with the service role.

create table ai_settings (
  workspace_id uuid primary key references workspaces on delete cascade,
  base_url text not null check (base_url ~ '^https?://' and length(base_url) <= 500),
  model text not null check (length(btrim(model)) between 1 and 200),
  api_key_enc text,
  key_hint text check (length(key_hint) <= 4),
  updated_by uuid references members on delete set null,
  updated_at timestamptz not null default now()
);

alter table ai_settings enable row level security;
create policy ai_settings_read on ai_settings for select using (is_ws_member(workspace_id));
create policy ai_settings_insert on ai_settings for insert with check (is_ws_admin(workspace_id));
create policy ai_settings_update on ai_settings for update using (is_ws_admin(workspace_id)) with check (is_ws_admin(workspace_id));
create policy ai_settings_delete on ai_settings for delete using (is_ws_admin(workspace_id));

revoke select on ai_settings from anon, authenticated;
grant select (workspace_id, base_url, model, key_hint, updated_by, updated_at) on ai_settings to authenticated;
