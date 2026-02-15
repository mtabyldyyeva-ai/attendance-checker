-- UNIVERSAL DATABASE FIX SCRIPT
-- Run this script in the Supabase SQL Editor.
-- It is designed to be safe to run multiple times (idempotent).

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ENABLE RLS ON ALL TABLES
alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.subjects enable row level security;
alter table public.schedule enable row level security;
alter table public.lessons enable row level security;
alter table public.attendance enable row level security;
alter table public.face_descriptors enable row level security;

-- 3. FUNCTIONS & TRIGGERS
-- Handle New User (with safer group_id handling)
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

-- Re-create trigger (drop first to avoid duplicates if definition changed, though OR REPLACE handles function, trigger needs care)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 4. POLICIES (DROP AND RE-CREATE pattern for idempotency)

-- Helper macro isn't available in standard SQL here, so we copy-paste logic.

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


-- ================= USERS =================
-- Allow users to read (needed for login/checks) and Admins to write (for user management)
drop policy if exists "Enable read access for all users" on public.users;
drop policy if exists "Enable insert for admins" on public.users;
drop policy if exists "Enable update for admins" on public.users;
drop policy if exists "Enable delete for admins" on public.users;
drop policy if exists "Enable update for users on own profile" on public.users;

create policy "Enable read access for all users" on public.users for select using (auth.role() = 'authenticated');
create policy "Enable insert for admins" on public.users for insert with check ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable update for admins" on public.users for update using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
create policy "Enable delete for admins" on public.users for delete using ( exists (select 1 from public.users where id = auth.uid() and role = 'admin') );
-- Optional: Allow users to update their own simple fields (like avatar), keeping it simple for now


-- ================= FACE DESCRIPTORS =================
drop policy if exists "Enable read access for all users" on public.face_descriptors;
drop policy if exists "Enable insert for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable update for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable delete for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable full access for admins" on public.face_descriptors;


create policy "Enable read access for all users" on public.face_descriptors for select using (auth.role() = 'authenticated');
-- Allow students/teachers to manage their own face data
create policy "Enable insert for users based on user_id" on public.face_descriptors for insert with check (auth.uid() = user_id);
create policy "Enable update for users based on user_id" on public.face_descriptors for update using (auth.uid() = user_id);
create policy "Enable delete for users based on user_id" on public.face_descriptors for delete using (auth.uid() = user_id);
-- Allow Admins full control
create policy "Enable full access for admins" on public.face_descriptors for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);


-- ================= LESSONS & ATTENDANCE =================
drop policy if exists "Enable read access for all users" on public.lessons;
drop policy if exists "Enable insert for teachers" on public.lessons;
drop policy if exists "Enable update for teachers" on public.lessons;

create policy "Enable read access for all users" on public.lessons for select using (auth.role() = 'authenticated');
-- Teachers/Admins can create lessons
create policy "Enable insert for teachers" on public.lessons for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for teachers" on public.lessons for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);


drop policy if exists "Enable read access for all users" on public.attendance;
drop policy if exists "Enable insert for teachers" on public.attendance;
drop policy if exists "Enable update for teachers" on public.attendance;

create policy "Enable read access for all users" on public.attendance for select using (auth.role() = 'authenticated');
-- Teachers/Admins can mark attendance
create policy "Enable insert for teachers" on public.attendance for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for teachers" on public.attendance for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
