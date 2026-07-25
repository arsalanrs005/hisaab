# Hisab dev server — diagnosis for GPT Sol

## Symptom

`npm run dev` appears to start but **pages never load** in the browser (blank/error). This has persisted ~7+ hours.

## What works

- Supabase remote DB is reachable (pooler session mode port 5432; direct IPv6 host does not resolve from local network).
- Phase 5 migrations were applied remotely.
- `node -e "console.log('hello')"` is instant.
- Occasionally Next prints `✓ Ready in ~300–800ms` and binds port 3000.

## What fails

### 1. First page compile never finishes (Turbopack — default `npm run dev`)

After `✓ Ready`, first request to `/login` logs:

```
○ Compiling /login ...
```

Then **hangs 2–10+ minutes** with **0 bytes** returned to curl/browser. Same for `/favicon.ico` when proxy/middleware runs.

Dev log: `.next/dev/logs/next-development.log` shows only:

```json
{"message":"○ Compiling /login ..."}
```

Never reaches `Compiled /login`.

### 2. Webpack mode crashes (`next dev --webpack`)

```
✓ Ready in ~370ms
TypeError: Cannot read properties of undefined (reading 'extend')
```

Seen in `/tmp/hisab-dev.log` when run as `next dev --webpack --webpack -p 3000`.

### 3. Multiple Next processes deadlock

Several sessions left **multiple** `next dev`, `next build`, and `start-server.js` processes running against the same `.next` folder. When more than one runs, startup hangs with **no** `Ready` line and port 3000 never listens.

**Always kill all before restarting:**

```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null
pkill -f "financialledger.*next" 2>/dev/null
rm -rf .next
npm run dev
```

### 4. Intermittent startup hang (no Ready at all)

Sometimes `next dev` prints only:

```
> hisab@0.1.0 dev
> next dev
```

…then nothing for 3+ minutes, no port bind. Using `script -q /dev/null npm run dev` helped stdout appear in some runs.

## Environment

- macOS 26.5, Apple Silicon
- Node **v20.20.2** (Supabase warns: upgrade to Node 22+)
- Next.js **16.2.11** (Turbopack default)
- Project path: `/Users/suniya/Desktop/financialledger` (Desktop — possible iCloud sync latency on file reads)
- React 19.2.4

## Changes already attempted (in this repo)

1. **middleware → proxy** (Next 16): `src/middleware.ts` deleted; added `src/proxy.ts` + `src/lib/supabase/proxy.ts`
2. **Public routes skip Supabase** when no auth cookie (faster login)
3. **AppProvider moved** from `src/app/layout.tsx` to `src/app/(app)/layout.tsx` only (login no longer pulls mock data + auth bootstrap)
4. **next.config.ts**: removed `turbopack.root`
5. **package.json**: `"dev": "WATCHPACK_POLLING=true next dev"`

## Likely root causes (for GPT Sol to verify)

1. **Turbopack compile hang** on `/login` dependency graph (Supabase SSR, server actions, Tailwind v4 `@import "tailwindcss"`, Geist fonts, etc.)
2. **Webpack `extend` crash** — possibly PostCSS/Tailwind/semver/plugin mismatch on Next 16
3. **Process contention** on `.next` from parallel dev/build
4. **Desktop/iCloud** slow or stuck file reads during bundler scan (sample showed `node::fs::ReadFileUtf8` blocked in `read()` for minutes)

## Repro steps

```bash
cd financialledger
lsof -ti :3000 | xargs kill -9 2>/dev/null
pkill -f "financialledger.*next" 2>/dev/null
rm -rf .next
npm run dev
# wait for "Ready"
curl -v --max-time 120 http://127.0.0.1:3000/login
# expect: hang, 0 bytes
```

## Files to inspect first

- `src/app/layout.tsx` — Geist fonts, ThemeProvider, globals.css
- `src/app/(auth)/login/login-client.tsx` — imports `@/lib/auth/actions` (server actions)
- `src/lib/auth/actions.ts` — `"use server"`, Supabase
- `src/proxy.ts` + `src/lib/supabase/proxy.ts`
- `postcss.config.mjs`, `src/app/globals.css` — Tailwind v4
- `next.config.ts`, `package.json`, `tsconfig.json`

## Success criteria

- `npm run dev` → Ready within 60s
- `http://localhost:3000/login` returns HTML within 30s on first load
- Browser shows Hisab sign-in page

## Not in this zip

- `.env` (secrets) — use `.env.example`; keys in user's local `.env`: `SUPABASE_URL`, `supabasedbpassword`, `Transaction_Pooler`, `Direct_Connection`, etc.
- `node_modules/`, `.next/` (regenerate with `npm install && npm run dev`)
