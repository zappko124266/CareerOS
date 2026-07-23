import Link from "next/link";
import { FileText, IdCard, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DOCUMENT_KIND_LABEL } from "@/features/applications/types";
import { formatRelativeTime } from "@/lib/utils";
import type { ApplicationDocument, LinkedInProfile, LinkedInProfileVersion, Resume } from "@/generated/prisma/client";

type ApplicationDocumentWithOpportunity = ApplicationDocument & {
  opportunity: { id: string; title: string; companyName: string };
};

/**
 * Sprint 13 (Career Identity), requirement 3 — a pure index across three
 * already-existing document types (resumes, LinkedIn profile + versions,
 * application documents). No editing happens here; every row deep-links
 * to its real home (Resume Studio, `/linkedin`, the opportunity's
 * Documents tab) so nothing is duplicated.
 */
export function DocumentVaultPanel({
  resumes,
  linkedInProfile,
  linkedInVersions,
  applicationDocuments,
}: {
  resumes: Resume[];
  linkedInProfile: LinkedInProfile | null;
  linkedInVersions: LinkedInProfileVersion[];
  applicationDocuments: ApplicationDocumentWithOpportunity[];
}) {
  const hasAnything =
    resumes.length > 0 || linkedInProfile !== null || applicationDocuments.length > 0;

  if (!hasAnything) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload a resume, add your LinkedIn profile, or generate an application document to see them here."
        className="py-12"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="text-muted-foreground size-4" />
            Resumes
          </h2>
          {resumes.length === 0 ? (
            <p className="text-muted-foreground text-sm">No resumes uploaded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {resumes.map((resume) => (
                <li key={resume.id}>
                  <Link
                    href={`/resume/${resume.id}`}
                    className="ring-foreground/10 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ring-1 hover:bg-accent/50"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{resume.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeTime(new Date(resume.updatedAt))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <IdCard className="text-muted-foreground size-4" />
            LinkedIn profile
          </h2>
          {!linkedInProfile ? (
            <p className="text-muted-foreground text-sm">
              No LinkedIn profile added yet — add one from{" "}
              <Link href="/linkedin" className="underline">
                /linkedin
              </Link>
              .
            </p>
          ) : (
            <>
              <Link
                href="/linkedin"
                className="ring-foreground/10 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ring-1 hover:bg-accent/50"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {linkedInProfile.headline ?? "LinkedIn profile"}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatRelativeTime(new Date(linkedInProfile.updatedAt))}
                </span>
              </Link>
              {linkedInVersions.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {linkedInVersions.length} saved version{linkedInVersions.length === 1 ? "" : "s"}
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Mail className="text-muted-foreground size-4" />
            Application documents
          </h2>
          {applicationDocuments.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No cover letters, recruiter messages, or emails generated yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {applicationDocuments.map((document) => (
                <li key={document.id}>
                  <Link
                    href={`/opportunities/${document.opportunity.id}`}
                    className="ring-foreground/10 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ring-1 hover:bg-accent/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 truncate text-sm font-medium">{document.title}</span>
                        <Badge variant="outline">{DOCUMENT_KIND_LABEL[document.kind]}</Badge>
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {document.opportunity.title} · {document.opportunity.companyName}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeTime(new Date(document.updatedAt))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
