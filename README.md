# Consecrate

A group prayer and fasting app for churches. A leader sets up a fast, members
join with a six-character code, and everyone follows the same daily scripture,
prayer focus and check-in.

Version 1 targets iOS and is built with Expo so Android can follow.

## Running it

```bash
npm install
cp .env.example .env   # then fill in the Supabase URL and anon key
npm start
```

Without a `.env` the app starts but shows a setup screen instead of the join
screen.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # unit tests for the pure logic (join codes, dates)
npm run test:db     # schema and access-rule tests against a throwaway local Postgres
```

`test:db` needs the Postgres server binaries installed (`initdb`, `pg_ctl`). It
does not need Docker or a Supabase project.

## How it is put together

| Where | What |
| --- | --- |
| `src/app/` | Screens, one file per route (Expo Router) |
| `src/components/ui.tsx` | The building blocks every screen is composed from |
| `src/theme.ts` | Colour, type and spacing. The only place visual values live |
| `src/lib/api.ts` | Every backend call |
| `src/lib/queries.ts` | TanStack Query hooks over `api.ts`; screens use these |
| `src/lib/dates.ts`, `join-code.ts`, `fast-types.ts` | Pure logic, unit tested |
| `supabase/migrations/` | The database schema, access rules and default plan |
| `supabase/tests/` | Access-rule tests |

### Decisions worth knowing

- **No sign-up.** First launch creates an anonymous Supabase session. Sign in
  with Apple will be linked later, only to restore data on a new phone.
- **The database enforces access, not the app.** Row-level security limits
  every table to the fast's leader and members. Creating and joining a fast go
  through database functions (`create_fast`, `join_fast`) so a join code is the
  only way in.
- **Days are calendar days on the member's own phone.** Day 1 is the start
  date wherever you are; dates are never converted through UTC.
- **Minimal personal data.** A first name and a fast type. No body data, ever.
- **Plain React Native styling with a single theme file**, rather than a UI
  framework. The app is about fifteen screens of forms and lists, and a theme
  file plus a handful of components keeps the native build simple.

## Setting up the backend

1. Create a Supabase project.
2. Enable anonymous sign-ins (Authentication → Sign In / Providers).
3. Apply the migrations in `supabase/migrations/` in order (`supabase db push`,
   or paste them into the SQL editor).
4. Put the project URL and anon key in `.env`.

## Content note

The default 21-day plan in `supabase/migrations/20261114000100_default_plan.sql`
uses real scripture references, but its prayer focuses and devotionals are
placeholder drafts. They need a pastor's review before launch.
