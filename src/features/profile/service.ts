import "server-only";

import { ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toUserDTO } from "@/lib/auth/dto";
import type { UserDTO } from "@/lib/auth/dto";

const MAX_FULL_NAME_LENGTH = 120;

/**
 * Sprint 13 (Career Identity) — the one write path this sprint adds:
 * until now nothing in the app let a user edit their own `Profile.fullName`.
 * `email` stays out of scope (owned by Supabase Auth, not this table) and
 * `avatarUrl` stays read-only (editing it would need file-upload plumbing
 * this sprint doesn't need to add).
 */
export async function updateProfile(userId: string, fullName: string): Promise<UserDTO> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    throw new ValidationError("Name can't be empty.");
  }
  if (trimmed.length > MAX_FULL_NAME_LENGTH) {
    throw new ValidationError(`Name must be ${MAX_FULL_NAME_LENGTH} characters or fewer.`);
  }

  const profile = await prisma.profile.update({
    where: { id: userId },
    data: { fullName: trimmed },
  });

  return toUserDTO(profile);
}
