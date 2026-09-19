# Stride — Habit Tracker with Accountability

A full-stack habit tracker built with Next.js App Router, TypeScript, Tailwind CSS, Lucide React, Supabase Auth, and PostgreSQL.

The app's core loop is intentionally simple: create daily habits → check in → attach proof → keep your accountability buddy's progress visible.

## Stack

- Next.js 16 App Router + React 19 + TypeScript
- Tailwind CSS 4
- Supabase Auth + PostgreSQL + Row Level Security
- @supabase/ssr for cookie-based SSR auth
- Lucide React for icons

## Project structure

```
app/                 Next.js routes and server actions
components/          Dashboard and authentication UI
lib/                 Queries, auth, dates, Supabase clients
scripts/seed.mjs     Creates the two test accounts and sample data
supabase/migrations/ Database schema and RLS
types/               Database types
```

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
3. Run the SQL migrations in `supabase/migrations/`.
4. Run `npm install`.
5. Run `npm run seed` to create the test accounts and sample habits.
6. Run `npm run dev`.

Never commit `.env.local` or a Supabase service-role key.

## Test accounts

The seed script contains these two confirmed test-account definitions:

- buddy — `buddy@stride.local`
- buddys — `buddys@stride.local`

Their passwords are defined only in `scripts/seed.mjs` and are intended for local/test use.

## Fixed Supabase relationship

The migration `supabase/migrations/20260919000200_fix_habits_profile_relationship.sql` restores the `habits_owner_id_fkey` relationship expected by PostgREST and reloads the schema cache.

## Verification

```bash
npm run typecheck
npm run lint
npm run build
```
