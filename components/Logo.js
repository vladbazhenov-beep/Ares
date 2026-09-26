import { COLORS } from "@/lib/constants";

export default function Logo({ size = "md", dark = false }) {
  const dims =
    size === "lg"
      ? { icon: 40, name: 21, tag: 10.5, gap: 12 }
      : { icon: 30, name: 16, tag: 8.5, gap: 9 };

  const ringColor = dark ? "rgba(255,255,255,0.35)" : "#B9B9B9";
  const nameColor = dark ? "#fff" : COLORS.ink;
  const tagColor = dark ? "rgba(255,255,255,0.55)" : COLORS.slate;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: dims.gap }}>
      <svg width={dims.icon} height={dims.icon} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
        <circle cx="20" cy="20" r="17" fill="none" stroke={ringColor} strokeWidth="1" />
        <circle cx="20" cy="20" r="11" fill="none" stroke={ringColor} strokeWidth="1" />
        <circle cx="20" cy="20" r="5" fill="none" stroke={ringColor} strokeWidth="1" />
        <path d="M20,20 L18.65,35.44 A15.5,15.5 0 0,1 4.74,22.69 Z" fill="#E0342B" />
      </svg>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontWeight: 800, fontSize: dims.name, letterSpacing: 1, color: nameColor }}>ARES</span>
        <span
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: dims.tag,
            letterSpacing: 2,
            color: tagColor,
            textTransform: "uppercase",
            marginTop: 2,
          }}
        >
          Creative engine
        </span>
      </div>
    </div>
  );
}
