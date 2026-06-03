-- COMPREHENSIVE FIX: Backfill profiles + Create admin user (all in one)
-- Run as project admin in Supabase SQL editor

BEGIN;

-- Step 1: Backfill profiles from auth.users (skip if already exist)
INSERT INTO public.profiles (id, email, full_name, role, status, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE((u.raw_user_meta_data->>'full_name')::text, split_part(u.email, '@', 1)),
  COALESCE(LOWER(NULLIF(u.raw_user_meta_data->>'role','')), 'student'),
  CASE
    WHEN (u.raw_user_meta_data->>'role')::text = 'student' THEN 'approved'
    ELSE 'pending'
  END,
  now(), now()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;

-- Step 2: Create admin user (if doesn't exist)
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
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@hostel.com');

-- Step 3: Create profile for admin user (if doesn't exist)
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

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
-- Email:    admin@hostel.com
-- Password: Admin@123456
--
-- After login, navigate to /admin dashboard
-- ============================================
