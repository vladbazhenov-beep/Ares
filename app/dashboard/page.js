import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COLORS, STATUS_META } from "@/lib/constants";
import TopBar from "@/components/TopBar";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const projects =
    session.role === "ADMIN"
      ? await prisma.project.findMany({ include: { items: true }, orderBy: { createdAt: "desc" } })
      : await prisma.project.findMany({
          where: { access: { some: { user: { email: session.email } } } },
          include: { items: true },
          orderBy: { createdAt: "desc" },
        });

  return (
    <>
      <TopBar session={session} active="dashboard" />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, letterSpacing: -0.3 }}>Projects</div>
        <div style={{ fontSize: 14, color: COLORS.slate, marginBottom: 24 }}>
          {session.role === "ADMIN" ? "All studio projects." : "Projects you have access to."}
        </div>

        {projects.length === 0 && (
          <div style={{ border: `1px dashed ${COLORS.line}`, borderRadius: 14, padding: "36px 24px", textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
              {session.role === "ADMIN" ? "No projects yet" : "No projects available"}
            </div>
            <div style={{ fontSize: 13, color: COLORS.slate }}>
              {session.role === "ADMIN" ? "Create your first project in the admin panel." : "Contact your admin to get access."}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {projects.map((p) => {
            const counts = { TODO: 0, PROGRESS: 0, TO_APPROVE: 0, DONE: 0 };
            p.items.forEach((i) => counts[i.status]++);
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 13, padding: 18, textDecoration: "none", color: COLORS.ink, display: "block" }}
              >
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 10 }}>{p.name}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(counts)
                    .filter(([, v]) => v > 0)
                    .map(([k, v]) => (
                      <span key={k} style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: STATUS_META[k].bg, color: STATUS_META[k].fg }}>
                        {v} {STATUS_META[k].label.toLowerCase()}
                      </span>
                    ))}
                  {p.items.length === 0 && <span style={{ fontSize: 12, color: COLORS.slate }}>Empty</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
