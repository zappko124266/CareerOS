import type { z } from "zod";

import type {
  ApplicationDocumentActionSchema,
  ApplicationDocumentAudienceSchema,
  ApplicationDocumentGenerationInputSchema,
  ApplicationDocumentGenerationOutputSchema,
  ApplicationDocumentKindSchema,
  ApplicationDocumentLengthSchema,
  ApplicationDocumentSubtypeSchema,
  ApplicationDocumentToneSchema,
} from "./schema";

export type ApplicationDocumentKind = z.infer<typeof ApplicationDocumentKindSchema>;
export type ApplicationDocumentSubtype = z.infer<typeof ApplicationDocumentSubtypeSchema>;
export type ApplicationDocumentAudience = z.infer<typeof ApplicationDocumentAudienceSchema>;
export type ApplicationDocumentTone = z.infer<typeof ApplicationDocumentToneSchema>;
export type ApplicationDocumentLength = z.infer<typeof ApplicationDocumentLengthSchema>;
export type ApplicationDocumentAction = z.infer<typeof ApplicationDocumentActionSchema>;
export type ApplicationDocumentGenerationInput = z.infer<
  typeof ApplicationDocumentGenerationInputSchema
>;
export type ApplicationDocumentGenerationOutput = z.infer<
  typeof ApplicationDocumentGenerationOutputSchema
>;
