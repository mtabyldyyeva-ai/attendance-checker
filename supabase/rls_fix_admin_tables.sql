-- Groups
drop policy if exists "Enable insert for admins" on public.groups;
drop policy if exists "Enable update for admins" on public.groups;
drop policy if exists "Enable delete for admins" on public.groups;

create policy "Enable insert for admins" on public.groups for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for admins" on public.groups for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable delete for admins" on public.groups for delete using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Subjects
drop policy if exists "Enable insert for admins" on public.subjects;
drop policy if exists "Enable update for admins" on public.subjects;
drop policy if exists "Enable delete for admins" on public.subjects;

create policy "Enable insert for admins" on public.subjects for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for admins" on public.subjects for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable delete for admins" on public.subjects for delete using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- Schedule
drop policy if exists "Enable insert for admins" on public.schedule;
drop policy if exists "Enable update for admins" on public.schedule;
drop policy if exists "Enable delete for admins" on public.schedule;

create policy "Enable insert for admins" on public.schedule for insert with check (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable update for admins" on public.schedule for update using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
create policy "Enable delete for admins" on public.schedule for delete using (
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);
