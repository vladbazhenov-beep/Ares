export const COLORS = {
  ink: "#15161B",
  paper: "#F6F5F1",
  line: "#E3E1D8",
  violet: "#5B4CFF",
  violetDark: "#4239CC",
  green: "#1E9E5A",
  greenBg: "#E4F5EB",
  amber: "#C97F0E",
  amberBg: "#FBF0DD",
  red: "#D14545",
  redBg: "#FBEAEA",
  slate: "#6B6A63",
  slateBg: "#EDECE6",
};

export const STATUS_META = {
  TODO: { label: "To do", fg: COLORS.slate, bg: COLORS.slateBg },
  PROGRESS: { label: "In progress", fg: COLORS.amber, bg: COLORS.amberBg },
  TO_APPROVE: { label: "To approve", fg: COLORS.red, bg: COLORS.redBg },
  DONE: { label: "Done", fg: COLORS.green, bg: COLORS.greenBg },
};

export const ROLE_META = {
  ADMIN: { label: "Админ", fg: COLORS.violet, bg: "#EFEDFF" },
  CLIENT: { label: "Клиент", fg: "#0C447C", bg: "#E6F1FB" },
  CREATOR: { label: "Креатор", fg: COLORS.green, bg: COLORS.greenBg },
};
