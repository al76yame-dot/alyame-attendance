-- ============================================================
-- نظام حضور اليامي - مخطط قاعدة البيانات
-- شغّل هذا الملف مرة واحدة في Supabase SQL Editor
-- ============================================================

-- جدول الموظفين
create table if not exists att_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique not null,
  pin_hash text not null,
  role text not null default 'agent', -- agent, guide, manager, driver
  branch text,
  is_admin boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);

-- جدول سجلات الحضور
create table if not exists att_logs (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references att_employees(id) on delete cascade,
  check_in timestamptz not null default now(),
  check_out timestamptz,
  duration_min int,
  lat_in double precision, lng_in double precision,
  lat_out double precision, lng_out double precision,
  location_in text, location_out text,
  status text default 'ongoing',
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_att_logs_emp on att_logs(employee_id);
create index if not exists idx_att_logs_in on att_logs(check_in desc);

-- السماح بالوصول (سنعتمد على التحقق من الكود - للبدء السريع)
alter table att_employees enable row level security;
alter table att_logs enable row level security;

-- سياسات مفتوحة (تطبيق داخلي - يمكن تشديدها لاحقاً)
drop policy if exists "p_emp_read" on att_employees;
create policy "p_emp_read" on att_employees for select using (true);
drop policy if exists "p_emp_write" on att_employees;
create policy "p_emp_write" on att_employees for all using (true) with check (true);

drop policy if exists "p_logs_read" on att_logs;
create policy "p_logs_read" on att_logs for select using (true);
drop policy if exists "p_logs_write" on att_logs;
create policy "p_logs_write" on att_logs for all using (true) with check (true);

-- ============================================================
-- إنشاء حساب المدير الافتراضي
-- الهاتف: admin | الرمز السري: 1234
-- هاش SHA-256 للرقم 1234 = 03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4
-- غيّره من لوحة التحكم بعد أول تسجيل دخول
-- ============================================================
insert into att_employees (name, phone, pin_hash, role, is_admin, branch)
values ('المدير / Admin', 'admin', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 'manager', true, 'الرئيسي')
on conflict (phone) do nothing;
