"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireItemAccess(itemId) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new Error("Ролик не найден.");

  if (session.role !== "ADMIN") {
    const access = await prisma.projectAccess.findFirst({
      where: { projectId: item.projectId, user: { email: session.email } },
    });
    if (!access) throw new Error("Нет доступа к этому проекту.");
  }

  return { session, item };
}

// Clients (and admins) approve or send back for revision.
// Creators (and admins) mark work in progress or submit for approval.
export async function setItemStatus(itemId, status) {
  const { session, item } = await requireItemAccess(itemId);
  const isModerator = session.role === "ADMIN" || session.role === "CLIENT";
  const isProducer = session.role === "ADMIN" || session.role === "CREATOR";

  const moderatorOnly = status === "DONE" || (status === "PROGRESS" && item.status === "TO_APPROVE");

  if (moderatorOnly && !isModerator) throw new Error("Нет прав на это действие.");
  if (!moderatorOnly && !isProducer) throw new Error("Нет прав на это действие.");

  await prisma.item.update({ where: { id: itemId }, data: { status } });
  revalidatePath(`/items/${itemId}`);
  revalidatePath(`/projects/${item.projectId}`);
}

export async function addComment(itemId, { parentId, text, timecode }) {
  const { session } = await requireItemAccess(itemId);
  if (!text || !text.trim()) return;

  await prisma.comment.create({
    data: {
      itemId,
      timecode: Number(timecode) || 0,
      authorEmail: session.email,
      authorRole: session.role,
      text: text.trim(),
      parentId: parentId || null,
      tag: parentId ? null : "todo",
    },
  });

  revalidatePath(`/items/${itemId}`);
}

export async function toggleCommentTag(commentId, itemId) {
  await requireItemAccess(itemId);
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) return;

  await prisma.comment.update({
    where: { id: commentId },
    data: { tag: comment.tag === "done" ? "todo" : "done" },
  });

  revalidatePath(`/items/${itemId}`);
}
