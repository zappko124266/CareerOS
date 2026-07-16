import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { clientEnv } from "@/lib/env.client";

/**
 * Refreshes the Supabase auth session and reads the current user, for use
 * from `src/proxy.ts`. This is the *optimistic* check — it's fast and runs
 * on every matched request, but it must not be treated as the source of
 * truth for authorization. Verify again in a Data Access Layer function
 * (`src/lib/auth/dal.ts`) before returning or mutating any protected data.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not add logic between `createServerClient` and `auth.getUser()` — it
  // revalidates the session token on every call, and anything in between can
  // silently skip that check.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
