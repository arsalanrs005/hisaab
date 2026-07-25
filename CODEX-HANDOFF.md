# Hisab — Codex deployment handoff

**Generated:** 2026-07-25  
**Project:** Next.js 16 financial ledger (`hisab`)  
**Node:** >= 22 (use `.nvmrc`)

## Quick start

```bash
npm ci
cp .env.example .env.local   # fill Supabase keys
npm run dev:clean            # http://localhost:3000/login
```

## Verification status (pre-zip)

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm test` | Pass — 17 tests |
| `npm run build` | Pass — all routes compile |

## Remote Supabase

- **Phase 7 migration applied** (`20260725130000_phase7_prospects_sales.sql`)
- Tables live: `sales_opportunities`, `upwork_opportunities`, `linkedin_prospects`, `exchange_rate_cache`
- Apply remaining migrations with Supabase CLI or `psql` against session pooler port **5432** (not 6543 for DDL)

## Vercel deploy checklist

1. Push repo to GitHub (init git if needed — this zip has no `.git` history)
2. Import project in Vercel → Framework: Next.js
3. Set **Environment Variables** (Production + Preview):

   | Variable | Notes |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server only — never expose to client |
   | `EXCHANGE_RATE_API_KEY` | Optional — Frankfurter works without key |

4. `vercel.json` already sets region `sin1`, `npm ci`, `npm run build`
5. Ensure Supabase Auth redirect URLs include your Vercel domain (`/auth/callback`)

## Architecture notes

- **Server/client split:** Client components must not import `src/data/**/queries.ts` directly (they use `import "server-only"`). Use server actions from `mutations.ts` or `import type` from shared `types.ts`.
- **Mock data removed:** No `from "@/data/mock"` in `src/`. Dev user switcher uses `src/lib/auth/dev-users.ts`.
- **Business tables:** Some queries use `(supabase as any)` until types are regenerated from remote schema.

## Remaining gaps (fix before calling “done”)

1. **Regenerate Supabase types from remote** — update `supabase:types` script for linked project; remove `any` casts in `src/data/business/`
2. **Global search UI** — backend in `src/data/search/`; wire dialog in `src/components/layout/app-header.tsx`
3. **Attachments upload UI** — schema + `hisab-attachments` bucket exist; no upload/download UI yet
4. **Playwright smoke tests** — not configured
5. **Delete or document `src/data/mock/`** — folder unused in production paths
6. **End-to-end browser audit** — login → dashboard → accounts → transfers → reports

## Key paths

| Area | Path |
|------|------|
| App routes | `src/app/(app)/` |
| Auth | `src/app/(auth)/login/` |
| Data layers | `src/data/*/` |
| Supabase server | `src/lib/supabase/server.ts` |
| Migrations | `supabase/migrations/` |
| Exports (CSV/Excel/PDF) | `src/lib/exports/` |
| Exchange rates | `src/lib/exchange-rates/fetch.ts` |

## Do not commit

- `.env`, `.env.local` (secrets)
- `node_modules/`, `.next/`, `.vercel/`
