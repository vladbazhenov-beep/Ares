// Sends the one-time login code by email via Resend (https://resend.com).
// If RESEND_API_KEY is not set, the code is only logged to the server
// console so the app remains usable during local development -- the login
// page will also display it on screen in that case, clearly labeled as a
// dev fallback. It never falls back silently in production: set
// RESEND_API_KEY there so real emails go out.
export async function sendLoginCode(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || "ARES <onboarding@resend.dev>";

  if (!apiKey) {
    console.log(`[reelroom][dev] Login code for ${email}: ${code}`);
    return { simulated: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your ARES sign-in code",
      html: `
        <p>Your sign-in code for ARES:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${code}</p>
        <p style="color:#666;font-size:13px;">This code expires in 10 minutes. If you didn't request this, just ignore this email.</p>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mailer error: ${res.status} ${text}`);
  }

  return { simulated: false };
}
