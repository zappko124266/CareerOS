import { z } from "zod";

import { METERED_FEATURES } from "./types";

export const SetEntitlementOverrideInputSchema = z.object({
  userId: z.uuid(),
  feature: z.enum(METERED_FEATURES),
  /** `null` (an explicit "Unlimited" choice) or a non-negative integer. */
  customLimit: z.number().int().min(0).nullable(),
  reason: z.string().trim().min(1).max(500),
});

export const RemoveEntitlementOverrideInputSchema = z.object({
  userId: z.uuid(),
  feature: z.enum(METERED_FEATURES),
});
