/**
 * Model IDs are Vercel AI Gateway strings (`provider/model`), verified
 * against `https://ai-gateway.vercel.sh/v1/models` — never trust a
 * remembered model ID, the catalog changes. Swapping providers is a string
 * change here, not new integration code.
 */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5";
