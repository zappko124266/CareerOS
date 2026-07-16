import { createBrowserClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env.client";
import type { Database } from "@/types/supabase";

/**
 * Supabase client for Client Components. Create a fresh instance per call
 * site (cheap — it just wraps `fetch`), don't share a singleton across
 * requests.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
