-- Fix RLS Infinite Recursion by converting helper functions to LANGUAGE plpgsql (which prevents inlining) and utilizing SECURITY DEFINER

BEGIN;

-- 1. Drop existing helper functions
DROP FUNCTION IF EXISTS public.is_student() CASCADE;
DROP FUNCTION IF EXISTS public.is_security() CASCADE;
DROP FUNCTION IF EXISTS public.is_supervisor() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_department() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(TEXT) CASCADE;

-- 2. Create has_role with plpgsql and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(role) = LOWER(p_role)
      AND LOWER(status) = 'approved'
  );
END;
$$;

-- 3. Create current_user_department with plpgsql and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.current_user_department()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (
    SELECT department_id FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$;

-- 4. Create role-specific helper wrappers with plpgsql and SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
STABLE AS $$ 
BEGIN 
  RETURN public.has_role('admin'); 
END; 
$$;

CREATE OR REPLACE FUNCTION public.is_supervisor() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
STABLE AS $$ 
BEGIN 
  RETURN public.has_role('supervisor'); 
END; 
$$;

CREATE OR REPLACE FUNCTION public.is_security() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
STABLE AS $$ 
BEGIN 
  RETURN public.has_role('security'); 
END; 
$$;

CREATE OR REPLACE FUNCTION public.is_student() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
STABLE AS $$ 
BEGIN 
  RETURN public.has_role('student'); 
END; 
$$;

COMMIT;
