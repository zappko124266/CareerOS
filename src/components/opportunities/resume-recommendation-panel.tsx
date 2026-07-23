import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import type { Resume, ResumeVersion } from "@/generated/prisma/client";

type VersionWithResume = ResumeVersion & { resume: Pick<Resume, "id" | "title"> };

/**
 * Sprint 12 (Job Studio), requirement 4 — surfaces Sprint 11's
 * `ResumeVersion.targetOpportunityId`/`targetCompanyName` fields, which
 * were write-only until now (only Resume Studio's tailoring picker wrote
 * them, nothing read them back). No new tailoring logic — this just
 * shows what already exists and links back to Resume Studio, pre-selecting
 * this opportunity, to create one when none exists yet.
 */
export function ResumeRecommendationPanel({
  companyName,
  versions,
  latestResumeId,
  opportunityId,
}: {
  companyName: string;
  versions: VersionWithResume[];
  latestResumeId: string | null;
  opportunityId: string;
}) {
  const tailorHref = latestResumeId
    ? `/resume/${latestResumeId}/studio?opportunityId=${opportunityId}`
    : "/resume";

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Resume version recommendation</h2>

        {versions.length > 0 ? (
          <>
            <p className="text-muted-foreground text-sm">
              You have {versions.length} resume version{versions.length === 1 ? "" : "s"} tailored
              for {companyName}.
            </p>
            <ul className="flex flex-col gap-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="ring-foreground/10 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ring-1"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{version.label}</p>
                      <Badge variant="outline">{version.resume.title}</Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeTime(new Date(version.createdAt))}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/resume/${version.resume.id}/studio`}>Open in Studio</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              No resume version tailored for {companyName} yet.
            </p>
            <Button asChild size="sm" className="w-fit">
              <Link href={tailorHref}>
                <Sparkles />
                Tailor a resume for this job
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
