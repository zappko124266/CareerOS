import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CareerInboxCard } from "@/components/dashboard/career-inbox-card";
import { DocumentVaultPanel } from "@/components/profile/document-vault-panel";
import { IdentityOverviewPanel } from "@/components/profile/identity-overview-panel";
import { ProfileAssistantPanel } from "@/components/profile/profile-assistant-panel";
import { getCareerBrain } from "@/features/career-brain/brain";
import { buildCareerInboxEvents } from "@/features/career-agent/inbox";
import { getGmailIntelligenceReport } from "@/features/gmail-intelligence/orchestrator";
import { getLinkedInProfile, listLinkedInProfileVersions } from "@/features/linkedin-profile/queries";
import { computeCareerIdentityCompleteness } from "@/features/profile/completeness";
import { listAllApplicationDocumentsForUser } from "@/features/applications/queries";
import { listResumesForUser } from "@/features/resume/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Career Identity" };

const TIMELINE_LIMIT = 100;

/**
 * Sprint 13 (Career Identity & Universal Profile) — the single hub for
 * everything already unified by `getCareerBrain` (Sprint 4) but never
 * surfaced in one place. One new query root beyond what `getCareerBrain`
 * already fetches (`listAllApplicationDocumentsForUser`); everything else
 * — `CareerBrain.profile`, `careerMemory`'s source arrays, LinkedIn/
 * resume/connector reads — is either already on `brain` or an existing
 * single-purpose query reused as-is.
 */
export default async function CareerIdentityPage() {
  const user = await verifySession();

  const [brain, linkedInProfile, linkedInVersions, resumes, applicationDocuments] = await Promise.all([
    getCareerBrain(user),
    getLinkedInProfile(user.id),
    listLinkedInProfileVersions(user.id),
    listResumesForUser(user.id),
    listAllApplicationDocumentsForUser(user.id),
  ]);

  const completeness = await computeCareerIdentityCompleteness(brain);

  const googleConnection =
    brain.raw.connectionSummaries.find(
      (summary) => summary.provider === "GOOGLE" && summary.status === "CONNECTED",
    ) ?? null;

  // Re-fetched (not reused from `brain.careerMemory`) because this tab
  // wants a much higher limit (100 vs the dashboard widget's 15) — same
  // pre-existing pattern this page already used for every other source
  // before Gmail Intelligence existed. Reuses `brain.raw.connectionSummaries`
  // rather than a second Connection Manager call.
  const gmailReport = await getGmailIntelligenceReport(user.id, brain.raw.connectionSummaries);

  const timelineEvents = buildCareerInboxEvents({
    recentActivity: brain.raw.recentActivity,
    opportunities: brain.raw.opportunities,
    interviewEvents: brain.raw.interviewEvents,
    automationExecutions: brain.raw.automationExecutions,
    gmailEvents: gmailReport.careerEvents,
    limit: TIMELINE_LIMIT,
  });

  const biggestGap = completeness.items.find((item) => !item.completed)?.label ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/settings">
          <ArrowLeft />
          Back to Settings
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Career Identity</h1>
        <p className="text-muted-foreground text-sm">
          The single view of who you are across CareerOS — your profile, documents, history, and
          an assistant that already knows all of it.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="vault">Vault</TabsTrigger>
          <TabsTrigger value="assistant">Ask Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <IdentityOverviewPanel
            user={user}
            profile={brain.profile}
            completeness={completeness}
            googleConnection={googleConnection}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <CareerInboxCard events={timelineEvents} title="Career Timeline" />
        </TabsContent>

        <TabsContent value="vault">
          <DocumentVaultPanel
            resumes={resumes}
            linkedInProfile={linkedInProfile}
            linkedInVersions={linkedInVersions}
            applicationDocuments={applicationDocuments}
          />
        </TabsContent>

        <TabsContent value="assistant">
          <ProfileAssistantPanel
            name={user.fullName ?? ""}
            profile={brain.profile}
            biggestGap={biggestGap}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
