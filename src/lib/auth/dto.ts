import "server-only";
import type { Profile } from "@/generated/prisma/client";

/**
 * Shape of a user as returned to the rest of the app. Keeping this as an
 * explicit Data Transfer Object — rather than passing Prisma's `Profile`
 * around directly — means adding an internal-only column later can't
 * accidentally leak to a Client Component just because it got spread into
 * props.
 */
export type UserDTO = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Profile["role"];
};

export function toUserDTO(profile: Profile): UserDTO {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
  };
}
