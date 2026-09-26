"use client";

import { Download } from "lucide-react";
import { COLORS } from "@/lib/constants";

export default function DownloadAllButton({ links }) {
  if (!links || links.length === 0) return null;

  function downloadAll() {
    links.forEach(({ url, name }) => {
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "video";
      a.target = "_blank";
      a.rel = "noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }

  return (
    <button
      type="button"
      onClick={downloadAll}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 13px",
        borderRadius: 8,
        border: `1px solid ${COLORS.violet}`,
        background: "#fff",
        color: COLORS.violetDark,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      <Download size={14} /> Download all ({links.length})
    </button>
  );
}
