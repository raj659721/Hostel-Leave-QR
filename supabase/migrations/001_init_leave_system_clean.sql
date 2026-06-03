-- Complete, consolidated SQL schema for Student Hostel Leave Management System

-- Drop legacy functions to prevent conflicts
DROP FUNCTION IF EXISTS api_request_role(TEXT, UUID);
DROP FUNCTION IF EXISTS api_approve_role_request(UUID);
DROP FUNCTION IF EXISTS api_reject_role_request(UUID);
DROP FUNCTION IF EXISTS api_apply_leave(TEXT, TEXT, TEXT, DATE, DATE, TIME, TIME);
DROP FUNCTION IF EXISTS api_approve_leave(UUID, TEXT);
DROP FUNCTION IF EXISTS api_reject_leave(UUID, TEXT);
DROP FUNCTION IF EXISTS api_scan_qr(TEXT, TEXT);
DROP FUNCTION IF EXISTS api_get_student_leaves();
DROP FUNCTION IF EXISTS api_get_supervisor_leaves();
DROP FUNCTION IF EXISTS api_get_security_leaves();
DROP FUNCTION IF EXISTS api_get_pending_role_requests();
DROP FUNCTION IF EXISTS api_get_supervisor_analytics();

-- Drop legacy views
DROP VIEW IF EXISTS leave_timeline_events CASCADE;
DROP VIEW IF EXISTS leave_requests CASCADE;
DROP VIEW IF EXISTS leaves CASCADE;
DROP VIEW IF EXISTS students CASCADE;

-- Drop legacy tables
DROP TABLE IF EXISTS email_logs CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS student_movements CASCADE;
DROP TABLE IF EXISTS leave_qr_codes CASCADE;
DROP TABLE IF EXISTS leave_applications CASCADE;
DROP TABLE IF EXISTS role_requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- Drop legacy custom types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS profile_status CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;
DROP TYPE IF EXISTS leave_status CASCADE;
DROP TYPE IF EXISTS movement_type CASCADE;
DROP TYPE IF EXISTS qr_status CASCADE;
DROP TYPE IF EXISTS email_status CASCADE;

-- 1. Create Enums as requested
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'security', 'student');
CREATE TYPE profile_status AS ENUM ('pending', 'approved', 'rejected', 'inactive');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'checked_out', 'checked_in', 'completed', 'cancelled');
CREATE TYPE movement_type AS ENUM ('out', 'in');
CREATE TYPE qr_status AS ENUM ('active', 'used', 'expired');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'failed');

