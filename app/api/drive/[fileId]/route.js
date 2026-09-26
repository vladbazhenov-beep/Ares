import { JWT } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

let cachedClient = null;

function getServiceAccountClient() {
  if (cachedClient) return cachedClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!email || !rawKey) return null;

  cachedClient = new JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  return cachedClient;
}

// Only lets a signed-in user stream a Drive file that's actually attached
// to a video they have access to -- this proxy isn't an open Drive gateway.
async function userCanAccessFile(fileId) {
  const session = await getSession();
  if (!session) return false;

  const item = await prisma.item.findFirst({
    where: { videoUrl: { contains: fileId } },
  });
  if (!item) return false;

  if (session.role === "ADMIN") return true;

  const access = await prisma.projectAccess.findFirst({
    where: { projectId: item.projectId, user: { email: session.email } },
  });
  return !!access;
}

export async function GET(request, { params }) {
  const { fileId } = await params;

  const allowed = await userCanAccessFile(fileId);
  if (!allowed) {
    return new Response("Not found", { status: 404 });
  }

  const client = getServiceAccountClient();
  if (!client) {
    return new Response(
      "Google Drive isn't configured on the server (missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_KEY).",
      { status: 500 }
    );
  }

  let token;
  try {
    const tokenResponse = await client.getAccessToken();
    token = tokenResponse?.token;
  } catch (e) {
    return new Response(`Google auth failed: ${e.message || e}`, { status: 500 });
  }
  if (!token) {
    return new Response("Google auth failed: no access token returned.", { status: 500 });
  }

  const range = request.headers.get("range");

  const driveRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(range ? { Range: range } : {}),
      },
    }
  );

  if (!driveRes.ok && driveRes.status !== 206) {
    const text = await driveRes.text().catch(() => "");
    return new Response(
      `Couldn't fetch this file from Google Drive (${driveRes.status}). Make sure it's shared with ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "the service account"} as a Viewer. ${text.slice(0, 200)}`,
      { status: driveRes.status }
    );
  }

  const headers = new Headers();
  headers.set("Content-Type", driveRes.headers.get("content-type") || "video/mp4");
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=3600");
  const contentRange = driveRes.headers.get("content-range");
  const contentLength = driveRes.headers.get("content-length");
  if (contentRange) headers.set("Content-Range", contentRange);
  if (contentLength) headers.set("Content-Length", contentLength);

  return new Response(driveRes.body, { status: driveRes.status, headers });
}
