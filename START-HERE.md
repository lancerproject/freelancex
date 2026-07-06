# Xwork — Getting Started

A freelancing marketplace (like Upwork) built with **Next.js 16**, **React 19**,
**Tailwind CSS v4**, and **Supabase** (auth + database + file storage).

## What's already done

- ✅ Dependencies installed (`node_modules`)
- ✅ Supabase credentials present in `.env.local`
- ✅ Full database schema written to `supabase-setup.sql`

## One step you must do: set up the database tables

The app's code expects specific tables (jobs, proposals, contracts, etc.).
Run the provided SQL once to create them:

1. Go to your Supabase project at https://supabase.com/dashboard
2. Open **SQL Editor** → **New query**
3. Open `supabase-setup.sql` from this folder, copy **everything**, paste it in
4. Click **Run**

This creates all tables, security rules, the file-storage bucket, and a trigger
that auto-creates a user profile on signup. It's safe to run more than once.

### Enable Google login (the app uses Google sign-in)

1. Supabase dashboard → **Authentication** → **Providers** → **Google** → enable it
   (you'll need a Google OAuth client ID/secret from the Google Cloud Console).
2. Supabase dashboard → **Authentication** → **URL Configuration** → add
   `http://localhost:3000/auth/callback` to the **Redirect URLs**.

## Run the app

Open a terminal in the project root (`C:\Users\SURFACE\freelancing-marketplace`):

```powershell
npm run dev
```

Then open **http://localhost:3000**.

## Available commands

| Command         | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Start the dev server (hot reload)     |
| `npm run build` | Production build                      |
| `npm run start` | Run the production build              |
| `npm run lint`  | Run ESLint                            |

## How the app works (feature tour)

- `/` — marketing landing page
- `/register`, `/login` — sign up / sign in (Google OAuth)
- `/role` — choose to be a **client** or **freelancer**
- `/jobs`, `/jobs/new` — browse jobs / post a job (clients)
- `/jobs/[id]` — job detail + apply with a proposal (freelancers)
- `/proposals`, `/freelancer` — review/track proposals
- `/contracts`, `/contracts/[id]` — active contracts, milestones, file uploads
- `/messages/[id]` — chat between client and freelancer
- `/notifications` — in-app notifications
- `/profile` — edit your public profile
- `/dashboard` — your hub after logging in

## Database tables (created by the SQL)

`profiles`, `jobs`, `proposals`, `contracts`, `milestones`, `conversations`,
`messages`, `notifications`, `contract_files` + a `project-files` storage bucket.