-- Enable pgcrypto for generating random tokens or UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Tables with primary keys and foreign keys
-- Departments Table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles Table (references auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (LOWER(role) IN ('admin', 'supervisor', 'security', 'student')),
  status TEXT NOT NULL DEFAULT 'approved' CHECK (LOWER(status) IN ('pending', 'approved', 'rejected', 'inactive')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  roll_number TEXT,
  year INTEGER,
  room_number TEXT,
  hostel_name TEXT,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role Requests Table
CREATE TABLE role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL CHECK (LOWER(requested_role) IN ('supervisor', 'security')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (LOWER(status) IN ('pending', 'approved', 'rejected')),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave Applications Table
CREATE TABLE leave_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  leave_type TEXT NOT NULL CHECK (LOWER(leave_type) IN ('home', 'medical', 'emergency', 'other')),
  destination TEXT NOT NULL,
  reason TEXT NOT NULL,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  out_time TIME NOT NULL,
  return_time TIME NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  parent_status TEXT NOT NULL DEFAULT 'pending' CHECK (LOWER(parent_status) IN ('pending', 'approved', 'rejected')),
  parent_approved_at TIMESTAMPTZ,
  parent_rejected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (LOWER(status) IN ('pending', 'approved', 'rejected', 'checked_out', 'checked_in', 'completed', 'cancelled')),
  supervisor_remark TEXT,
  parent_email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leave QR Codes Table
CREATE TABLE leave_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qr_type TEXT NOT NULL CHECK (LOWER(qr_type) IN ('out', 'in')),
  qr_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (LOWER(status) IN ('active', 'used', 'expired')),
  scanned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scanned_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (leave_id, qr_type)
);

-- Student Movements Table (recorded by Security)
CREATE TABLE student_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID NOT NULL REFERENCES leave_applications(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (LOWER(movement_type) IN ('out', 'in')),
  location TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements Table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  leave_id UUID REFERENCES leave_applications(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'ALERT')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (LOWER(status) IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email Logs Table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_id UUID REFERENCES leave_applications(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (LOWER(status) IN ('pending', 'sent', 'failed')),
  response_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Triggers
-- Automatically Update updated_at Function
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER set_timestamp_departments BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_role_requests BEFORE UPDATE ON role_requests FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_leave_applications BEFORE UPDATE ON leave_applications FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_announcements BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Auth user profile creation trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
  v_name TEXT;
BEGIN
  -- Extract metadata
  v_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Signup status rules
  IF v_role = 'student' THEN
    v_status := 'approved';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    status
  ) VALUES (
    NEW.id,
    NEW.email,
    v_name,
    v_role,
    v_status
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for role_requests status syncing with profile status
CREATE OR REPLACE FUNCTION public.handle_role_signup_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- When user profile role is created as SUPERVISOR or SECURITY, it starts as pending
  IF NEW.role IN ('supervisor', 'security') AND NEW.status = 'pending' THEN
    INSERT INTO public.role_requests (user_id, requested_role, department_id, status)
    VALUES (NEW.id, NEW.role, NEW.department_id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_role_signup_requests
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_role_signup_requests();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Role verification helpers
CREATE OR REPLACE FUNCTION has_role(p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(role) = LOWER(p_role)
      AND LOWER(status) = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT has_role('admin'); $$;
CREATE OR REPLACE FUNCTION is_supervisor() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT has_role('supervisor'); $$;
CREATE OR REPLACE FUNCTION is_security() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT has_role('security'); $$;
CREATE OR REPLACE FUNCTION is_student() RETURNS BOOLEAN LANGUAGE sql STABLE AS $$ SELECT has_role('student'); $$;

CREATE OR REPLACE FUNCTION current_user_department()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT department_id FROM public.profiles WHERE id = auth.uid();
$$;

-- RLS Policies
-- Departments
CREATE POLICY "Everyone read departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Admin manage departments" ON departments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Profiles
CREATE POLICY "Profiles read" ON profiles FOR SELECT USING (
  auth.uid() = id 
  OR is_admin() 
  OR (is_supervisor() AND department_id = current_user_department())
);
CREATE POLICY "Profiles insert signup" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles update own" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin()) WITH CHECK (
  is_admin() OR (auth.uid() = id AND role = role AND status = status)
);
CREATE POLICY "Admin manage profiles" ON profiles FOR DELETE USING (is_admin());

-- Role Requests
CREATE POLICY "Users read own role requests" ON role_requests FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users insert role request" ON role_requests FOR INSERT WITH CHECK (auth.uid() = user_id AND LOWER(status) = 'pending');
CREATE POLICY "Admin manage role requests" ON role_requests FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Leave Applications
CREATE POLICY "Student read own leaves" ON leave_applications FOR SELECT USING (student_id = auth.uid() OR is_admin());
CREATE POLICY "Supervisor read dept leaves" ON leave_applications FOR SELECT USING (
  is_admin() OR (is_supervisor() AND department_id = current_user_department())
);
CREATE POLICY "Security read approved leaves" ON leave_applications FOR SELECT USING (
  is_admin() OR is_security() AND LOWER(status) IN ('approved', 'checked_out')
);
CREATE POLICY "Student insert leave" ON leave_applications FOR INSERT WITH CHECK (student_id = auth.uid() AND LOWER(status) = 'pending');
CREATE POLICY "Supervisor update leave status" ON leave_applications FOR UPDATE USING (
  is_admin() OR (is_supervisor() AND department_id = current_user_department())
) WITH CHECK (
  is_admin() OR (is_supervisor() AND LOWER(status) IN ('approved', 'rejected', 'checked_out', 'checked_in', 'completed', 'cancelled'))
);
CREATE POLICY "Admin delete leaves" ON leave_applications FOR DELETE USING (is_admin());

-- Leave QR Codes
CREATE POLICY "Select QR codes" ON leave_qr_codes FOR SELECT USING (
  student_id = auth.uid()
  OR is_admin()
  OR is_security()
  OR (is_supervisor() AND EXISTS (
    SELECT 1 FROM leave_applications la 
    WHERE la.id = leave_qr_codes.leave_id 
      AND la.department_id = current_user_department()
  ))
);
CREATE POLICY "Admin insert QR" ON leave_qr_codes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Security update QR status" ON leave_qr_codes FOR UPDATE USING (is_security() OR is_admin()) WITH CHECK (
  is_admin() OR (LOWER(status) IN ('used', 'expired') AND scanned_by = auth.uid())
);

-- Student Movements
CREATE POLICY "Security insert movements" ON student_movements FOR INSERT WITH CHECK (is_security());
CREATE POLICY "Select movements" ON student_movements FOR SELECT USING (
  student_id = auth.uid() OR security_id = auth.uid() OR is_admin()
);

-- Announcements
CREATE POLICY "Anyone read announcements" ON announcements FOR SELECT USING (true);
CREATE POLICY "Supervisor/Admin insert announcements" ON announcements FOR INSERT WITH CHECK (is_admin() OR is_supervisor());
CREATE POLICY "Creator/Admin update announcements" ON announcements FOR UPDATE USING (is_admin() OR created_by = auth.uid()) WITH CHECK (is_admin() OR created_by = auth.uid());
CREATE POLICY "Creator/Admin delete announcements" ON announcements FOR DELETE USING (is_admin() OR created_by = auth.uid());

-- Notifications
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (user_id = auth.uid() OR is_admin());
CREATE POLICY "Admin manage notifications" ON notifications FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Email Logs
CREATE POLICY "Admin read email logs" ON email_logs FOR SELECT USING (is_admin());
CREATE POLICY "Admin manage email logs" ON email_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Audit Logs
CREATE POLICY "Admin read audit logs" ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "Admin manage audit logs" ON audit_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());


-- 5. Creating Writeable Views for Frontend Compatibility
-- Students View
CREATE OR REPLACE VIEW public.students AS
SELECT
  p.id,
  p.roll_number AS roll_no,
  p.roll_number,
  p.room_number AS room_no,
  p.room_number,
  p.hostel_name,
  d.name AS department,
  p.department_id,
  p.year::text AS year,
  p.phone,
  p.parent_name,
  p.parent_phone,
  p.parent_email,
  p.full_name,
  p.email,
  'IN_HOSTEL'::text AS current_status,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id
WHERE LOWER(p.role) = 'student';

-- INSTEAD OF Trigger for students view to allow upsert/inserts
CREATE OR REPLACE FUNCTION public.trigger_students_upsert()
RETURNS TRIGGER AS $$
DECLARE
  v_dept_id UUID;
BEGIN
  IF NEW.department IS NOT NULL THEN
    SELECT id INTO v_dept_id FROM public.departments WHERE LOWER(name) = LOWER(NEW.department);
    IF NOT FOUND THEN
      INSERT INTO public.departments (name) VALUES (NEW.department) RETURNING id INTO v_dept_id;
    END IF;
  END IF;

  INSERT INTO public.profiles (
    id,
    roll_number,
    room_number,
    hostel_name,
    department_id,
    year,
    parent_name,
    parent_phone,
    parent_email,
    full_name,
    email,
    role,
    status
  ) VALUES (
    NEW.id,
    COALESCE(NEW.roll_no, NEW.roll_number),
    COALESCE(NEW.room_no, NEW.room_number),
    NEW.hostel_name,
    v_dept_id,
    COALESCE(NEW.year::integer, 1),
    NEW.parent_name,
    NEW.parent_phone,
    NEW.parent_email,
    COALESCE(NEW.full_name, split_part(NEW.email, '@', 1)),
    NEW.email,
    'student',
    'approved'
  )
  ON CONFLICT (id) DO UPDATE SET
    roll_number = EXCLUDED.roll_number,
    room_number = EXCLUDED.room_number,
    hostel_name = EXCLUDED.hostel_name,
    department_id = EXCLUDED.department_id,
    year = EXCLUDED.year,
    parent_name = EXCLUDED.parent_name,
    parent_phone = EXCLUDED.parent_phone,
    parent_email = EXCLUDED.parent_email,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_students_upsert
INSTEAD OF INSERT OR UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.trigger_students_upsert();

-- Leaves View
CREATE OR REPLACE VIEW public.leaves AS
SELECT
  id,
  student_id,
  department_id,
  supervisor_id,
  UPPER(leave_type) AS leave_type,
  destination,
  reason,
  from_date,
  to_date,
  out_time,
  return_time,
  parent_name,
  parent_phone,
  parent_email,
  UPPER(parent_status) AS parent_status,
  parent_approved_at,
  parent_rejected_at,
  UPPER(status) AS final_status,
  UPPER(status) AS status,
  supervisor_remark,
  parent_email_sent,
  created_at,
  updated_at
FROM public.leave_applications;

-- INSTEAD OF Trigger for leaves view to allow updates
CREATE OR REPLACE FUNCTION public.trigger_leaves_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.leave_applications SET
    parent_status = LOWER(COALESCE(NEW.parent_status, parent_status)),
    parent_approved_at = COALESCE(NEW.parent_approved_at, parent_approved_at),
    parent_rejected_at = COALESCE(NEW.parent_rejected_at, parent_rejected_at),
    status = LOWER(COALESCE(NEW.final_status, NEW.status, status)),
    updated_at = now()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_leaves_update
INSTEAD OF UPDATE ON public.leaves
FOR EACH ROW EXECUTE FUNCTION public.trigger_leaves_update();

-- Leave Requests View
CREATE OR REPLACE VIEW public.leave_requests AS
SELECT
  la.id,
  la.student_id,
  la.department_id,
  la.supervisor_id,
  UPPER(la.leave_type) AS leave_type,
  la.destination,
  la.reason,
  la.from_date,
  la.to_date,
  la.out_time,
  la.return_time,
  la.parent_name,
  la.parent_phone,
  la.parent_email,
  UPPER(la.parent_status) AS parent_status,
  la.parent_approved_at,
  la.parent_rejected_at,
  UPPER(la.status) AS supervisor_status,
  UPPER(la.status) AS final_status,
  la.supervisor_remark,
  la.parent_email_sent,
  la.created_at,
  la.updated_at
FROM public.leave_applications la;

-- Leave Timeline Events View
CREATE OR REPLACE VIEW public.leave_timeline_events AS
-- 1. Applied
SELECT
  (id::text || '-applied') AS id,
  id AS leave_id,
  'APPLIED'::text AS event_type,
  'Leave request submitted'::text AS message,
  created_at,
  student_id AS actor_id
FROM public.leave_applications

UNION ALL

-- 2. Parent Approved/Rejected
SELECT
  (id::text || '-parent') AS id,
  id AS leave_id,
  CASE WHEN LOWER(parent_status) = 'approved' THEN 'PARENT_APPROVED' ELSE 'PARENT_REJECTED' END::text AS event_type,
  CASE WHEN LOWER(parent_status) = 'approved' THEN 'Parent approved leave request' ELSE 'Parent rejected leave request' END::text AS message,
  COALESCE(parent_approved_at, parent_rejected_at) AS created_at,
  student_id AS actor_id
FROM public.leave_applications
WHERE LOWER(parent_status) IN ('approved', 'rejected')

UNION ALL

-- 3. Supervisor Approved/Rejected
SELECT
  (id::text || '-supervisor') AS id,
  id AS leave_id,
  CASE WHEN LOWER(status) IN ('approved', 'checked_out', 'checked_in', 'completed') THEN 'SUPERVISOR_APPROVED' ELSE 'SUPERVISOR_REJECTED' END::text AS event_type,
  CASE WHEN LOWER(status) IN ('approved', 'checked_out', 'checked_in', 'completed') THEN 'Supervisor approved leave request' ELSE 'Supervisor rejected leave request' END::text AS message,
  updated_at AS created_at,
  supervisor_id AS actor_id
FROM public.leave_applications
WHERE LOWER(status) IN ('approved', 'rejected', 'checked_out', 'checked_in', 'completed') AND supervisor_id IS NOT NULL

UNION ALL

-- 4. OUT movement
SELECT
  (id::text || '-out') AS id,
  leave_id,
  'CHECKED_OUT'::text AS event_type,
  'Exited the hostel'::text AS message,
  scanned_at AS created_at,
  security_id AS actor_id
FROM public.student_movements
WHERE LOWER(movement_type) = 'out'

UNION ALL

-- 5. IN movement
SELECT
  (id::text || '-in') AS id,
  leave_id,
  'COMPLETED'::text AS event_type,
  'Returned to the hostel'::text AS message,
  scanned_at AS created_at,
  security_id AS actor_id
FROM public.student_movements
WHERE LOWER(movement_type) = 'in';


-- 6. RPC Functions
-- Request role RPC
CREATE OR REPLACE FUNCTION public.api_request_role(
  p_requested_role TEXT,
  p_department_id UUID
)
RETURNS TABLE (id UUID, status TEXT) AS $$
DECLARE
  v_role TEXT;
  v_status TEXT;
  v_req_id UUID;
BEGIN
  v_role := LOWER(p_requested_role);
  IF v_role NOT IN ('supervisor', 'security') THEN
    RAISE EXCEPTION 'Invalid role requested';
  END IF;

  INSERT INTO public.role_requests (user_id, requested_role, department_id, status)
  VALUES (auth.uid(), v_role, p_department_id, 'pending')
  RETURNING public.role_requests.id, UPPER(public.role_requests.status) INTO v_req_id, v_status;

  RETURN QUERY SELECT v_req_id, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve role request RPC
CREATE OR REPLACE FUNCTION public.api_approve_role_request(p_request_id UUID)
RETURNS TABLE (id UUID, status TEXT) AS $$
DECLARE
  v_request role_requests%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request FROM public.role_requests WHERE role_requests.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF LOWER(v_request.status) <> 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  UPDATE public.profiles
  SET role = LOWER(v_request.requested_role),
      status = 'approved',
      department_id = v_request.department_id,
      updated_at = now()
  WHERE public.profiles.id = v_request.user_id;

  UPDATE public.role_requests
  SET status = 'approved', updated_at = now()
  WHERE role_requests.id = p_request_id;

  RETURN QUERY SELECT p_request_id, 'APPROVED'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject role request RPC
CREATE OR REPLACE FUNCTION public.api_reject_role_request(p_request_id UUID)
RETURNS TABLE (id UUID, status TEXT) AS $$
DECLARE
  v_request role_requests%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_request FROM public.role_requests WHERE role_requests.id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  IF LOWER(v_request.status) <> 'pending' THEN
    RAISE EXCEPTION 'Request already processed';
  END IF;

  UPDATE public.profiles
  SET status = 'rejected',
      updated_at = now()
  WHERE public.profiles.id = v_request.user_id;

  UPDATE public.role_requests
  SET status = 'rejected', updated_at = now()
  WHERE role_requests.id = p_request_id;

  RETURN QUERY SELECT p_request_id, 'REJECTED'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply Leave RPC
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
  SELECT * INTO v_profile FROM public.profiles WHERE profiles.id = auth.uid() AND LOWER(profiles.role) = 'student' AND LOWER(profiles.status) = 'approved';
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
  ) RETURNING public.leave_applications.id, UPPER(public.leave_applications.status) INTO v_leave_id, v_status;

  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'APPLY_LEAVE', 'leave_applications', v_leave_id, jsonb_build_object('leave_type', p_leave_type));

  RETURN QUERY SELECT v_leave_id, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve Leave RPC
CREATE OR REPLACE FUNCTION public.api_approve_leave(
  p_leave_id UUID,
  p_remark TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, status TEXT) AS $$
DECLARE
  v_leave public.leave_applications%ROWTYPE;
  v_supervisor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_supervisor FROM public.profiles WHERE profiles.id = auth.uid() AND LOWER(profiles.role) = 'supervisor' AND LOWER(profiles.status) = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_leave FROM public.leave_applications WHERE leave_applications.id = p_leave_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF LOWER(v_leave.status) <> 'pending' THEN
    RAISE EXCEPTION 'Leave request cannot be approved';
  END IF;

  IF v_supervisor.department_id IS NOT NULL AND v_leave.department_id IS DISTINCT FROM v_supervisor.department_id THEN
    RAISE EXCEPTION 'Cannot approve leave outside your department';
  END IF;

  -- Update application status
  UPDATE public.leave_applications
  SET status = 'approved',
      supervisor_id = auth.uid(),
      supervisor_remark = p_remark,
      updated_at = now()
  WHERE leave_applications.id = p_leave_id;

  -- Generate single-use OUT and IN QR codes
  INSERT INTO public.leave_qr_codes (leave_id, student_id, qr_type, qr_token, status, expires_at)
  VALUES
    (p_leave_id, v_leave.student_id, 'out', encode(gen_random_bytes(24), 'hex'), 'active', now() + INTERVAL '30 days'),
    (p_leave_id, v_leave.student_id, 'in',  encode(gen_random_bytes(24), 'hex'), 'active', now() + INTERVAL '30 days');

  -- Record in audit logs
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'APPROVE_LEAVE', 'leave_applications', p_leave_id, jsonb_build_object('remark', p_remark));

  RETURN QUERY SELECT p_leave_id, 'APPROVED'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject Leave RPC
CREATE OR REPLACE FUNCTION public.api_reject_leave(
  p_leave_id UUID,
  p_remark TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, status TEXT) AS $$
DECLARE
  v_leave public.leave_applications%ROWTYPE;
  v_supervisor public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_supervisor FROM public.profiles WHERE profiles.id = auth.uid() AND LOWER(profiles.role) = 'supervisor' AND LOWER(profiles.status) = 'approved';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_leave FROM public.leave_applications WHERE leave_applications.id = p_leave_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF LOWER(v_leave.status) <> 'pending' THEN
    RAISE EXCEPTION 'Leave request cannot be rejected';
  END IF;

  IF v_supervisor.department_id IS NOT NULL AND v_leave.department_id IS DISTINCT FROM v_supervisor.department_id THEN
    RAISE EXCEPTION 'Cannot reject leave outside your department';
  END IF;

  -- Update application status
  UPDATE public.leave_applications
  SET status = 'rejected',
      supervisor_id = auth.uid(),
      supervisor_remark = p_remark,
      updated_at = now()
  WHERE leave_applications.id = p_leave_id;

  -- Record in audit logs
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'REJECT_LEAVE', 'leave_applications', p_leave_id, jsonb_build_object('remark', p_remark));

  RETURN QUERY SELECT p_leave_id, 'REJECTED'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- QR scan RPC (Gate security validation)
