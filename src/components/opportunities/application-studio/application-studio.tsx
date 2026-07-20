"use client";

import { useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { EMAIL_SUBTYPES, RECRUITER_MESSAGE_SUBTYPES } from "@/features/applications/types";
import type {
  ApplicationDocument,
  CompanySnapshot,
  Opportunity,
} from "@/generated/prisma/client";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";

import { ApplicationDocumentPanel } from "./application-document-panel";
import type { DocumentKindConfig } from "./application-document-panel";
import { ApplicationHistoryPanel } from "./application-history-panel";
import { ApplicationPackagePanel } from "./application-package-panel";
import { ApplicationReviewPanel } from "./application-review-panel";

type ReviewRow = ApplicationReviewOutput & { id: string; createdAt: Date };

const COVER_LETTER_CONFIG: DocumentKindConfig = {
  kind: "COVER_LETTER",
  label: "Cover Letter",
  description:
    "A full cover letter tuned to who it's for — hiring manager, recruiter, referral, or your experience level.",
  usesAudience: true,
  usesSubtype: false,
  usesLength: false,
};

const EMAIL_CONFIG: DocumentKindConfig = {
  kind: "EMAIL",
  label: "Email",
  description: "Application emails, follow-ups, interview scheduling, negotiation, and more.",
  usesAudience: false,
  usesSubtype: true,
  usesLength: true,
  subtypeOptions: EMAIL_SUBTYPES,
};

const RECRUITER_MESSAGE_CONFIG: DocumentKindConfig = {
  kind: "RECRUITER_MESSAGE",
  label: "Recruiter Message",
  description: "Short LinkedIn, networking, or referral messages.",
  usesAudience: false,
  usesSubtype: true,
  usesLength: true,
  subtypeOptions: RECRUITER_MESSAGE_SUBTYPES,
};

/**
 * The Application Studio — extends the existing Application Workspace
 * (`ApplicationWorkspace`) with the Package/Cover Letter/Email/Messages/
 * Review/History workspace the sprint asks for. Nested inside the parent
 * page's own top-level Tabs as one more tab, not a separate route, so it
 * shares the opportunity/resume-list data the parent page already fetched.
 */
export function ApplicationStudio({
  opportunity,
  resume,
  initialDocuments,
  companySnapshot,
  latestReview,
  reviews,
}: {
  opportunity: Opportunity;
  resume: { id: string; title: string } | null;
  initialDocuments: ApplicationDocument[];
  companySnapshot: CompanySnapshot | null;
  latestReview: ReviewRow | null;
  reviews: ReviewRow[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [tab, setTab] = useState("package");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex-wrap">
        <TabsTrigger value="package">Package</TabsTrigger>
        <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
        <TabsTrigger value="email">Email</TabsTrigger>
        <TabsTrigger value="recruiter-message">Messages</TabsTrigger>
        <TabsTrigger value="review">Review</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="package">
        <ApplicationPackagePanel
          opportunity={opportunity}
          resume={resume}
          documents={documents}
          companySnapshot={companySnapshot}
          latestReview={latestReview}
          onNavigateToTab={setTab}
        />
      </TabsContent>

      <TabsContent value="cover-letter">
        <ApplicationDocumentPanel
          opportunityId={opportunity.id}
          config={COVER_LETTER_CONFIG}
          documents={documents}
          onDocumentsChange={setDocuments}
        />
      </TabsContent>

      <TabsContent value="email">
        <ApplicationDocumentPanel
          opportunityId={opportunity.id}
          config={EMAIL_CONFIG}
          documents={documents}
          onDocumentsChange={setDocuments}
        />
      </TabsContent>

      <TabsContent value="recruiter-message">
        <ApplicationDocumentPanel
          opportunityId={opportunity.id}
          config={RECRUITER_MESSAGE_CONFIG}
          documents={documents}
          onDocumentsChange={setDocuments}
        />
      </TabsContent>

      <TabsContent value="review">
        <ApplicationReviewPanel opportunityId={opportunity.id} initialReview={latestReview} />
      </TabsContent>

      <TabsContent value="history">
        <ApplicationHistoryPanel
          opportunityId={opportunity.id}
          documents={documents}
          reviews={reviews}
          onDocumentsChange={setDocuments}
        />
      </TabsContent>
    </Tabs>
  );
}
