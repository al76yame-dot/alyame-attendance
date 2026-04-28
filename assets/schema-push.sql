-- ============================================================
-- Push Notifications subscriptions
-- شغّل مرة واحدة في Supabase SQL Editor
-- ============================================================
create table if not exists att_push_subs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references att_employees(id) on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_push_emp on att_push_subs(employee_id);

alter table att_push_subs enable row level security;
drop policy if exists "p_push_all" on att_push_subs;
create policy "p_push_all" on att_push_subs for all using (true) with check (true);
