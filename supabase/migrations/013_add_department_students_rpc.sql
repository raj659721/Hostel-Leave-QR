-- Add api_get_department_students RPC
CREATE OR REPLACE FUNCTION public.api_get_department_students()
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  roll_number TEXT,
  room_number TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  status TEXT
) AS $$
DECLARE
  v_supervisor_dept UUID;
BEGIN
  -- Get the department of the currently logged in supervisor
  SELECT department_id INTO v_supervisor_dept 
  FROM public.profiles 
  WHERE profiles.id = auth.uid();
  
  -- Return students in that department
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name::TEXT,
    p.roll_number::TEXT,
    p.room_number::TEXT,
    p.parent_name::TEXT,
    p.parent_phone::TEXT,
    p.parent_email::TEXT,
    UPPER(p.status)::TEXT
  FROM public.profiles p
  WHERE LOWER(p.role) = 'student' 
    AND (p.department_id = v_supervisor_dept OR v_supervisor_dept IS NULL)
  ORDER BY p.full_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
