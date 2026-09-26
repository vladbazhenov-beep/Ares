import { requestCode, verifyCode } from "@/lib/actions/auth";
import { COLORS } from "@/lib/constants";
import Logo from "@/components/Logo";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  borderRadius: 9,
  border: `1px solid ${COLORS.line}`,
  fontSize: 14,
  margin: "14px 0 12px",
  outline: "none",
};
const errorStyle = { color: COLORS.red, fontSize: 13, marginBottom: 12 };
const primaryBtn = {
  width: "100%",
  padding: "11px 0",
  borderRadius: 9,
  border: "none",
  background: COLORS.violet,
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const step = sp.step === "code" ? "code" : "email";
  const error = sp.error || "";
  const email = sp.email || "";
  const devCode = sp.devCode || "";

  return (
    <div style={{ minHeight: "100vh", background: COLORS.ink, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 400, background: COLORS.paper, borderRadius: 16, padding: "36px 32px", boxSizing: "border-box" }}>
        <div style={{ marginBottom: 22 }}>
          <Logo size="lg" />
        </div>

        {step === "email" && (
          <>
            <p style={{ fontSize: 14, color: COLORS.slate, lineHeight: 1.5, margin: 0 }}>
              Enter the email your admin gave access to. We'll send you a code to sign in.
            </p>
            <form action={requestCode}>
              <input type="email" name="email" required placeholder="you@company.com" style={inputStyle} />
              {error && <div style={errorStyle}>{error}</div>}
              <button type="submit" style={primaryBtn}>
                Get code
              </button>
            </form>
          </>
        )}

        {step === "code" && (
          <>
            <p style={{ fontSize: 14, color: COLORS.slate, lineHeight: 1.5, margin: 0 }}>
              Code sent to <strong style={{ color: COLORS.ink }}>{email}</strong>.
            </p>

            {devCode && (
              <div style={{ background: "#FFF9EC", border: `1px solid ${COLORS.amberBg}`, borderRadius: 10, padding: "12px 14px", margin: "14px 0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.amber, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  Demo mode — RESEND_API_KEY not set
                </div>
                <div style={{ fontSize: 12.5, color: COLORS.slate, lineHeight: 1.5, margin: "6px 0 8px" }}>
                  No email was sent — the code is shown here for testing. Set RESEND_API_KEY in .env to send real emails.
                </div>
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 24, fontWeight: 700, letterSpacing: 4, color: COLORS.ink }}>
                  {devCode}
                </div>
              </div>
            )}

            <form action={verifyCode}>
              <input type="hidden" name="email" value={email} />
              <input
                name="code"
                inputMode="numeric"
                required
                placeholder="6-digit code"
                style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", letterSpacing: 3 }}
              />
              {error && <div style={errorStyle}>{error}</div>}
              <button type="submit" style={primaryBtn}>
                Sign in
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, marginTop: 10 }}>
              <a href="/login?step=email" style={{ color: COLORS.slate, textDecoration: "none" }}>
                ← Use a different email
              </a>
              <form action={requestCode}>
                <input type="hidden" name="email" value={email} />
                <button
                  type="submit"
                  style={{ border: "none", background: "transparent", color: COLORS.violetDark, fontWeight: 600, cursor: "pointer", padding: 0, fontSize: 12.5 }}
                >
                  Resend code
                </button>
              </form>
            </div>
          </>
        )}

        {step === "email" && (
          <div style={{ marginTop: 16, fontSize: 12, color: COLORS.slate, lineHeight: 1.5 }}>
            If there are no users in the system yet, the first email to sign in automatically becomes the admin.
          </div>
        )}
      </div>
    </div>
  );
}
