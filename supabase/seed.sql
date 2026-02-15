-- Enable pgcrypto for password hashing
create extension if not exists "pgcrypto";

-- SEED DATA
-- Insert test users directly into auth.users
-- This triggers the 'on_auth_user_created' function to populate public.users

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES
(
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User","role":"admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'teacher@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Teacher User","role":"teacher"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
),
(
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'student@example.com',
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Student User","role":"student"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Note: The trigger from schema.sql should handle inserting into public.users
-- If it doesn't, you can manually insert here (uncomment below):
-- INSERT INTO public.users (id, email, full_name, role)
-- SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'role'
-- FROM auth.users
-- WHERE email IN ('admin@example.com', 'teacher@example.com', 'student@example.com')
-- ON CONFLICT (id) DO NOTHING;
