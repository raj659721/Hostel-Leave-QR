CREATE OR REPLACE FUNCTION public.api_apply_leave(
  p_leave_type TEXT,
  p_from_date DATE,
  p_to_date DATE,
  p_out_time TIME,
  p_return_time TIME,
  p_destination TEXT,
  p_reason TEXT
)
RETURNS TABLE (id UUID, status TEXT) AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_leave_id UUID;
  v_status TEXT;
BEGIN
  SELECT p.*
  INTO v_profile
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
    AND LOWER(p.role) = 'student'
    AND LOWER(p.status) = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only approved students may apply for leave';
  END IF;

  INSERT INTO public.leave_applications (
    student_id, department_id, leave_type, destination, reason,
    from_date, to_date, out_time, return_time,
    parent_name, parent_phone, parent_email, parent_status, status
  ) VALUES (
    auth.uid(), v_profile.department_id, LOWER(p_leave_type), p_destination, p_reason,
    p_from_date, p_to_date, p_out_time, p_return_time,
    v_profile.parent_name, v_profile.parent_phone, v_profile.parent_email, 'pending', 'pending'
  ) RETURNING leave_applications.id, UPPER(leave_applications.status) INTO v_leave_id, v_status;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'APPLY_LEAVE', 'leave_applications', v_leave_id, jsonb_build_object('leave_type', p_leave_type));

  RETURN QUERY SELECT v_leave_id, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
