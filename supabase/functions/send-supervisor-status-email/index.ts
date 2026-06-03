import { serve } from "https://deno.land/std@0.211.0/http/server.ts";

interface SendSupervisorEmailPayload {
  email: string;
  supervisorName: string;
  role?: string;
  status: "APPROVED" | "REJECTED";
  remark?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Read Brevo API Configurations
const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY") || "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";
const BREVO_SENDER_EMAIL = Deno.env.get("BREVO_SENDER_EMAIL") || "kjiya4171@gmail.com";

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    let payload: Partial<SendSupervisorEmailPayload>;
    try {
      payload = await req.json();
    } catch (parseErr) {
      console.error("Payload parse error:", parseErr);
      return new Response(JSON.stringify({ success: false, error: "Invalid JSON payload" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { email, supervisorName, role, status, remark } = payload;
    if (!email || !supervisorName || !status) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields (email, supervisorName, status)" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const accountRole = role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : "Supervisor";

    const isApproved = status === "APPROVED";
    const statusColor = isApproved ? "#2F855A" : "#C53030";
    const statusBgColor = isApproved ? "#F0FFF4" : "#FFF5F5";
    const statusBorderColor = isApproved ? "#C6F6D5" : "#FED7D7";
    const subjectText = isApproved 
      ? "Hostel Leave System — Account Approved!" 
      : "Hostel Leave System — Request Rejected";

    const emailText = isApproved 
      ? `Dear ${supervisorName},

Congratulations! Your request for a ${accountRole.toLowerCase()} account has been approved by the administrator.

You can now log in to the Hostel Leave Management System using your registered email address to access your ${accountRole.toLowerCase()} dashboard.

Best regards,
Hostel Management System`
      : `Dear ${supervisorName},

We regret to inform you that your request for a ${accountRole.toLowerCase()} account has been rejected by the administrator.

${remark ? `Remark from Administrator: "${remark}"` : ""}

If you believe this is an error, please reach out to the system administrator or submit a new role request with correct details.

Best regards,
Hostel Management System`;

    const emailHtml = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${subjectText}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #243B53; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px;">${accountRole} Account Status Notification</h2>
    <p>Dear <strong>${supervisorName}</strong>,</p>
    
    <p>The administrator has reviewed your registration request to join the system as a **${accountRole}**.</p>
    
    <div style="background-color: ${statusBgColor}; border: 1px solid ${statusBorderColor}; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
      <h3 style="margin-top: 0; color: ${statusColor}; font-size: 20px; letter-spacing: 0.5px;">
        REQUEST ${status}
      </h3>
      
      ${isApproved 
        ? `<p style="margin-bottom: 0; font-size: 14px; color: #2D3748;">
             Your ${accountRole.toLowerCase()} account is now <strong>active</strong>. You can log in immediately.
           </p>`
        : `<p style="margin-bottom: 0; font-size: 14px; color: #2D3748;">
             We regret to inform you that your ${accountRole.toLowerCase()} request was not approved at this time.
           </p>`
      }
    </div>

    ${!isApproved && remark 
      ? `<div style="background-color: #F7FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 15px; margin: 15px 0; font-style: italic; color: #4A5568;">
           <strong>Admin Remarks:</strong> "${remark}"
         </div>`
      : ""
    }

    ${isApproved 
      ? `<p style="margin-top: 20px;">
           <a href="${req.headers.get("origin") || "https://hostel-leave.vercel.app"}/login" 
              style="display: inline-block; background-color: #3182CE; color: #FFFFFF; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">
             Log In to Dashboard
           </a>
         </p>`
      : `<p>If you believe this is an error, please contact the administrator directly to verify your details.</p>`
    }

    <p style="margin-top: 30px; border-top: 1px solid #E2E8F0; padding-top: 10px; font-size: 12px; color: #A0AEC0;">
      Thank you,<br>
      Hostel Management System
    </p>
  </body>
</html>`;

    let emailStatus: "sent" | "failed" = "failed";
    let responseText = "Brevo HTTP Request failed";

    // Error Handling Requirement: If Brevo API key is missing, log clear error
    if (!BREVO_API_KEY) {
      console.error("CRITICAL ERROR: Brevo API key is missing. Unable to send emails.");
      return new Response(JSON.stringify({ success: false, error: "Brevo API key is missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      console.log(`Sending supervisor status email via Brevo HTTP API to ${email}...`);
      
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
              email: email,
              name: supervisorName
            }
          ],
          subject: subjectText,
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
      console.error("Uncaught exception in Brevo API email sending:", e);
      responseText = e?.message || "Uncaught error sending email via Brevo API";
    }

    if (emailStatus === "failed") {
      return new Response(JSON.stringify({ success: false, error: responseText }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (globalErr: any) {
    console.error("Global uncaught error in function execution:", globalErr);
    return new Response(JSON.stringify({ success: false, error: globalErr.message || globalErr }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
