import { Award, Briefcase, FileText, Link as LinkIcon, Mail, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DOCUMENT_KIND_LABEL } from "@/features/applications/types";
import type { ResumeData } from "@/features/resume/schema";
import type { ApplicationDocument } from "@/generated/prisma/client";

/**
 * Module 6 — Application Package: a read-only assembled view of
 * everything that would go into this application, built entirely from
 * real CareerOS data (resume sections, generated documents) — nothing
 * here is invented for the summary. Portfolio/LinkedIn come from whatever
 * links the user put in their own resume; CareerOS has no separate
 * verified LinkedIn integration (see `AccountConnection`).
 */
export function ApplicationPackagePanel({
  selectedResumeTitle,
  selectedResumeData,
  applicationDocuments,
}: {
  selectedResumeTitle: string | null;
  selectedResumeData: ResumeData | null;
  applicationDocuments: ApplicationDocument[];
}) {
  const latestByKind = (kind: ApplicationDocument["kind"]) =>
    applicationDocuments
      .filter((doc) => doc.kind === kind && doc.status === "DRAFT")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;

  const coverLetter = latestByKind("COVER_LETTER");
  const recruiterMessage = latestByKind("RECRUITER_MESSAGE");
  const email = latestByKind("EMAIL");

  const links = selectedResumeData?.contact.links ?? [];
  const certifications = selectedResumeData?.certifications ?? [];
  const projects = selectedResumeData?.projects ?? [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Application package</h2>
          <p className="text-muted-foreground text-sm">
            Everything assembled for this application, pulled from your real CareerOS data.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2.5">
            <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium">Resume</p>
              <p className="text-muted-foreground text-sm">
                {selectedResumeTitle ?? "No resume selected"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL.COVER_LETTER}</p>
              <p className="text-muted-foreground text-sm">
                {coverLetter ? coverLetter.title : "Not generated yet"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL.RECRUITER_MESSAGE}</p>
              <p className="text-muted-foreground text-sm">
                {recruiterMessage ? recruiterMessage.title : "Not generated yet"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Mail className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
            <div>
              <p className="text-sm font-medium">{DOCUMENT_KIND_LABEL.EMAIL}</p>
              <p className="text-muted-foreground text-sm">{email ? email.title : "Not generated yet"}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <LinkIcon className="text-muted-foreground size-4" aria-hidden />
            <p className="text-sm font-medium">Portfolio &amp; profile links</p>
          </div>
          {links.length === 0 ? (
            <EmptyState
              title="No links on file"
              description="Add a portfolio, GitHub, or LinkedIn link to your resume to include it here."
              className="py-4"
            />
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {links.map((link) => (
                <Badge key={link.url} variant="outline" asChild>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Award className="text-muted-foreground size-4" aria-hidden />
            <p className="text-sm font-medium">Certifications</p>
          </div>
          {certifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">None listed on the selected resume.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {certifications.map((cert) => (
                <li key={cert.name} className="text-sm">
                  {cert.name}
                  {cert.issuer ? ` — ${cert.issuer}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <Briefcase className="text-muted-foreground size-4" aria-hidden />
            <p className="text-sm font-medium">Projects</p>
          </div>
          {projects.length === 0 ? (
            <p className="text-muted-foreground text-sm">None listed on the selected resume.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {projects.map((project) => (
                <li key={project.name} className="text-sm">
                  {project.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
