# ARES

A video review and approval tool: clients and creators get access by email
to only their own projects, leave timecoded comments in threads, and the
client approves a video or sends it back for revision.

This is a real full-stack app on Next.js (App Router) with a database and
one-time-code email sign-in — unlike the artifact prototype, this has real
server-side access checks and actually sends the login code by email
(via Resend).

## Stack

- **Next.js 16** (App Router, Server Actions, Server Components)
- **PostgreSQL + Prisma** — database
- **Resend** — sends login-code emails (any other transactional email
  service can be wired in the same way inside `lib/mailer.js`)
- **google-auth-library** — streams video files directly from Google Drive
- Session — httpOnly cookie with a signed JWT (`jsonwebtoken`)

## Roles and access

- **Admin** — sees every project, creates projects, adds users and assigns
  them access to specific projects, sees the "Assignee" column.
- **Client** — sees only the projects an admin gave them access to; can
  approve a video or request changes once it's in "To approve" status.
- **Creator** — sees only their own projects; sets "In progress" and "Send
  for approval".

Access is granted by email in the admin panel's "Access" tab — nothing is
self-service.

## Easiest way — no terminal, nothing to install

Everything is done by clicking around on two sites: GitHub (stores the
code) and Vercel (runs the app and gives you a free database).

1. Sign up at [github.com](https://github.com) if you don't have an account.
2. Create a new repository (**New repository** button); private is fine.
3. Open it and click **Add file → Upload files** — drag in the contents of
   the unzipped `reelroom` folder (everything except `node_modules`, if it
   ever shows up), then click **Commit changes**.
4. Sign up at [vercel.com](https://vercel.com) via "Continue with GitHub" —
   this links the two accounts automatically.
5. On Vercel click **Add New → Project**, pick your repository, click
   **Import**.
6. Before the first deploy, open the **Storage** tab on that same Vercel
   project → **Create Database** → choose Postgres (Neon) → **Connect** —
   Vercel creates the database and adds `POSTGRES_URL` to the project's
   settings for you.
7. In **Settings → Environment Variables** add one more variable:
   `SESSION_SECRET` — any long random string works (just mash the keyboard
   for 40 characters).
8. Click **Deploy**. In 1–2 minutes Vercel gives you a link like
   `https://your-project.vercel.app` — that's the live site; the database
   tables get created automatically during the build.
9. Open that link. The first email you sign in with becomes the admin.

From then on, code changes can be made right on GitHub (the pencil icon on
a file) — Vercel rebuilds and updates the site automatically.

Below is an alternative for anyone who'd rather work locally in a terminal.

## Running locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in:
   - `POSTGRES_URL` — a Postgres connection string (a free
     [Neon](https://neon.tech) or [Supabase](https://supabase.com) database
     works, or a local Postgres install).
   - `SESSION_SECRET` — a long random string, e.g.:
     ```bash
     openssl rand -base64 32
     ```
   - `RESEND_API_KEY` and `MAIL_FROM` — can stay empty during development:
     the login code is printed to the server console and shown right on the
     login screen, labeled "Demo mode".
3. Create the database tables:
   ```bash
   npx prisma db push
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open `http://localhost:3000`. **The first email you sign in with
   automatically becomes the admin.**

## Sending real emails

1. Sign up at [resend.com](https://resend.com), verify a sender domain (or
   use `onboarding@resend.dev` for testing).
2. Create an API key and put it in `RESEND_API_KEY`.
3. Set `MAIL_FROM`, e.g. `ARES <team@your-domain.com>`.

After that, codes arrive by real email instead of showing on screen.

## Deploying

Easiest is [Vercel](https://vercel.com) + a managed Postgres (Neon,
Supabase, Railway):

1. Push the project to your own GitHub repo.
2. Import it into Vercel.
3. Add the environment variables from `.env` in the Vercel project settings.
4. The build script runs `prisma db push` automatically, so the tables get
   created on every deploy — no extra step needed.

## Video

The app doesn't store video files itself. In the "Video URL" field you can
use any of:

- A **Google Drive link** (`drive.google.com/file/d/.../view`) — the app
  streams it directly through the server using a Google service account
  (see setup below), so it plays with full native seeking regardless of
  file size.
- A **YouTube link** (including `youtu.be`) — plays through YouTube's own
  embedded player. Comment timestamps aren't synced to it automatically
  (you set the position manually to match what's playing), since YouTube
  doesn't expose that to outside pages.
- A **direct file link** (S3/CloudFront, Cloudflare Stream, Mux, Bunny
  Stream, Supabase Storage, etc.) — plays natively with full seeking, same
  as Drive.

If no link is set, a placeholder is shown instead of the player.

### Setting up Google Drive playback

1. Go to [Google Cloud Console](https://console.cloud.google.com/), create
   a project (or use an existing one).
2. Enable the **Google Drive API** for it (APIs & Services → Library →
   search "Google Drive API" → Enable).
3. Go to **APIs & Services → Credentials → Create Credentials → Service
   account**. Give it any name, finish the wizard.
4. Open the new service account → **Keys** tab → **Add Key → Create new
   key → JSON**. This downloads a `.json` file — keep it private.
5. In that file, copy the `client_email` value into the
   `GOOGLE_SERVICE_ACCOUNT_EMAIL` environment variable, and the
   `private_key` value (the long string starting with
   `-----BEGIN PRIVATE KEY-----`) into `GOOGLE_SERVICE_ACCOUNT_KEY`, exactly
   as it appears (with the `\n` sequences — don't convert them to real line
   breaks).
6. For every video file (or the whole folder) on Google Drive that should
   be playable in the app, click **Share** and add the service account's
   email (from step 5) as a **Viewer**. Files don't need to be public —
   sharing with just that one address is enough, and keeps everything
   private from the rest of the internet.
7. Add both environment variables in Vercel (Settings → Environment
   Variables) and redeploy.

After that, pasting a normal Drive share link into "Video URL" is all
that's needed — the app resolves the file ID from the link and streams it
via `/api/drive/[fileId]`, which checks that the signed-in user actually
has access to that video's project before serving any bytes.

## Known MVP limitations

- No rate limit on requesting a login code — worth adding for production
  (e.g. via Upstash Redis) at the `requestCode` level.
- No "view only, no comments" role — clients and creators currently have a
  fixed set of permissions, but `lib/actions/items.js` and
  `lib/actions/users.js` are the right place to extend that.
