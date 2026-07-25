import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Service-role client for privileged server-only operations.
 * Never import this module from Client Components or shared browser code.
 */
export function createAdminClient() {
  const env = getServerEnv();

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/** Alias documenting intent when used inside route handlers that need elevated access. */
export function createServiceRoleClient() {
  return createAdminClient();
}

/** Unused helper kept for clarity — prefer `createClient` from `./server` for user RLS. */
export function createRouteHandlerClient(
  cookieStore: {
    getAll: () => { name: string; value: string }[];
    set: (name: string, value: string, options?: Record<string, unknown>) => void;
  }
) {
  const env = getServerEnv();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
