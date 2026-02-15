-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ROLES ENUM (optional, using text check constraint instead for simplicity)
-- create type user_role as enum ('admin', 'teacher', 'student');

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
  created_at timestamptz default now()
);

-- LESSONS
create table if not exists public.lessons (
  id uuid default uuid_generate_v4() primary key,
  schedule_id uuid references public.schedule(id),
  date date not null,
  status text default 'pending' check (status in ('pending', 'active', 'completed')),
  group_id uuid references public.groups(id), -- Denormalized for query ease
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

-- RLS Policies
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.subjects enable row level security;
alter table public.schedule enable row level security;
alter table public.lessons enable row level security;
alter table public.attendance enable row level security;
alter table public.face_descriptors enable row level security;

-- Allow read access to authenticated users for now
create policy "Enable read access for all users" on public.users for select using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on public.groups for select using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on public.subjects for select using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on public.schedule for select using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on public.lessons for select using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on public.attendance for select using (auth.role() = 'authenticated');
create policy "Enable read access for all users" on public.face_descriptors for select using (auth.role() = 'authenticated');

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
