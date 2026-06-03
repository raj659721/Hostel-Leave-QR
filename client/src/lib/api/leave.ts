import { supabase } from "@/lib/supabase";

export type LeaveType = "HOME" | "MEDICAL" | "EMERGENCY" | "OTHER";

export interface ApplyLeavePayload {
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  out_time: string;
  return_time: string;
  destination: string;
  reason: string;
  parent_phone?: string;
}

export interface SendParentEmailPayload {
  leaveRequestId: string;
  parentEmail: string;
  studentName: string;
  department?: string;
  rollNumber?: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  outTime?: string;
  returnTime?: string;
  destination: string;
  reason: string;
}

export async function applyLeave(payload: ApplyLeavePayload) {
  const { data, error } = await supabase.rpc("api_apply_leave", {
    p_leave_type: payload.leave_type,
    p_from_date: payload.from_date,
    p_to_date: payload.to_date,
    p_out_time: payload.out_time,
    p_return_time: payload.return_time,
    p_destination: payload.destination,
    p_reason: payload.reason,
  });
  if (error) throw error;
  
  const list = data as Array<{ id: string; status: string }>;
  if (!list || list.length === 0) {
    throw new Error("No leave request data returned from database");
  }
  
  return { 
    id: list[0].id, 
    status: list[0].status 
  };
}

export async function sendParentEmail(payload: SendParentEmailPayload) {
  const { data, error } = await supabase.functions.invoke("send-parent-leave-email", {
    body: payload,
  });
  if (error) throw error;
  if (data && data.success === false) {
    throw new Error(data.error || data.message || "Failed to send email");
  }
}

export interface SupervisorStatusEmailPayload {
  email: string;
  supervisorName: string;
  role?: string;
  status: "APPROVED" | "REJECTED";
  remark?: string;
}

export async function sendSupervisorStatusEmail(payload: SupervisorStatusEmailPayload) {
  const { data, error } = await supabase.functions.invoke("send-supervisor-status-email", {
    body: payload,
  });
  if (error) throw error;
  if (data && data.success === false) {
    throw new Error(data.error || data.message || "Failed to send status email");
  }
}

export async function approveLeave(leaveId: string, remark?: string) {
  const { data, error } = await supabase.rpc("api_approve_leave", {
    p_leave_id: leaveId,
    p_remark: remark ?? null,
  });
  if (error) throw error;
  return data;
}

export async function rejectLeave(leaveId: string, remark?: string) {
  const { data, error } = await supabase.rpc("api_reject_leave", {
    p_leave_id: leaveId,
    p_remark: remark ?? null,
  });
  if (error) throw error;
  return data;
}

export async function scanQr(qrToken: string, location?: string, deviceId?: string) {
  const { data, error } = await supabase.rpc("api_scan_qr", {
    p_qr_token: qrToken,
    p_location: location ?? null,
  });
  if (error) throw error;
  const raw = data as {
    qr_id: string;
    leave_id: string;
    qr_type: "OUT" | "IN";
    status: string;
    student_id: string;
  };
  return {
    qr_id: raw.qr_id,
    leave_id: raw.leave_id,
    leave_request_id: raw.leave_id,
    qr_type: raw.qr_type,
    scan_type: raw.qr_type,
    status: raw.status,
    student_id: raw.student_id,
  };
}

export async function getStudentLeaves() {
  const { data, error } = await supabase.rpc("api_get_student_leaves");
  if (error) throw error;
  return data ?? [];
}

export async function getSupervisorLeaves() {
  const { data, error } = await supabase.rpc("api_get_supervisor_leaves");
  if (error) throw error;
  return data ?? [];
}

export async function getSecurityLeaves() {
  const { data, error } = await supabase.rpc("api_get_security_leaves");
  if (error) throw error;
  return data ?? [];
}

export async function getLeaveQrCodes(leaveId: string) {
  const { data, error } = await supabase
    .from("leave_qr_codes")
    .select("id, qr_type, qr_token, status, expires_at, scanned_at, scanned_by")
    .eq("leave_id", leaveId)
    .order("qr_type");
  if (error) throw error;
  return (data ?? []).map(q => ({
    id: q.id,
    type: q.qr_type.toUpperCase(),
    qr_code: q.qr_token,
    status: q.status ? q.status.toLowerCase() : "active",
    expires_at: q.expires_at,
    used_at: q.scanned_at,
  }));
}

export async function getLeaveTimeline(leaveId: string) {
  const { data, error } = await supabase
    .from("leave_timeline_events")
    .select("id, event_type, message, created_at, actor_id")
    .eq("leave_id", leaveId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getGateLogs(limit = 25) {
  const { data, error } = await supabase
    .from("student_movements")
    .select("id, movement_type, scanned_at, location, leave_id, student_id, security_id")
    .order("scanned_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(m => ({
    id: m.id,
    scan_type: m.movement_type,
    scanned_at: m.scanned_at,
    location: m.location,
    leave_request_id: m.leave_id,
    student_id: m.student_id,
    security_id: m.security_id,
  }));
}

export async function getNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, title, body, type, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export async function getSupervisorAnalytics() {
  const { data, error } = await supabase.rpc("api_get_supervisor_analytics");
  if (error) throw error;
  return data ?? [];
}

export async function requestRole(requestedRole: "SUPERVISOR" | "SECURITY", departmentId: string) {
  const { data, error } = await supabase.rpc("api_request_role", {
    p_requested_role: requestedRole,
    p_department_id: departmentId,
  });
  if (error) throw error;
  return data;
}

export async function getPendingRoleRequests() {
  const { data, error } = await supabase.rpc("api_get_pending_role_requests");
  if (error) throw error;
  return data ?? [];
}

export async function approveRoleRequest(requestId: string) {
  const { data, error } = await supabase.rpc("api_approve_role_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function rejectRoleRequest(requestId: string) {
  const { data, error } = await supabase.rpc("api_reject_role_request", {
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function adminDeleteUser(userId: string) {
  const { data, error } = await supabase.rpc("api_admin_delete_user", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function getSecurityRoster() {
  const { data, error } = await supabase.rpc("api_get_security_roster");
  if (error) throw error;
  return data;
}

export async function getDepartmentStudents() {
  const { data, error } = await supabase.rpc("api_get_department_students");
  if (error) throw error;
  return data ?? [];
}
