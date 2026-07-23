import type { ApprovalPolicy } from "@/generated/prisma/client";
import type { RecommendationTier } from "@/features/opportunities/types";

export interface ApprovalDecisionInput {
  policy: ApprovalPolicy;
  tier: RecommendationTier | null;
  capabilityOk: boolean;
}

export interface ApprovalDecisionResult {
  requiresApproval: boolean;
  autoApproved: boolean;
  reason: string;
}

const HIGH_PRIORITY_TIERS: RecommendationTier[] = ["strong_match"];
const LOW_RISK_TIERS: RecommendationTier[] = ["strong_match", "good_match"];

/**
 * Human Approval — the four configurable policies
 * (`Profile.applicationApprovalPolicy`). Fully deterministic, no AI call:
 * `tier` reuses the same Opportunity Intelligence signal
 * (`intelligence.tier`) every other step in this pipeline already reads;
 * `capabilityOk` is the real Connector Capability Check result. Never
 * bypassed — `execution.ts` calls this exactly once per opportunity and
 * always honors `requiresApproval`.
 *
 * `NEVER_AUTO_APPLY` and `ALWAYS_ASK` produce the same outcome today
 * (both always require approval) but are kept as distinct branches so
 * the `reason` shown to the user names the setting they actually chose,
 * rather than collapsing two different intents into one message.
 */
export function evaluateApprovalPolicy(input: ApprovalDecisionInput): ApprovalDecisionResult {
  if (input.policy === "NEVER_AUTO_APPLY") {
    return {
      requiresApproval: true,
      autoApproved: false,
      reason: "Your approval policy is set to never auto-apply — every application needs your approval.",
    };
  }

  if (input.policy === "ALWAYS_ASK") {
    return {
      requiresApproval: true,
      autoApproved: false,
      reason: "Your approval policy is set to always ask before applying.",
    };
  }

  if (input.policy === "ASK_HIGH_PRIORITY") {
    const isHighPriority = input.tier !== null && HIGH_PRIORITY_TIERS.includes(input.tier);
    if (isHighPriority) {
      return {
        requiresApproval: true,
        autoApproved: false,
        reason: "This is a high-priority match — your policy asks for approval on these.",
      };
    }
    return { requiresApproval: false, autoApproved: true, reason: "Below your policy's high-priority threshold — auto-approved." };
  }

  // AUTO_APPLY_LOW_RISK
  const isLowRisk = input.capabilityOk && input.tier !== null && LOW_RISK_TIERS.includes(input.tier);
  if (isLowRisk) {
    return {
      requiresApproval: false,
      autoApproved: true,
      reason: "Good match with a fully capable, connected connector — auto-approved as low risk.",
    };
  }
  return {
    requiresApproval: true,
    autoApproved: false,
    reason: "Doesn't meet your policy's low-risk bar — approval required.",
  };
}
