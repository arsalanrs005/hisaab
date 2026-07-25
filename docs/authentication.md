# Authentication (Phase 1)

## Overview

Hisab is a private workspace. Only these emails may authenticate:

- `arsalanrs005@gmail.com` (Arsalan)
- `alirashidd.232@gmail.com` (Ali)

Allowlist source of truth: `public.approved_users` (seeded in Phase 1 migration).  
Hardcoded email checks remain as a temporary fallback until the migration is applied.

## Flows

| Flow | Route / entry | Behavior |
|------|---------------|----------|
| Email/password | `/login` | Rejects non-allowlisted emails before calling Supabase |
| Google OAuth | `/login` → `/auth/callback` | Exchanges code, checks `approved_users`, ensures profile, or signs out |
| Password reset | `/login` (forgot) → email → `/auth/reset-password` | Allowlisted emails only |
| Sign out | Header / sidebar | `supabase.auth.signOut()` then `/login` |
| Session refresh | `src/middleware.ts` | `@supabase/ssr` cookie refresh |

## Route protection

- Unauthenticated users hitting app routes → `/login?next=<path>`
- Authenticated users hitting `/login` or `/` → `/dashboard` (or `next`)
- Unauthorized email mid-session → signed out → `/login?error=private_workspace`

## Profiles

On first approved login, `ensure_profile_for_auth_user()` creates `profiles` row linked to `approved_users`.

Fields include `onboarding_completed` (wired in Phase 3).

## Dev user switcher

Visible only when `NODE_ENV === "development"`. Production builds hide it; the signed-in profile drives `currentUser`.

## Manual dashboard steps

1. Authentication → Providers → enable **Email** and **Google**.
2. Google Cloud OAuth client redirect URIs:
   - `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase URL configuration:
   - Site URL: `http://localhost:3000` (local) / production URL
   - Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/reset-password`, plus production equivalents
4. Disable public sign-ups if the provider UI offers it (app still enforces allowlist).
5. Apply migration `supabase/migrations/20260724120000_phase1_auth_profiles.sql`.
6. Create Auth users for both emails (Dashboard → Users) **or** complete first Google login after seed.

## Environment

See `.env.example`. Canonical names:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Aliases currently accepted: `SUPABASE_URL`, `SUPABASE_ANON_PUBLICK_KEY` / `SUPABASE_ANON_KEY` (mapped in `next.config.ts` + `src/lib/env.ts`).
