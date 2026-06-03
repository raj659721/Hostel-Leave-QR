-- Add api_get_security_roster RPC
CREATE OR REPLACE FUNCTION public.api_get_security_roster()
RETURNS TABLE (
  id UUID,
  student_id UUID,
  student_name TEXT,
  roll_number TEXT,
  room_number TEXT,
  parent_phone TEXT,
  department TEXT,
  leave_type TEXT,
  destination TEXT,
  from_date DATE,
  to_date DATE,
  final_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lr.id,
    lr.student_id,
    p.full_name::TEXT AS student_name,
    p.roll_number::TEXT AS roll_number,
    p.room_number::TEXT AS room_number,
    p.parent_phone::TEXT AS parent_phone,
    d.name::TEXT AS department,
    UPPER(lr.leave_type)::TEXT AS leave_type,
    lr.destination::TEXT AS destination,
    lr.from_date AS from_date,
    lr.to_date AS to_date,
    UPPER(lr.status)::TEXT AS final_status
  FROM public.leave_applications lr
  JOIN public.profiles p ON p.id = lr.student_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE UPPER(lr.status) IN ('APPROVED', 'CHECKED_OUT')
  ORDER BY lr.to_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
