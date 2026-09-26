"use server";

import { prisma } from "@/lib/prisma";
import { sendLoginCode } from "@/lib/mailer";
import { createSessionCookie, clearSessionCookie } from "@/lib/session";
import { redirect } from "next/navigation";

function genCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isRedirectError(e) {
  return typeof e?.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");
}

function errorMessage(e) {
  const raw = e?.message ? String(e.message) : String(e);
  return raw.length > 300 ? raw.slice(0, 300) + "…" : raw;
}

export async function requestCode(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    redirect(`/login?step=email&error=${encodeURIComponent("Enter a valid email.")}`);
  }

  let user, usersCount;
  try {
    user = await prisma.user.findUnique({ where: { email } });
    usersCount = await prisma.user.count();
  } catch (e) {
    redirect(`/login?step=email&error=${encodeURIComponent("Database error: " + errorMessage(e))}`);
  }

  if (!user && usersCount > 0) {
    redirect(
      `/login?step=email&error=${encodeURIComponent("Access not found. Contact your project admin.")}`
    );
  }

  const code = genCode();
  try {
    await prisma.loginCode.create({
      data: { email, code, expiresAt: new Date(Date.now() + 10 * 60 * 1000) },
    });
  } catch (e) {
    redirect(`/login?step=email&error=${encodeURIComponent("Database write error: " + errorMessage(e))}`);
  }

  let devCode = "";
  try {
    const result = await sendLoginCode(email, code);
    if (result.simulated) devCode = code;
  } catch (e) {
    redirect(`/login?step=email&error=${encodeURIComponent("Couldn't send the email: " + errorMessage(e))}`);
  }

  const q = new URLSearchParams({ step: "code", email });
  if (devCode) q.set("devCode", devCode);
  redirect(`/login?${q.toString()}`);
}

export async function verifyCode(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const code = String(formData.get("code") || "").trim();

  let record;
  try {
    record = await prisma.loginCode.findFirst({
      where: { email, code },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    redirect(
      `/login?step=code&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        "Database error: " + errorMessage(e)
      )}`
    );
  }

  if (!record || record.expiresAt < new Date()) {
    redirect(
      `/login?step=code&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        "Incorrect or expired code. Request a new one."
      )}`
    );
  }

  try {
    await prisma.loginCode.deleteMany({ where: { email } });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const usersCount = await prisma.user.count();
      if (usersCount > 0) {
        redirect(`/login?step=email&error=${encodeURIComponent("Access not found.")}`);
      }
      // Bootstrap: the very first person to ever sign in becomes admin.
      user = await prisma.user.create({ data: { email, role: "ADMIN" } });
    }

    await createSessionCookie(user);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    redirect(
      `/login?step=code&email=${encodeURIComponent(email)}&error=${encodeURIComponent("Error: " + errorMessage(e))}`
    );
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}
