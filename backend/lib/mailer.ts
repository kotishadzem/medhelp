import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL ?? "MedHelp <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  if (!resend) {
    console.log(`[DEV] would send OTP ${code} to ${to} (RESEND_API_KEY not set)`);
    return;
  }

  const subject = `MedHelp — ${code}`;
  const html = otpHtml(code);
  const text = otpText(code);

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[mailer] resend error", error);
      throw new Error(error.message ?? "Failed to send email");
    }
    console.log(`[mailer] sent OTP to ${to} id=${data?.id}`);
  } catch (err) {
    console.error("[mailer] exception", err);
    throw err;
  }
}

function otpText(code: string): string {
  return [
    "MedHelp",
    "",
    `Your one-time code is: ${code}`,
    "",
    "The code is valid for 5 minutes. Do not share it with anyone.",
    "If you did not request this code, please ignore this email.",
  ].join("\n");
}

function otpHtml(code: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0b1220;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e7ecf3;">
    <table role="presentation" style="max-width:480px;margin:0 auto;background:#111a2e;border:1px solid #1f2b4d;border-radius:16px;padding:32px;">
      <tr><td>
        <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:24px;">
          <div style="width:36px;height:36px;border-radius:9px;background:#0ea5e9;color:#0b1220;font-weight:800;font-size:22px;text-align:center;line-height:30px;">+</div>
          <div style="font-weight:800;font-size:18px;letter-spacing:-0.3px;">MedHelp</div>
        </div>
        <div style="color:#8a94a8;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">Verification code</div>
        <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;color:#e7ecf3;letter-spacing:-0.5px;">${code}</h1>
        <p style="color:#8a94a8;font-size:14px;line-height:22px;margin:16px 0 0;">
          This code is valid for 5 minutes. Do not share it with anyone.
          If you did not request this code, you can ignore this message.
        </p>
        <p style="color:#5d6781;font-size:12px;margin-top:32px;">MedHelp — your medication assistant.</p>
      </td></tr>
    </table>
  </body>
</html>`;
}
