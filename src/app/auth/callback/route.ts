import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Exchanges the one-time `code` Supabase appends to email confirmation,
 * magic-link, and OAuth redirects for a session, then forwards the user on.
 * Wire this up as the redirect URL in the Supabase Auth dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  const errorUrl = new URL("/login", origin);
  errorUrl.searchParams.set(
    "error",
    "Could not verify your sign-in link. Please try again.",
  );
  return NextResponse.redirect(errorUrl);
}
