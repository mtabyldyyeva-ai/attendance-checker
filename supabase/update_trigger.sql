create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, role, group_id)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'role',
    (new.raw_user_meta_data->>'group_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;
