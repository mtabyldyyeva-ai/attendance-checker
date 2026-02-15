-- Enable RLS for insert/update/delete

-- FACE DESCRIPTORS
drop policy if exists "Enable insert for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable update for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable delete for users based on user_id" on public.face_descriptors;
drop policy if exists "Enable full access for admins" on public.face_descriptors;

-- Allow users to manage their own face data
create policy "Enable insert for users based on user_id" on public.face_descriptors for insert with check (auth.uid() = user_id);
create policy "Enable update for users based on user_id" on public.face_descriptors for update using (auth.uid() = user_id);
create policy "Enable delete for users based on user_id" on public.face_descriptors for delete using (auth.uid() = user_id);

-- Allow Admins to manage ALL face data
create policy "Enable full access for admins" on public.face_descriptors for all using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);


-- ATTENDANCE & LESSONS (For Teachers)
drop policy if exists "Enable insert for teachers" on public.lessons;
drop policy if exists "Enable insert for teachers" on public.attendance;

-- Teachers need to insert lessons and attendance
create policy "Enable insert for teachers" on public.lessons for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

create policy "Enable insert for teachers" on public.attendance for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'teacher') OR
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Users (Admin access for creating users)
drop policy if exists "Enable insert for admins" on public.users;
drop policy if exists "Enable update for admins" on public.users;

create policy "Enable insert for admins" on public.users for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for admins" on public.users for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
