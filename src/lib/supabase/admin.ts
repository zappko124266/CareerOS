import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { clientEnv } from "@/lib/env.client";
import { env } from "@/lib/env.server";
import type { Database } from "@/types/supabase";

/**
 * Privileged Supabase client using the service role key — bypasses Row
 * Level Security. Reserve for trusted server-only paths (webhooks, admin
 * tooling, background jobs). Never import this from anything reachable by
 * a Client Component, and never use it to satisfy a per-user request that
 * the DAL should be authorizing instead.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
