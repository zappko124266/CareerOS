import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env.client";
import type { Database } from "@/types/supabase";

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers. Create a fresh instance per request — it closes over the
 * request's cookie jar.
 *
 * Writing cookies only works from a Server Action or Route Handler; calling
 * `setAll` from a Server Component is a no-op guarded by the try/catch below
 * (Proxy's session refresh covers that case instead).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — ignored, see docstring above.
          }
        },
      },
    },
  );
}
