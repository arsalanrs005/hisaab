# Hisab dev-server fix

This patch targets the three highest-risk causes in the diagnosis package:

1. `next/font/google` was part of every first route compile and can block while fetching font assets. It has been replaced with a local system-font stack.
2. Tailwind v4 automatic source detection could scan the whole repository. It is now restricted explicitly to `src/` with `source(none)` and `@source "../"`.
3. Approved-user helpers were mixed into the Zod environment module, causing the global proxy and client provider to include Zod. They now live in a zero-dependency module, and the only `.extend(...)` call was removed.

Additional changes:

- Node 22 is required through `.nvmrc` and `engines`.
- `WATCHPACK_POLLING` was removed from the default Turbopack command.
- The unused direct `semver` dependency was removed.
- `npm run dev:clean` kills stale local Next processes, removes `.next`, and starts one dev server.
- `npm run dev:trace` creates a Turbopack trace when deeper diagnosis is needed.

## Run from a non-iCloud directory

Do not run this project from Desktop, Documents, or another iCloud-synced folder.

```bash
mkdir -p ~/Developer
cp -R /path/to/hisab-dev-fixed ~/Developer/financialledger
cd ~/Developer/financialledger
nvm install 22
nvm use 22
rm -rf node_modules .next
npm ci
npm run dev:clean
```

Then open:

```text
http://localhost:3000/login
```

## Canonical environment names

Prefer these names in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Legacy aliases remain supported by the current config, but canonical names reduce ambiguity.

## If it still hangs

Run:

```bash
npm run dev:trace
```

Request `/login` once, stop the server, and inspect the generated trace under `.next/dev/` with the official Next.js trace viewer.

Also run the minimal isolation check:

```bash
mv src/proxy.ts src/proxy.ts.disabled
rm -rf .next
npm run dev
```

If `/login` now compiles, the remaining issue is in proxy/auth bundling. Restore the file after testing:

```bash
mv src/proxy.ts.disabled src/proxy.ts
```
