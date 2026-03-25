import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== "POST") {
      return new Response("Only POST allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      const form = await request.formData();

      const name = form.get("fullName") || "Unknown";
      const email = form.get("email") || "no-email";
      const floorType = form.get("floorType") || "Not selected";
      const project = form.get("projectDetails") || "";

      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(email);
      const safeFloorType = escapeHtml(floorType);
      const safeProject = escapeHtml(project).replace(/\n/g, "<br>");

      const msg = createMimeMessage();

      msg.setSender({
        name: "Nirmana Constructions",
        addr: "no-reply@shehara.me",
      });

      msg.setRecipient("sheharaheshan@gmail.com");
      msg.setSubject(`New Contact: ${name} - ${floorType}`);

      msg.addMessage({
        contentType: "text/plain",
        data: `New Contact Form Submission

Name: ${name}
Email: ${email}
Floor Type: ${floorType}
Project Details: ${project}
`,
      });

      msg.addMessage({
        contentType: "text/html",
        data: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Form Submission</title>
</head>
<body style="margin:0; padding:0; background:#f7f4f4; font-family:Arial, Helvetica, sans-serif; color:#333333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f4f4; margin:0; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px; background:#ffffff; border-radius:16px; overflow:hidden;">

          <tr>
            <td align="center" style="padding:28px 24px 16px;">
              <div style="margin:0 auto 14px; font-size:24px; font-weight:800; letter-spacing:1px; font-family:Arial, Helvetica, sans-serif;">
                  <span style="color:#e53935;">NIRMANA</span> <span style="color:#555555;">CONSTRUCTIONS</span>
                    </div>
              <div style="font-size:20px; line-height:1.3; font-weight:600; color:#222222; margin-bottom:8px;">
                New Contact Request
              </div>
              <div style="font-size:15px; line-height:1.7; color:#666666; max-width:460px; margin:0 auto;">
                You received a new inquiry from your website contact form.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff6f6; border:1px solid #f3d6d6; border-radius:14px;">
                <tr>
                  <td style="padding:20px 18px;">
                    <div style="font-size:14px; line-height:1.8; color:#333333;">
                      <p style="margin:0 0 10px;"><strong style="color:#c62828;">Name:</strong> ${safeName}</p>
                      <p style="margin:0 0 10px;"><strong style="color:#c62828;">Email:</strong> ${safeEmail}</p>
                      <p style="margin:0 0 10px;"><strong style="color:#c62828;">Service Type:</strong> ${safeFloorType}</p>
                      <p style="margin:0;"><strong style="color:#c62828;">Project Details:</strong><br>${safeProject || "No details provided."}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 24px 28px;">
              <div style="display:inline-block; background:#e53935; color:#ffffff; font-size:14px; font-weight:700; padding:12px 26px; border-radius:999px;">
                Website Inquiry Received
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 24px 24px; font-size:12px; line-height:1.6; color:#999999;">
              This email was automatically sent from your website form.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `,
      });

      const emailMessage = new EmailMessage(
        "no-reply@shehara.me",
        "sheharaheshan@gmail.com",
        msg.asRaw()
      );

      await env.NOTIFY_ME.send(emailMessage);

      return new Response("Thank you! Message sent to owner.", {
        status: 200,
        headers: corsHeaders,
      });
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(`Failed to send email: ${err?.message || err}`, {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};