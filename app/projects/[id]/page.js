import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COLORS, STATUS_META } from "@/lib/constants";
import TopBar from "@/components/TopBar";
import { addItem } from "@/lib/actions/projects";

const inputStyle = { padding: "9px 11px", borderRadius: 7, border: `1px solid ${COLORS.line}`, fontSize: 13.5, outline: "none" };
const primaryBtn = { padding: "9px 0", borderRadius: 8, border: "none", background: COLORS.violet, color: "#fff", fontWeight: 600, cursor: "pointer" };

export default async function ProjectPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) notFound();

  const isAdmin = session.role === "ADMIN";
  if (!isAdmin) {
    const access = await prisma.projectAccess.findFirst({
      where: { projectId: project.id, user: { email: session.email } },
    });
    if (!access) redirect("/dashboard");
  }

  const items = await prisma.item.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } });
  const cols = ["Статус", ...(isAdmin ? ["Исполнитель"] : []), "Pack name", "Name", "Link"];

  return (
    <>
      <TopBar session={session} />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }}>
        <Link href="/dashboard" style={{ fontSize: 13, color: COLORS.slate, textDecoration: "none" }}>
          ← Все проекты
        </Link>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 20px" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>{project.name}</div>
        </div>

        {isAdmin && (
          <form
            action={addItem}
            style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <input type="hidden" name="projectId" value={project.id} />
            <input name="packName" placeholder="Pack name" style={inputStyle} />
            <input name="name" placeholder="Name" required style={inputStyle} />
            <input name="link" placeholder="Link (ТЗ)" style={inputStyle} />
            <input name="videoUrl" placeholder="Video URL (mp4, необязательно)" style={inputStyle} />
            <input name="executor" placeholder="Исполнитель" style={inputStyle} />
            <button type="submit" style={{ gridColumn: "1 / -1", ...primaryBtn }}>
              Добавить ролик
            </button>
          </form>
        )}

        {items.length === 0 ? (
          <div style={{ border: `1px dashed ${COLORS.line}`, borderRadius: 14, padding: "36px 24px", textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>В проекте пока нет роликов</div>
            <div style={{ fontSize: 13, color: COLORS.slate }}>
              {isAdmin ? "Добавьте первый ролик формой выше." : "Пока нечего смотреть — загляните позже."}
            </div>
          </div>
        ) : (
          <div style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <thead>
                <tr style={{ background: "#FAFAF7", borderBottom: `1px solid ${COLORS.line}` }}>
                  {cols.map((c) => (
                    <th key={c} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4, color: COLORS.slate, fontWeight: 700 }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: `1px solid ${COLORS.line}` }}>
                    <td style={{ padding: "12px 14px" }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 6,
                          background: STATUS_META[it.status].bg,
                          color: STATUS_META[it.status].fg,
                        }}
                      >
                        {STATUS_META[it.status].label}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: "12px 14px" }}>
                        <span style={{ background: COLORS.ink, color: "#fff", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 7 }}>
                          {it.executor || "—"}
                        </span>
                      </td>
                    )}
                    <td style={{ padding: "12px 14px", color: COLORS.slate }}>{it.packName}</td>
                    <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                      <Link href={`/items/${it.id}`} style={{ color: COLORS.violetDark, textDecoration: "none" }}>
                        {it.name}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {it.link ? (
                        <a href={it.link} target="_blank" rel="noreferrer" style={{ color: COLORS.violet, fontSize: 12.5 }}>
                          Открыть
                        </a>
                      ) : (
                        <span style={{ color: COLORS.slate }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
