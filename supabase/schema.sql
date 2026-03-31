-- =============================================================
-- FULL DATABASE SCHEMA (idempotent — safe to run multiple times)
-- =============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- GROUPS
create table if not exists public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- SUBJECTS
create table if not exists public.subjects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  created_at timestamptz default now()
);

-- PROFILES linked to auth.users
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'teacher', 'student')),
  group_id uuid references public.groups(id),
  avatar_url text,
  email text,
  created_at timestamptz default now()
);

-- SCHEDULE
create table if not exists public.schedule (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id),
  subject_id uuid references public.subjects(id),
  teacher_id uuid references public.users(id),
  day_of_week int, -- 0=Sunday, 1=Monday...
  start_time time,
  end_time time,
  start_date date, -- period when this schedule is active
  end_date date,
  created_at timestamptz default now()
);

-- SCHEDULE_STUDENTS (junction table for assigning specific students to a class)
create table if not exists public.schedule_students (
  schedule_id uuid references public.schedule(id) on delete cascade,
  student_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (schedule_id, student_id)
);

-- LESSONS
create table if not exists public.lessons (
  id uuid default uuid_generate_v4() primary key,
  schedule_id uuid references public.schedule(id),
  date date not null,
  status text default 'pending' check (status in ('pending', 'active', 'completed')),
  group_id uuid references public.groups(id),
  subject_id uuid references public.subjects(id),
  teacher_id uuid references public.users(id),
  created_at timestamptz default now()
);

-- ATTENDANCE
create table if not exists public.attendance (
  id uuid default uuid_generate_v4() primary key,
  lesson_id uuid references public.lessons(id),
  student_id uuid references public.users(id),
  status text check (status in ('present', 'absent', 'late')),
  timestamp timestamptz default now()
);

-- FACE DESCRIPTORS
create table if not exists public.face_descriptors (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  descriptor float8[],
  created_at timestamptz default now()
);


-- 3. FUNCTIONS & TRIGGERS

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role, group_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role',
    case
      when new.raw_user_meta_data->>'group_id' = '' then null
      when new.raw_user_meta_data->>'group_id' is null then null
      else (new.raw_user_meta_data->>'group_id')::uuid
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    group_id = excluded.group_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. ENABLE RLS ON ALL TABLES

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.subjects enable row level security;
alter table public.schedule enable row level security;
alter table public.schedule_students enable row level security;
alter table public.lessons enable row level security;
alter table public.attendance enable row level security;
alter table public.face_descriptors enable row level security;


-- 5. RLS POLICIES (drop-and-recreate for idempotency)

-- ================= GROUPS =================
drop policy if exists "Enable read access for all users" on public.groups;
drop policy if exists "Enable insert for admins" on public.groups;
drop policy if exists "Enable update for admins" on public.groups;
drop policy if exists "Enable delete for admins" on public.groups;

create policy "Enable read access for all users" on public.groups for select using (auth.role() = 'authenticated');
create policy "Enable insert for admins" on public.groups for insert with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable update for admins" on public.groups for update using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable delete for admins" on public.groups for delete using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ================= SUBJECTS =================
drop policy if exists "Enable read access for all users" on public.subjects;
drop policy if exists "Enable insert for admins" on public.subjects;
drop policy if exists "Enable update for admins" on public.subjects;
drop policy if exists "Enable delete for admins" on public.subjects;

create policy "Enable read access for all users" on public.subjects for select using (auth.role() = 'authenticated');
create policy "Enable insert for admins" on public.subjects for insert with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable update for admins" on public.subjects for update using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable delete for admins" on public.subjects for delete using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ================= SCHEDULE =================
drop policy if exists "Enable read access for all users" on public.schedule;
drop policy if exists "Enable insert for admins" on public.schedule;
drop policy if exists "Enable update for admins" on public.schedule;
drop policy if exists "Enable delete for admins" on public.schedule;

create policy "Enable read access for all users" on public.schedule for select using (auth.role() = 'authenticated');
create policy "Enable insert for admins" on public.schedule for insert with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable update for admins" on public.schedule for update using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable delete for admins" on public.schedule for delete using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ================= SCHEDULE_STUDENTS =================
drop policy if exists "Enable read access for all users" on public.schedule_students;
drop policy if exists "Enable insert access for admin" on public.schedule_students;
drop policy if exists "Enable delete access for admin" on public.schedule_students;

create policy "Enable read access for all users" on public.schedule_students for select using (auth.role() = 'authenticated');
create policy "Enable insert access for admin" on public.schedule_students for insert with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable delete access for admin" on public.schedule_students for delete using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ================= USERS =================
drop policy if exists "Enable read access for all users" on public.users;
drop policy if exists "Enable insert for admins" on public.users;
drop policy if exists "Enable update for admins" on public.users;
drop policy if exists "Enable delete for admins" on public.users;

create policy "Enable read access for all users" on public.users for select using (auth.role() = 'authenticated');
create policy "Enable insert for admins" on public.users for insert with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable update for admins" on public.users for update using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable delete for admins" on public.users for delete using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );

-- ================= FACE DESCRIPTORS =================
drop policy if exists "Enable read access for all users" on public.face_descriptors;
drop policy if exists "Enable insert for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable update for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable delete for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable full access for admins" on public.face_descriptors;

create policy "Enable read access for all users" on public.face_descriptors for select using (auth.role() = 'authenticated');
create policy "Enable insert for users based on user_id" on public.face_descriptors for insert with check (auth.uid() = user_id);
create policy "Enable update for users based on user_id" on public.face_descriptors for update using (auth.uid() = user_id);
create policy "Enable delete for users based on user_id" on public.face_descriptors for delete using (auth.uid() = user_id);
create policy "Enable full access for admins" on public.face_descriptors for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- ================= LESSONS =================
drop policy if exists "Enable read access for all users" on public.lessons;
drop policy if exists "Enable insert for teachers" on public.lessons;
drop policy if exists "Enable update for teachers" on public.lessons;

create policy "Enable read access for all users" on public.lessons for select using (auth.role() = 'authenticated');
create policy "Enable insert for teachers" on public.lessons for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for teachers" on public.lessons for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- ================= ATTENDANCE =================
drop policy if exists "Enable read access for all users" on public.attendance;
drop policy if exists "Enable insert for teachers" on public.attendance;
drop policy if exists "Enable update for teachers" on public.attendance;

create policy "Enable read access for all users" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Enable insert for teachers" on public.attendance for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for teachers" on public.attendance for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
