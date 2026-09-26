"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Only an admin can do this.");
  }
  return session;
}

export async function createProject(formData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  await prisma.project.create({ data: { name } });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function deleteProject(formData) {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function addItem(formData) {
  await requireAdmin();
  const projectId = String(formData.get("projectId"));
  await prisma.item.create({
    data: {
      projectId,
      packName: String(formData.get("packName") || "").trim() || "—",
      name: String(formData.get("name") || "").trim(),
      link: String(formData.get("link") || "").trim() || null,
      videoUrl: String(formData.get("videoUrl") || "").trim() || null,
      executor: String(formData.get("executor") || "").trim() || null,
    },
  });
  revalidatePath(`/projects/${projectId}`);
}
