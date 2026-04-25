-- ============================================================
-- نظام حضور اليامي - تحديث الإصدار 2
-- يضيف: طلبات الإجازة/الإذن + إعدادات موقع الشركة (geofence)
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor
-- ============================================================

-- جدول طلبات الإجازة والإذن
create table if not exists att_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references att_employees(id) on delete cascade,
  type text not null,                    -- 'leave' (إجازة) | 'permission' (إذن)
  start_date date not null,
  end_date date,
  start_time time,
  end_time time,
  reason text,
  status text not null default 'pending', -- pending | approved | rejected
  admin_note text,
  decided_by uuid references att_employees(id),
  decided_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_att_requests_emp on att_requests(employee_id);
create index if not exists idx_att_requests_status on att_requests(status);

alter table att_requests enable row level security;
drop policy if exists "p_req_all" on att_requests;
create policy "p_req_all" on att_requests for all using (true) with check (true);

-- جدول إعدادات الشركة (مفتاح/قيمة)
create table if not exists att_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

alter table att_settings enable row level security;
drop policy if exists "p_set_all" on att_settings;
create policy "p_set_all" on att_settings for all using (true) with check (true);

-- إعدادات افتراضية للفروع (يمكن تعديلها من لوحة الإدارة)
insert into att_settings (key, value) values
  ('branch_tripoli_lat', '32.8872'),
  ('branch_tripoli_lng', '13.1913'),
  ('branch_tripoli_name', 'مكتب طرابلس'),
  ('branch_cairo_lat', '30.0444'),
  ('branch_cairo_lng', '31.2357'),
  ('branch_cairo_name', 'مكتب القاهرة'),
  ('geofence_radius_m', '300'),
  ('geofence_enforce', 'false')
on conflict (key) do nothing;
