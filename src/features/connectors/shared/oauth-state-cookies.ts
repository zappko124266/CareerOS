import "server-only";
import { cookies } from "next/headers";

const COOKIE_MAX_AGE_SECONDS = 600;

function cookieNames(provider: string): { state: string; verifier: string } {
  const key = provider.toLowerCase();
  return { state: `${key}_oauth_state`, verifier: `${key}_oauth_verifier` };
}

/**
 * Short-lived, httpOnly, `sameSite: lax` cookies carrying the OAuth
 * `state` and PKCE `code_verifier` between a connector's authorize route
 * and its callback route — never sent to the provider, never readable by
 * client JS. This is CareerOS's CSRF/interception protection for every
 * OAuth2 connector: the callback route only proceeds if the `state` it
 * receives back from the provider matches what was stored here.
 *
 * Extracted from `connectors/google/oauth.ts`'s route handlers (Sprint
 * 14) — identical logic was about to be needed a second time for
 * Microsoft, which is exactly what "generalize before duplicating" means
 * for the Universal Job Connector Framework's route layer.
 */
export async function setOAuthStateCookies(provider: string, state: string, codeVerifier: string): Promise<void> {
  const names = cookieNames(provider);
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  };
  cookieStore.set(names.state, state, cookieOptions);
  cookieStore.set(names.verifier, codeVerifier, cookieOptions);
}

/** Reads and immediately clears both cookies — a callback should only
 * ever be able to consume a given `state`/`code_verifier` pair once. */
export async function consumeOAuthStateCookies(
  provider: string,
): Promise<{ state: string | undefined; codeVerifier: string | undefined }> {
  const names = cookieNames(provider);
  const cookieStore = await cookies();
  const state = cookieStore.get(names.state)?.value;
  const codeVerifier = cookieStore.get(names.verifier)?.value;
  cookieStore.delete(names.state);
  cookieStore.delete(names.verifier);
  return { state, codeVerifier };
}
