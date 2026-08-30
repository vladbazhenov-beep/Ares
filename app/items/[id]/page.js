import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { COLORS } from "@/lib/constants";
import TopBar from "@/components/TopBar";
import VideoReview from "@/components/VideoReview";

export default async function ItemPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const item = await prisma.item.findUnique({ where: { id }, include: { project: true } });
  if (!item) notFound();

  if (session.role !== "ADMIN") {
    const access = await prisma.projectAccess.findFirst({
      where: { projectId: item.projectId, user: { email: session.email } },
    });
    if (!access) redirect("/dashboard");
  }

  const comments = await prisma.comment.findMany({ where: { itemId: item.id }, orderBy: { createdAt: "asc" } });

  return (
    <>
      <TopBar session={session} />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px 64px" }}>
        <Link href={`/projects/${item.projectId}`} style={{ fontSize: 13, color: COLORS.slate, textDecoration: "none" }}>
          ← {item.project.name}
        </Link>
        <VideoReview item={item} initialComments={comments} session={session} />
      </main>
    </>
  );
}
