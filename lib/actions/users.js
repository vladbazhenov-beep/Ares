"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Only an admin can do this.");
  }
}

export async function addUser(formData) {
  await requireAdmin();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const role = String(formData.get("role") || "CLIENT");
  const projectIds = formData.getAll("projectIds").map(String);
  if (!email || !email.includes("@")) return;

  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: { email, role },
  });

  if (role !== "ADMIN") {
    await prisma.projectAccess.deleteMany({ where: { userId: user.id } });
    if (projectIds.length > 0) {
      await prisma.projectAccess.createMany({
        data: projectIds.map((projectId) => ({ userId: user.id, projectId })),
        skipDuplicates: true,
      });
    }
  } else {
    await prisma.projectAccess.deleteMany({ where: { userId: user.id } });
  }

  revalidatePath("/admin");
}

export async function toggleUserProjectAccess(formData) {
  await requireAdmin();
  const email = String(formData.get("email"));
  const projectId = String(formData.get("projectId"));

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  const existing = await prisma.projectAccess.findUnique({
    where: { userId_projectId: { userId: user.id, projectId } },
  });

  if (existing) {
    await prisma.projectAccess.delete({ where: { id: existing.id } });
  } else {
    await prisma.projectAccess.create({ data: { userId: user.id, projectId } });
  }

  revalidatePath("/admin");
}

export async function deleteUser(formData) {
  await requireAdmin();
  const email = String(formData.get("email"));
  await prisma.user.delete({ where: { email } });
  revalidatePath("/admin");
}