CREATE OR REPLACE FUNCTION public.api_scan_qr(
  p_qr_token TEXT,
  p_location TEXT DEFAULT NULL
)
RETURNS TABLE (qr_id UUID, leave_id UUID, qr_type TEXT, status TEXT, student_id UUID) AS $$
DECLARE
  v_qr public.leave_qr_codes%ROWTYPE;
  v_leave public.leave_applications%ROWTYPE;
BEGIN
  IF NOT is_security() AND NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO v_qr FROM public.leave_qr_codes WHERE qr_token = p_qr_token FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'QR code not found';
  END IF;

  IF LOWER(v_qr.status) <> 'active' THEN
    RAISE EXCEPTION 'QR code is not active';
  END IF;

  IF v_qr.expires_at < now() THEN
    UPDATE public.leave_qr_codes SET status = 'expired', scanned_at = now() WHERE leave_qr_codes.id = v_qr.id;
    RAISE EXCEPTION 'QR code has expired';
  END IF;

  SELECT * INTO v_leave FROM public.leave_applications WHERE leave_applications.id = v_qr.leave_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Related leave request not found';
  END IF;

  IF LOWER(v_qr.qr_type) = 'out' THEN
    IF LOWER(v_leave.status) <> 'approved' THEN
      RAISE EXCEPTION 'Leave must be approved before check-out';
    END IF;

    -- Mark QR as used
    UPDATE public.leave_qr_codes
    SET status = 'used', scanned_by = auth.uid(), scanned_at = now()
    WHERE leave_qr_codes.id = v_qr.id;

    -- Record OUT movement
    INSERT INTO public.student_movements (leave_id, student_id, security_id, movement_type, scanned_at, location)
    VALUES (v_leave.id, v_qr.student_id, auth.uid(), 'out', now(), p_location);

    -- Set status to checked_out
    UPDATE public.leave_applications
    SET status = 'checked_out', updated_at = now()
    WHERE leave_applications.id = v_leave.id;

  ELSIF LOWER(v_qr.qr_type) = 'in' THEN
    IF LOWER(v_leave.status) <> 'checked_out' THEN
      RAISE EXCEPTION 'Student must check-out before checking in';
    END IF;

    -- Mark QR as used
    UPDATE public.leave_qr_codes
    SET status = 'used', scanned_by = auth.uid(), scanned_at = now()
    WHERE leave_qr_codes.id = v_qr.id;

    -- Record IN movement
    INSERT INTO public.student_movements (leave_id, student_id, security_id, movement_type, scanned_at, location)
    VALUES (v_leave.id, v_qr.student_id, auth.uid(), 'in', now(), p_location);

    -- Set status to completed
    UPDATE public.leave_applications
    SET status = 'completed', updated_at = now()
    WHERE leave_applications.id = v_leave.id;

  ELSE
    RAISE EXCEPTION 'Invalid QR type';
  END IF;

  -- Record in audit logs
  INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  VALUES (auth.uid(), 'SCAN_QR', 'leave_qr_codes', v_qr.id, jsonb_build_object('qr_type', v_qr.qr_type, 'location', p_location));

  RETURN QUERY SELECT v_qr.id, v_leave.id, UPPER(v_qr.qr_type), 'SUCCESS'::TEXT, v_qr.student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get student leaves RPC
