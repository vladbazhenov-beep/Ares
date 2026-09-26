import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COLORS } from "@/lib/constants";
import TopBar from "@/components/TopBar";
import { createProject, deleteProject } from "@/lib/actions/projects";
import { addUser, toggleUserProjectAccess, deleteUser } from "@/lib/actions/users";

const inputStyle = { padding: "9px 11px", borderRadius: 7, border: `1px solid ${COLORS.line}`, fontSize: 13.5, outline: "none" };
const primaryBtn = { padding: "9px 16px", borderRadius: 8, border: "none", background: COLORS.violet, color: "#fff", fontWeight: 600, cursor: "pointer" };
const dangerBtn = { border: "none", background: "transparent", color: COLORS.red, cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: 0 };
const rowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: "11px 14px", marginBottom: 8 };

function tabStyle(active) {
  return {
    display: "inline-flex",
    padding: "8px 13px",
    borderRadius: 8,
    border: `1px solid ${active ? COLORS.violet : COLORS.line}`,
    background: active ? "#EFEDFF" : "#fff",
    color: active ? COLORS.violetDark : COLORS.ink,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    marginRight: 6,
  };
}

function pillStyle(active) {
  return {
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    padding: "4px 9px",
    borderRadius: 6,
    border: `1px solid ${active ? COLORS.green : COLORS.line}`,
    background: active ? COLORS.greenBg : "#FAFAF7",
    color: active ? COLORS.green : COLORS.slate,
  };
}

export default async function AdminPage({ searchParams }) {
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const tab = sp.tab === "users" ? "users" : "projects";
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "desc" } });
  const users = await prisma.user.findMany({
    include: { access: { include: { project: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <TopBar session={session} active="admin" />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 18, letterSpacing: -0.3 }}>Admin panel</div>

        <div style={{ marginBottom: 20 }}>
          <a href="/admin?tab=projects" style={tabStyle(tab === "projects")}>Projects</a>
          <a href="/admin?tab=users" style={tabStyle(tab === "users")}>Access</a>
        </div>

        {tab === "projects" && (
          <div>
            <form action={createProject} style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              <input name="name" required placeholder="New project name" style={{ ...inputStyle, flex: 1 }} />
              <button type="submit" style={primaryBtn}>Create</button>
            </form>
            {projects.map((p) => (
              <div key={p.id} style={rowStyle}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <form action={deleteProject}>
                  <input type="hidden" name="projectId" value={p.id} />
                  <button type="submit" style={dangerBtn}>Delete</button>
                </form>
              </div>
            ))}
            {projects.length === 0 && <div style={{ fontSize: 13, color: COLORS.slate }}>No projects yet.</div>}
          </div>
        )}

        {tab === "users" && (
          <div>
            <form action={addUser} style={{ background: "#fff", border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: 16, marginBottom: 18 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <input name="email" type="email" required placeholder="client@company.com" style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
                <select name="role" style={inputStyle} defaultValue="CLIENT">
                  <option value="CLIENT">Client</option>
                  <option value="CREATOR">Creator</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div style={{ fontSize: 12, color: COLORS.slate, marginBottom: 6 }}>Project access (not needed for admins):</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {projects.map((p) => (
                  <label key={p.id} style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 7, border: `1px solid ${COLORS.line}`, background: "#fff", color: COLORS.slate, cursor: "pointer" }}>
                    <input type="checkbox" name="projectIds" value={p.id} style={{ marginRight: 6 }} />
                    {p.name}
                  </label>
                ))}
                {projects.length === 0 && <span style={{ fontSize: 12, color: COLORS.slate }}>Create a project first in the Projects tab.</span>}
              </div>
              <button type="submit" style={primaryBtn}>Grant access</button>
            </form>

            {users.map((u) => (
              <div key={u.id} style={{ ...rowStyle, flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: 13.5 }}>
                    <b>{u.role}</b> · {u.email}
                  </div>
                  <form action={deleteUser}>
                    <input type="hidden" name="email" value={u.email} />
                    <button type="submit" style={dangerBtn}>Delete</button>
                  </form>
                </div>
                {u.role !== "ADMIN" && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {projects.map((p) => {
                      const on = u.access.some((a) => a.projectId === p.id);
                      return (
                        <form action={toggleUserProjectAccess} key={p.id}>
                          <input type="hidden" name="email" value={u.email} />
                          <input type="hidden" name="projectId" value={p.id} />
                          <button type="submit" style={pillStyle(on)}>{p.name}</button>
                        </form>
                      );
                    })}
                    {projects.length === 0 && <span style={{ fontSize: 12, color: COLORS.slate }}>No projects.</span>}
                  </div>
                )}
              </div>
            ))}
            {users.length === 0 && <div style={{ fontSize: 13, color: COLORS.slate }}>No users yet.</div>}
          </div>
        )}
      </main>
    </>
  );
}
