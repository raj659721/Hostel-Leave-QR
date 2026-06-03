import { serve } from "https://deno.land/std@0.211.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.28.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase service environment variables");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

interface SendParentEmailPayload {
  leaveRequestId: string;
  parentEmail: string;
  studentName: string;
  department: string;
  rollNumber: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  outTime: string;
  returnTime: string;
  destination: string;
  reason: string;
}

function buildText(payload: SendParentEmailPayload) {
  return `Dear Parent,

Your child ${payload.studentName} has applied for hostel leave.

Department: ${payload.department}
Roll Number: ${payload.rollNumber}
Leave Type: ${payload.leaveType}
From: ${payload.fromDate}
To: ${payload.toDate}
Out time: ${payload.outTime}
Expected return time: ${payload.returnTime}
Destination: ${payload.destination}
Reason: ${payload.reason}

This email is only for information. No approval is required from parent.

Thank you,
Hostel Management System`;
}

function buildHtml(payload: SendParentEmailPayload) {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="font-family:system-ui, sans-serif; line-height:1.6; color:#111;">
    <p>Dear Parent,</p>
    <p>Your child <strong>${payload.studentName}</strong> has applied for hostel leave.</p>
    <ul>
      <li><strong>Department:</strong> ${payload.department}</li>
      <li><strong>Roll Number:</strong> ${payload.rollNumber}</li>
      <li><strong>Leave Type:</strong> ${payload.leaveType}</li>
      <li><strong>From:</strong> ${payload.fromDate}</li>
      <li><strong>To:</strong> ${payload.toDate}</li>
      <li><strong>Out time:</strong> ${payload.outTime}</li>
      <li><strong>Expected return time:</strong> ${payload.returnTime}</li>
      <li><strong>Destination:</strong> ${payload.destination}</li>
      <li><strong>Reason:</strong> ${payload.reason}</li>
    </ul>
    <p><strong>This email is only for information. No approval is required from parent.</strong></p>
    <p>Thank you,<br/>Hostel Management System</p>
  </body>
</html>`;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!RESEND_API_KEY) {
    return new Response("Missing RESEND_API_KEY", { status: 500 });
  }

  let payload: SendParentEmailPayload;

  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const {
    leaveRequestId,
    parentEmail,
    studentName,
    department,
    rollNumber,
    leaveType,
    fromDate,
    toDate,
    outTime,
    returnTime,
    destination,
    reason,
  } = payload;

  if (!leaveRequestId || !parentEmail || !studentName || !department || !rollNumber || !leaveType || !fromDate || !toDate || !outTime || !returnTime || !destination || !reason) {
    return new Response("Missing required payload fields", { status: 400 });
  }

  const textBody = buildText(payload);
  const htmlBody = buildHtml(payload);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hostel Management <no-reply@hostel-management.com>",
      to: [parentEmail],
      subject: "Hostel leave information for your child",
      text: textBody,
      html: htmlBody,
    }),
  });

  const emailStatus = response.ok ? "SENT" : "FAILED";
  const responseText = await response.text();

  await supabaseAdmin.from("email_logs").insert({
    leave_id: leaveRequestId,
    parent_email: parentEmail,
    status: emailStatus,
    response_text: responseText,
  });

  if (!response.ok) {
    return new Response(`Failed to send email: ${responseText}`, { status: response.status });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
