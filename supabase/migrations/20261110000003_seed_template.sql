-- Northwind Studio sample workspace, copied into every visitor's sandbox.
-- Website relaunch tasks are the ones in docs/Briefly Workspace.html; due dates
-- are offsets from the sandbox's creation day (KST) so "overdue" stays true.

insert into seed.members (key, name, handle, initials, avatar, role, is_visitor, sort) values
  ('AK', 'Alex Kim',          'alex.kim',          'AK', 1, 'member', true,  1),
  ('DR', 'Dilnoza Rakhimova', 'dilnoza.rakhimova', 'DR', 2, 'member', false, 2),
  ('ML', 'Marcus Lee',        'marcus.lee',        'ML', 3, 'member', false, 3),
  ('PS', 'Priya Shah',        'priya.shah',        'PS', 4, 'admin',  false, 4),
  ('TG', 'Tomás García',      'tomas.garcia',      'TG', 5, 'member', false, 5);

insert into seed.projects (key, name, color, next_number, position) values
  ('WEB', 'Website relaunch', 1, 26, 1),
  ('ONB', 'Q1 onboarding',    3, 10, 2),
  ('MOB', 'Mobile beta',      2, 7,  3);

insert into seed.project_members (project_key, member_key) values
  ('WEB', 'AK'), ('WEB', 'DR'), ('WEB', 'ML'), ('WEB', 'PS'), ('WEB', 'TG'),
  ('ONB', 'AK'), ('ONB', 'DR'), ('ONB', 'ML'), ('ONB', 'PS'),
  ('MOB', 'ML'), ('MOB', 'PS'), ('MOB', 'TG');

insert into seed.labels (name, color) values
  ('Copy', 2), ('Content', 3), ('SEO', 1), ('Pricing', 5), ('Frontend', 4);

insert into seed.tasks (project_key, number, title, description, status, priority, label, due_offset, assignee_key, position) values
  ('WEB', 18, 'Finalize pricing tiers with finance', 'Three tiers, annual discount, and the startup plan. Finance needs the final numbers before the pricing page can go to design.', 'todo', 4, 'Pricing', -4, 'AK', 0),
  ('WEB', 22, 'Write hero and value-prop copy', 'Headline, subhead and three value props for the new homepage.', 'todo', 3, 'Copy', 2, 'DR', 1000),
  ('WEB', 23, 'Collect customer logos with written permission', '', 'todo', 2, 'Content', 6, 'ML', 2000),
  ('WEB', 25, 'Set up 301 redirects for legacy blog URLs', 'Map every /blog/* URL from the old sitemap to its new slug.', 'todo', 1, 'SEO', 9, null, 3000),
  ('WEB', 19, 'Build responsive nav and footer', '', 'doing', 3, 'Frontend', 1, 'TG', 0),
  ('WEB', 21, 'Lighthouse pass on product pages', 'Target 90+ on performance and accessibility for the five product pages.', 'doing', 2, 'Frontend', 3, 'AK', 1000),
  ('WEB', 20, 'Migrate case studies to the new CMS', '', 'doing', 2, 'Content', 4, 'PS', 2000),
  ('WEB', 17, 'Pick the CMS: Sanity or Payload', 'Decision: Payload, self-hosted.', 'done', 2, 'Frontend', -7, 'TG', 0),
  ('WEB', 16, 'Analytics events plan', '', 'done', 1, 'SEO', -8, 'PS', 1000),
  ('WEB', 15, 'Moodboard and type direction', '', 'done', 2, 'Content', -11, 'DR', 2000),
  ('WEB', 14, 'Audit sitemap and redirects', '', 'done', 1, 'SEO', -13, 'ML', 3000),

  ('ONB', 4, 'Write help-center article: inviting teammates', '', 'todo', 2, 'Content', 3, 'AK', 0),
  ('ONB', 7, 'Record the product walkthrough video', 'Five minutes, covers projects, the board and the assistant.', 'todo', 2, 'Content', -1, 'ML', 1000),
  ('ONB', 9, 'Review onboarding drop-off funnel', '', 'todo', 2, null, 4, 'AK', 2000),
  ('ONB', 6, 'Define activation metric with analytics', '', 'todo', 3, 'SEO', 7, 'PS', 3000),
  ('ONB', 8, 'Translate onboarding emails to Korean', '', 'todo', 1, 'Copy', 12, 'DR', 4000),
  ('ONB', 3, 'Set up in-app tooltips for the dashboard', '', 'doing', 3, 'Frontend', 5, 'ML', 0),
  ('ONB', 5, 'Interview five new customers about setup', '', 'doing', 3, 'Content', 2, 'PS', 1000),
  ('ONB', 1, 'Draft the welcome email series', '', 'done', 2, 'Copy', -10, 'DR', 0),
  ('ONB', 2, 'Map the first-week checklist', '', 'done', 2, 'Content', -8, 'AK', 1000),

  ('MOB', 6, 'Offline mode spike', 'Can the task list work offline for read-only use?', 'todo', 4, 'Frontend', -3, 'TG', 0),
  ('MOB', 3, 'Beta invite email', '', 'todo', 2, 'Copy', -2, 'PS', 1000),
  ('MOB', 4, 'Push notification permission copy', '', 'todo', 1, 'Copy', 8, 'ML', 2000),
  ('MOB', 5, 'App Store screenshots', '', 'todo', 2, 'Content', 10, null, 3000),
  ('MOB', 2, 'Crash reporting setup', '', 'doing', 3, 'Frontend', 2, 'TG', 0),
  ('MOB', 1, 'TestFlight build for internal testers', '', 'done', 3, 'Frontend', -6, 'TG', 0);

insert into seed.activity (project_key, task_number, actor_key, kind, field, old_value, new_value, minutes_ago) values
  ('WEB', 19, 'TG', 'updated', 'status', 'todo', 'doing', 35),
  ('WEB', 20, 'PS', 'updated', 'assignee', null, 'Priya Shah', 130),
  ('WEB', 22, 'DR', 'updated', 'priority', '2', '3', 250),
  ('WEB', 23, 'ML', 'created', null, null, 'Collect customer logos with written permission', 1600),
  ('WEB', 17, 'TG', 'updated', 'status', 'doing', 'done', 2000),
  ('ONB', 3, 'ML', 'updated', 'status', 'todo', 'doing', 3000),
  ('MOB', 2, 'TG', 'updated', 'status', 'todo', 'doing', 900);
