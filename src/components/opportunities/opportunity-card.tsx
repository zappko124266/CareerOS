"use client";

import { Bookmark, BookmarkCheck, Briefcase, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { PROVIDER_LABEL } from "@/features/opportunities/types";
import type { OpportunitySearchResult } from "@/features/opportunities/service";

function formatSalary(job: OpportunitySearchResult) {
  if (!job.salaryMin && !job.salaryMax) return null;
  const currency = job.salaryCurrency ?? "";
  if (job.salaryMin && job.salaryMax) {
    return `${currency}${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`;
  }
  return `${currency}${(job.salaryMin ?? job.salaryMax)!.toLocaleString()}+`;
}

export function OpportunityCard({
  job,
  saved,
  onSave,
  saving,
}: {
  job: OpportunitySearchResult;
  saved: boolean;
  onSave: () => void;
  saving: boolean;
}) {
  const salary = formatSalary(job);

  return (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="wrap-break-word text-base font-semibold">
              {job.title}
            </h2>
            <p className="text-muted-foreground wrap-break-word text-sm">
              {job.companyName}
            </p>
          </div>
          {job.matchScore !== null && (
            <ScoreRing
              score={job.matchScore}
              size="sm"
              label={`Match score for ${job.title}`}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {job.location && (
            <span className="text-muted-foreground flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="wrap-break-word">{job.location}</span>
            </span>
          )}
          {job.remote && <Badge variant="secondary">Remote</Badge>}
          {job.employmentType && (
            <span className="text-muted-foreground flex items-center gap-1">
              <Briefcase className="size-3.5 shrink-0" />
              {job.employmentType}
            </span>
          )}
        </div>

        {salary && <p className="text-sm font-medium">{salary}</p>}

        {job.matchReasons.length > 0 && (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {job.matchReasons[0]}
          </p>
        )}

        {job.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button asChild size="sm" className="flex-1">
            <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
              Apply
            </a>
          </Button>
          <Button
            size="icon"
            variant={saved ? "secondary" : "outline"}
            onClick={onSave}
            disabled={saved || saving}
            aria-label={saved ? "Already saved" : `Save ${job.title}`}
          >
            {saved ? (
              <BookmarkCheck className="size-4" />
            ) : (
              <Bookmark className="size-4" />
            )}
          </Button>
        </div>

        <p className="text-muted-foreground text-xs">
          Source: {PROVIDER_LABEL[job.source]}
        </p>
      </CardContent>
    </Card>
  );
}
