"use server";

import { prisma } from "@/lib/prisma";
import { sendLoginCode } from "@/lib/mailer";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestCode(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(`/login?step=email&error=${encodeURIComponent("Введите корректный email.")}`);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const usersCount = await prisma.user.count();

  if (!user && usersCount > 0) {
    redirect(
      `/login?step=email&error=${encodeURIComponent(
        "Доступ не найден. Обратитесь к администратору проекта."
      )}`
    );
  }

  const code = genCode();
  await prisma.loginCode.create({
    data: { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
  });

  let devCode = "";
  try {
    const result = await sendLoginCode(email, code);
    if (result.simulated) devCode = code;
  } catch (e) {
    redirect(
      `/login?step=email&error=${encodeURIComponent(
        "Не удалось отправить письмо. Проверьте RESEND_API_KEY и MAIL_FROM."
      )}`
    );
  }

  const q = new URLSearchParams({ step: "code", email });
  if (devCode) q.set("devCode", devCode);
  redirect(`/login?${q.toString()}`);
}

export async function verifyCode(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const code = String(formData.get("code") || "").trim();

  const record = await prisma.loginCode.findFirst({
    where: { email, code },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt < new Date()) {
    redirect(
      `/login?step=code&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        "Код неверный или истёк. Запросите новый."
      )}`
    );
  }

  await prisma.loginCode.deleteMany({ where: { email } });

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const usersCount = await prisma.user.count();
    if (usersCount > 0) {
      redirect(`/login?step=email&error=${encodeURIComponent("Доступ не найден.")}`);
    }
    // Bootstrap: the very first person to ever sign in becomes admin.
    user = await prisma.user.create({ data: { email, role: "ADMIN" } });
  }

  await createSessionCookie(user);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
