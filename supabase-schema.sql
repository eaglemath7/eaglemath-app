-- Eagle Math App Supabase schema
-- Run this in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin', 'deputy', 'teacher', 'student')),
  name text not null,
  login_id text not null unique,
  password_code text not null,
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete set null,
  name text not null,
  birthday4 text not null,
  school_year text,
  phone text not null,
  login_id text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete set null,
  name text not null,
  login_id text not null unique,
  role text not null check (role in ('admin', 'deputy', 'teacher')),
  active boolean not null default true,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists periods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  start_time time,
  end_time time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  day text not null,
  period text not null,
  lesson_type text not null default '정규',
  teacher_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists lesson_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  lesson_date date not null,
  period text,
  lesson_type text not null default '정규',
  attendance text not null default '출석',
  homework text not null default '클리어',
  material text,
  unit text,
  content text,
  assignment text,
  keywords text,
  test_name text,
  next_plan text,
  created_by uuid references teachers(id) on delete set null,
  updated_by uuid references teachers(id) on delete set null,
  version integer not null default 1,
  hidden boolean not null default false,
  hidden_by uuid references teachers(id) on delete set null,
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists record_confirmations (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references lesson_records(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  version integer not null default 0,
  keywords text[] not null default '{}',
  assignment_confirmed boolean not null default false,
  assignment_confirmed_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (record_id, student_id)
);

create table if not exists app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

insert into periods (name) values
  ('1교시'), ('2교시'), ('3교시'), ('4교시'), ('5교시'), ('6교시')
on conflict (name) do nothing;

insert into app_users (role, name, login_id, password_code, active, must_change_password)
values
  ('admin', '관리자', 'admin', '1234', true, false),
  ('deputy', '부원장', 'deputy', '1234', true, false)
on conflict (login_id) do nothing;
