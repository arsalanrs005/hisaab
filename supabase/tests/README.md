# Database tests

Phase 2 security cases live in `phase2_security.test.sql` (pgTAP).

```bash
npx supabase db reset   # migrations + seed
npx supabase test db    # or: npm run supabase:test
```

Tests create temporary auth users for Arsalan, Ali, and an unauthorized outsider, map them to `approved_users` / `profiles`, then assert the 36 brief cases under `authenticated` / `anon` roles.
