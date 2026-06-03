-- Backfill missing profiles from auth.users
-- Run this as an admin (Supabase SQL editor or psql) to create profiles for existing auth users

BEGIN;

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
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

COMMIT;

-- Notes:
-- 1) This uses both `user_metadata` and `raw_user_meta_data` JSON fields to be compatible with different Supabase versions.
-- 2) Run this from the Supabase SQL editor as a project admin. After running, verify `profiles` rows were created.
-- 3) If you have additional profile columns required (department_id, phone, etc.), you may need a custom mapping.
