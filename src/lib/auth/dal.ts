import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/generated/prisma";
import type { UserDTO } from "@/lib/auth/dto";
import { toUserDTO } from "@/lib/auth/dto";

/**
 * Data Access Layer for authentication/authorization.
 *
 * Proxy (`src/proxy.ts`) only does an optimistic, cookie-presence redirect —
 * it must not be trusted as the source of truth. Every Server Component,
 * Server Action, and Route Handler that touches protected data calls one of
 * these functions itself, close to the data access, instead of assuming an
 * outer layout already checked. `cache()` de-dupes repeat calls within a
 * single render pass, so calling it defensively in nested components is
 * cheap.
 */
export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    return null;
  }

  return toUserDTO(profile);
});

/** Redirects to /login if there's no session. Use in protected layouts/pages. */
export async function verifySession(): Promise<UserDTO> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/** Redirects to /dashboard if the session's role isn't in `allowedRoles`. */
export async function verifyRole(allowedRoles: Role[]): Promise<UserDTO> {
  const user = await verifySession();

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}
