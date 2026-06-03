import { serve } from "https://deno.land/std@0.211.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.28.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Read Brevo API Configurations
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "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";
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "kjiya4171@gmail.com";

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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let payload: Partial<SendParentEmailPayload>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, message: "Invalid JSON payload" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { leaveRequestId } = payload;
  if (!leaveRequestId) {
    return new Response(JSON.stringify({ success: false, message: "Missing leaveRequestId in payload" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Authoritatively query leave application and student profile details from the database
  const { data: leave, error: dbError } = await supabaseAdmin
    .from("leave_applications")
    .select(`
      id,
      leave_type,
      destination,
      reason,
      from_date,
      to_date,
      out_time,
      return_time,
      parent_email,
      parent_name,
      student:profiles!student_id (
        full_name,
        roll_number,
        department:departments (
          name
        )
      )
    `)
    .eq("id", leaveRequestId)
    .single();

  if (dbError || !leave) {
    console.error("DB Fetch Error:", dbError);
    return new Response(JSON.stringify({ success: false, message: `Leave request not found: ${dbError?.message || "Unknown error"}` }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Extract variables with fallbacks
  const studentProfile: any = leave.student;
  const parentEmail = leave.parent_email || payload.parentEmail || "";
  const parentName = leave.parent_name || "Parent";
  const studentName = studentProfile?.full_name || payload.studentName || "Student";
  const deptName = studentProfile?.department?.name || payload.department || "N/A";
  const rollNumber = studentProfile?.roll_number || payload.rollNumber || "N/A";
  const leaveType = leave.leave_type || payload.leaveType || "Home Leave";
  const fromDate = leave.from_date || payload.fromDate || "";
  const toDate = leave.to_date || payload.toDate || "";
  const outTime = leave.out_time || payload.outTime || "N/A";
  const returnTime = leave.return_time || payload.returnTime || "N/A";
  const destination = leave.destination || payload.destination || "";
  const reason = leave.reason || payload.reason || "";

  // Error Handling Requirement: If parent email is missing, show/log "Parent email not found"
  if (!parentEmail) {
    console.warn("Parent email not found for leave request ID:", leaveRequestId);
    return new Response(JSON.stringify({ success: false, message: "Parent email not found" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Error Handling Requirement: If Brevo API key is missing, log clear error
  if (!BREVO_API_KEY) {
    console.error("CRITICAL ERROR: Brevo API key is missing. Unable to send emails.");
    return new Response(JSON.stringify({ success: false, message: "Brevo API key is missing" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  // Content Requirement: Student name, Department/branch, Leave type, From date, To date, Reason, Status: Pending Supervisor Approval
  const emailText = `Dear ${parentName},

This is to inform you that your son/daughter ${studentName} wants to apply for hostel leave.

Details of the leave request:
- Student Name: ${studentName}
- Department/Branch: ${deptName}
- Roll Number: ${rollNumber}
- Leave Type: ${leaveType.toUpperCase()}
- From Date: ${fromDate}
- To Date: ${toDate}
- Departure Time: ${outTime}
- Return Time: ${returnTime}
- Destination: ${destination}
- Reason: ${reason}
- Current Status: Pending Supervisor Approval

Best regards,
Hostel Management System`;

  const emailHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Hostel Leave Notification</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #243B53; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">Hostel Leave Notification</h2>
    <p>Dear ${parentName},</p>
    <p>This is to inform you that your son/daughter <strong>${studentName}</strong> wants to apply for a hostel leave request.</p>
    
    <div style="background-color: #F7FAFC; border: 1px solid #EDF2F7; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #4A5568;">Leave Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096; width: 160px;">Student Name:</td>
          <td style="padding: 6px 0; font-weight: 600;">${studentName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">Department/Branch:</td>
          <td style="padding: 6px 0;">${deptName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">Roll Number:</td>
          <td style="padding: 6px 0;">${rollNumber}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">Leave Type:</td>
          <td style="padding: 6px 0;"><span style="background-color: #EBF8FF; color: #2B6CB0; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 600;">${leaveType.toUpperCase()}</span></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">From Date:</td>
          <td style="padding: 6px 0;">${fromDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">To Date:</td>
          <td style="padding: 6px 0;">${toDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">Departure / Return:</td>
          <td style="padding: 6px 0;">${outTime} &mdash; ${returnTime}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096;">Destination:</td>
          <td style="padding: 6px 0;">${destination}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096; vertical-align: top;">Reason:</td>
          <td style="padding: 6px 0;">${reason}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #718096; vertical-align: top;">Current Status:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #B7791F;">Pending Supervisor Approval</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #718096; background-color: #EDF2F7; padding: 10px; border-radius: 6px;">
      <strong>Note:</strong> This notification is for your information. No manual approval response is required from your side.
    </p>

    <p style="margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 12px; color: #A0AEC0;">
      Thank you,<br>
      Hostel Management System
    </p>
  </body>
</html>`;

  let emailStatus: "sent" | "failed" = "failed";
  let responseText = "Brevo HTTP Request failed";

  try {
    console.log(`Sending parent leave email via Brevo HTTP API to ${parentEmail}...`);
    
    // Call Brevo v3 Transactional Email Endpoint
    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: {
          name: "Hostel Management System",
          email: BREVO_SENDER_EMAIL
        },
        to: [
          {
            email: parentEmail,
            name: parentName
          }
        ],
        subject: `Hostel Leave Notification: ${studentName} wants to apply for leave`,
        htmlContent: emailHtml,
        textContent: emailText
      })
    });

    const responseBody = await brevoResponse.text();
    if (brevoResponse.ok) {
      emailStatus = "sent";
      responseText = `Email sent successfully: ${responseBody}`;
      console.log(responseText);
    } else {
      console.error(`Brevo API returned error status ${brevoResponse.status}:`, responseBody);
      responseText = `Brevo error status ${brevoResponse.status}: ${responseBody}`;
    }
  } catch (e: any) {
    // Error Handling Requirement: If Brevo email sending fails, do not break leave application flow
    console.error("Uncaught exception in Brevo API email sending:", e);
    responseText = e?.message || "Uncaught error sending email via Brevo API";
  }

  // Save in email logs
  await supabaseAdmin.from("email_logs").insert({
    leave_id: leaveRequestId,
    parent_email: parentEmail,
    status: emailStatus,
    response_text: responseText,
  });

  // Mark leave applications table that parent email was sent
  if (emailStatus === "sent") {
    await supabaseAdmin
      .from("leave_applications")
      .update({ parent_email_sent: true })
      .eq("id", leaveRequestId);
  }

  // Note: We always return success: true to ensure the frontend leave application flow is not broken by email delivery issues!
  return new Response(JSON.stringify({ success: true, emailStatus, responseText }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
