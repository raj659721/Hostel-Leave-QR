-- Create admin user account
-- Email: admin@hostel.com
-- Password: Admin@123456 (change after first login)

BEGIN;

-- Insert into auth.users table
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at,
  last_sign_in_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@hostel.com',
  crypt('Admin@123456', gen_salt('bf')),
  now(),
  jsonb_build_object('full_name', 'Admin User', 'role', 'admin'),
  jsonb_build_object('provider', 'email'),
  now(),
  now(),
  now(),
  '',
  now(),
  '',
  now()
ON CONFLICT DO NOTHING;

-- Insert matching profile row
INSERT INTO public.profiles (id, email, full_name, role, status, created_at, updated_at)
SELECT
  u.id,
  u.email,
  'Admin User',
  'admin',
  'approved',
  now(),
  now()
FROM auth.users u
WHERE u.email = 'admin@hostel.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

COMMIT;

-- Credentials:
-- Email: admin@hostel.com
-- Password: Admin@123456
-- 
-- Login URL: http://localhost:5173 (or your app domain)
-- Dashboard URL: http://localhost:5173/admin