CREATE OR REPLACE FUNCTION public.api_get_student_leaves()
RETURNS TABLE (
  id UUID,
  leave_type TEXT,
  destination TEXT,
  reason TEXT,
  from_date DATE,
  to_date DATE,
  out_time TIME,
  return_time TIME,
  status TEXT,
  supervisor_remark TEXT,
  parent_email_sent BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT la.id, UPPER(la.leave_type) AS leave_type, la.destination, la.reason, la.from_date, la.to_date, la.out_time, la.return_time,
    UPPER(la.status) AS status, la.supervisor_remark, la.parent_email_sent, la.created_at
  FROM public.leave_applications la
  WHERE la.student_id = auth.uid()
  ORDER BY la.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get supervisor leaves RPC
CREATE OR REPLACE FUNCTION public.api_get_supervisor_leaves()
RETURNS TABLE (
  id UUID,
  student_id UUID,
  student_name TEXT,
  department TEXT,
  leave_type TEXT,
  destination TEXT,
  reason TEXT,
  from_date DATE,
  to_date DATE,
  supervisor_status TEXT,
  parent_status TEXT,
  final_status TEXT,
  priority INT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_supervisor_dept UUID;
  v_is_warden BOOLEAN;
BEGIN
  SELECT department_id, (LOWER(role) = 'warden') INTO v_supervisor_dept, v_is_warden FROM public.profiles WHERE profiles.id = auth.uid();
  
  RETURN QUERY
  SELECT
    la.id,
    la.student_id,
    p.full_name::TEXT AS student_name,
    d.name::TEXT AS department,
    UPPER(la.leave_type)::TEXT AS leave_type,
    la.destination::TEXT AS destination,
    la.reason::TEXT AS reason,
    la.from_date AS from_date,
    la.to_date AS to_date,
    UPPER(la.status)::TEXT AS supervisor_status,
    UPPER(COALESCE(la.parent_status, 'pending'))::TEXT AS parent_status,
    UPPER(la.status)::TEXT AS final_status,
    CASE WHEN LOWER(la.leave_type) = 'emergency' THEN 10 ELSE 0 END::INT AS priority,
    la.created_at AS created_at
  FROM public.leave_applications la
  JOIN public.profiles p ON p.id = la.student_id
  LEFT JOIN public.departments d ON d.id = la.department_id
  WHERE (la.department_id = v_supervisor_dept OR v_supervisor_dept IS NULL)
  ORDER BY la.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get security leaves RPC
CREATE OR REPLACE FUNCTION public.api_get_security_leaves()
RETURNS TABLE (
  id UUID,
  student_id UUID,
  student_name TEXT,
  leave_type TEXT,
  destination TEXT,
  from_date DATE,
  to_date DATE,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT la.id,
         la.student_id,
         p.full_name AS student_name,
         UPPER(la.leave_type) AS leave_type,
         la.destination,
         la.from_date,
         la.to_date,
         UPPER(la.status) AS status,
         la.created_at
  FROM public.leave_applications la
  JOIN public.profiles p ON p.id = la.student_id
  WHERE LOWER(la.status) IN ('approved', 'checked_out')
  ORDER BY la.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get pending role requests RPC
CREATE OR REPLACE FUNCTION public.api_get_pending_role_requests()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  requested_role TEXT,
  department_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT rr.id, rr.user_id, UPPER(rr.requested_role) AS requested_role, rr.department_id, UPPER(rr.status) AS status, rr.created_at
  FROM public.role_requests rr
  WHERE LOWER(rr.status) = 'pending'
  ORDER BY rr.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get supervisor analytics RPC
CREATE OR REPLACE FUNCTION public.api_get_supervisor_analytics()
RETURNS TABLE (
  pending_count INT,
  approved_count INT,
  rejected_count INT,
  emergency_count INT
) AS $$
DECLARE
  v_supervisor_dept UUID;
BEGIN
  SELECT department_id INTO v_supervisor_dept FROM public.profiles WHERE profiles.id = auth.uid();
  
  RETURN QUERY
  SELECT
    COALESCE(COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END)::INT, 0) AS pending_count,
    COALESCE(COUNT(CASE WHEN LOWER(status) = 'approved' THEN 1 END)::INT, 0) AS approved_count,
    COALESCE(COUNT(CASE WHEN LOWER(status) = 'rejected' THEN 1 END)::INT, 0) AS rejected_count,
    COALESCE(COUNT(CASE WHEN LOWER(leave_type) = 'emergency' THEN 1 END)::INT, 0) AS emergency_count
  FROM public.leave_applications
  WHERE department_id = v_supervisor_dept;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 7. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_student ON leave_applications(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_department ON leave_applications(department_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_qr_codes_leave ON leave_qr_codes(leave_id);
CREATE INDEX IF NOT EXISTS idx_leave_qr_codes_student ON leave_qr_codes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_movements_leave ON student_movements(leave_id);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON role_requests(status);

-- Admin Delete User RPC
CREATE OR REPLACE FUNCTION public.api_admin_delete_user(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
