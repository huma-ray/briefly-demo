-- The opening "Today's briefing" conversation is seeded once per sandbox by the app
-- (it runs the real assign_task tool). This column is the once-only claim.
alter table workspaces add column briefing_seeded_at timestamptz;
