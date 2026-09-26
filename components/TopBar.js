import Link from "next/link";
import { LogOut, Shield } from "lucide-react";
import { COLORS, ROLE_META } from "@/lib/constants";
import { logoutAction } from "@/lib/actions/auth";

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, fg: COLORS.slate, bg: COLORS.slateBg };
  return (
    <span
      style={{
        background: meta.bg,
        color: meta.fg,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 8px",
        borderRadius: 6,
        textTransform: "uppercase",
        letterSpacing: 0.3,
      }}
    >
      {meta.label}
    </span>
  );
}

export default function TopBar({ session, active }) {
  return (
    <div style={{ borderBottom: `1px solid ${COLORS.line}`, background: "#fff" }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/dashboard"
          style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", color: COLORS.ink }}
        >
          <div
            style={{
              background: "#132A33",
              borderRadius: 8,
              padding: "6px 12px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: 1.5 }}>ARES</span>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {session.role === "ADMIN" && (
            <Link
              href="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                borderRadius: 8,
                border: `1px solid ${active === "admin" ? COLORS.violet : COLORS.line}`,
                textDecoration: "none",
                background: active === "admin" ? "#EFEDFF" : "#fff",
                color: active === "admin" ? COLORS.violetDark : COLORS.ink,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Shield size={14} /> Admin panel
            </Link>
          )}
          <div style={{ fontSize: 13, color: COLORS.slate, display: "flex", alignItems: "center", gap: 8 }}>
            <RoleBadge role={session.role} />
            {session.email}
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              style={{ border: "none", background: "transparent", cursor: "pointer", color: COLORS.slate, display: "flex" }}
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
