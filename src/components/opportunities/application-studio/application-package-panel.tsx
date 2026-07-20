"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DOCUMENT_KIND_LABEL } from "@/features/applications/types";
import type { ApplicationDocumentKind } from "@/features/applications/types";
import type {
  ApplicationDocument,
  CompanySnapshot,
  Opportunity,
} from "@/generated/prisma/client";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";

import { CompanySnapshotCard } from "./company-snapshot-card";
import { ReadinessBreakdown } from "./readiness-breakdown";

const DOCUMENT_KINDS: ApplicationDocumentKind[] = ["COVER_LETTER", "EMAIL", "RECRUITER_MESSAGE"];

/**
 * "Everything together" — the Application Package screen. Aggregates
 * what already exists elsewhere (resume link, generated documents, company
 * snapshot, readiness) into one view rather than re-implementing any of
 * it; every section here links out to the tab that actually owns that
 * data and its editing UI.
 */
export function ApplicationPackagePanel({
  opportunity,
  resume,
  documents,
  companySnapshot,
  latestReview,
  onNavigateToTab,
}: {
  opportunity: Opportunity;
  resume: { id: string; title: string } | null;
  documents: ApplicationDocument[];
  companySnapshot: CompanySnapshot | null;
  latestReview: (ApplicationReviewOutput & { id: string; createdAt: Date }) | null;
  onNavigateToTab: (tab: string) => void;
}) {
  const latestByKind = new Map<ApplicationDocumentKind, ApplicationDocument>();
  for (const document of documents) {
    if (document.status === "ARCHIVED") continue;
    const existing = latestByKind.get(document.kind);
    if (!existing || document.updatedAt > existing.updatedAt) {
      latestByKind.set(document.kind, document);
    }
  }

  const requiredChecklist = [
    { label: "Resume selected", done: Boolean(resume) },
    { label: "Cover letter drafted", done: latestByKind.has("COVER_LETTER") },
    { label: "Email drafted", done: latestByKind.has("EMAIL") },
  ];
  const optionalChecklist = [
    { label: "Recruiter message drafted", done: latestByKind.has("RECRUITER_MESSAGE") },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Resume for this application</h2>
          {resume ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">{resume.title}</p>
              <Link href={`/resume/${resume.id}/studio`} className="text-sm underline underline-offset-4">
                Open in Resume Studio
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No resume selected yet — pick one in the Documents tab before generating AI
              documents.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Required documents</h2>
          <ul className="flex flex-col gap-1.5">
            {requiredChecklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <Check className="text-primary size-4 shrink-0" />
                ) : (
                  <X className="text-muted-foreground size-4 shrink-0" />
                )}
                {item.label}
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">Optional</p>
          <ul className="flex flex-col gap-1.5">
            {optionalChecklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-sm">
                {item.done ? (
                  <Check className="text-primary size-4 shrink-0" />
                ) : (
                  <X className="text-muted-foreground size-4 shrink-0" />
                )}
                {item.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Your documents</h2>
          {DOCUMENT_KINDS.map((kind) => {
            const document = latestByKind.get(kind);
            return (
              <div key={kind} className="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL[kind]}</p>
                  <button
                    type="button"
                    onClick={() => onNavigateToTab(kind.toLowerCase().replace("_", "-"))}
                    className="text-sm underline underline-offset-4"
                  >
                    {document ? "Open" : "Generate"}
                  </button>
                </div>
                {document ? (
                  <p className="text-muted-foreground line-clamp-2 text-sm">{document.content}</p>
                ) : (
                  <p className="text-muted-foreground text-sm">Not drafted yet.</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <CompanySnapshotCard opportunity={opportunity} initialSnapshot={companySnapshot} />

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Application Readiness</h2>
            <Badge variant="outline">AI estimate</Badge>
          </div>
          {latestReview ? (
            <ReadinessBreakdown
              overallReadiness={latestReview.overallReadiness}
              factors={latestReview.factors}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No review yet —{" "}
              <button
                type="button"
                onClick={() => onNavigateToTab("review")}
                className="underline underline-offset-4"
              >
                run one in the Review tab
              </button>{" "}
              to see a transparent readiness breakdown.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
