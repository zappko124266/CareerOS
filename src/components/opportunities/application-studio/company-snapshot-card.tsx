"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateCompanySnapshotAction } from "@/actions/application-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import type { CompanySnapshot, Opportunity } from "@/generated/prisma/client";

function formatSalary(opportunity: Opportunity) {
  if (!opportunity.salaryMin && !opportunity.salaryMax) return null;
  const currency = opportunity.salaryCurrency ?? "";
  if (opportunity.salaryMin && opportunity.salaryMax) {
    return `${currency}${opportunity.salaryMin.toLocaleString()}–${opportunity.salaryMax.toLocaleString()}`;
  }
  return `${currency}${(opportunity.salaryMin ?? opportunity.salaryMax)!.toLocaleString()}+`;
}

/** Company Snapshot — verified listing data (rendered directly from
 * `Opportunity`, sourced from the job board provider) kept visually
 * separate from the cached AI summary, per the "never fabricate company
 * information" requirement. The AI section only ever reflects what the
 * job description text itself states — `caveats` makes what it does NOT
 * know explicit instead of letting a confident summary imply completeness. */
export function CompanySnapshotCard({
  opportunity,
  initialSnapshot,
}: {
  opportunity: Opportunity;
  initialSnapshot: CompanySnapshot | null;
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const generateAction = useAsyncAction(generateCompanySnapshotAction);
  const skills = Array.isArray(opportunity.skills)
    ? (opportunity.skills as unknown[]).filter((skill): skill is string => typeof skill === "string")
    : [];
  const salary = formatSalary(opportunity);

  async function handleGenerate() {
    const result = await generateAction.run(opportunity.id);

    if (result) {
      setSnapshot(result);
      toast.success("Company snapshot generated");
    } else if (generateAction.error) {
      toast.error(generateAction.error);
    }
  }

  const highlights = Array.isArray(snapshot?.aiHighlights)
    ? (snapshot.aiHighlights as unknown[]).filter((item): item is string => typeof item === "string")
    : [];
  const caveats = Array.isArray(snapshot?.aiCaveats)
    ? (snapshot.aiCaveats as unknown[]).filter((item): item is string => typeof item === "string")
    : [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Company Snapshot</h2>
            <Badge variant="outline">Verified listing data</Badge>
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex gap-1">
              <dt className="text-muted-foreground">Company:</dt>
              <dd className="min-w-0 truncate">{opportunity.companyName}</dd>
            </div>
            <div className="flex gap-1">
              <dt className="text-muted-foreground">Location:</dt>
              <dd>{opportunity.location ?? "Not stated"}</dd>
            </div>
            {opportunity.employmentType && (
              <div className="flex gap-1">
                <dt className="text-muted-foreground">Employment type:</dt>
                <dd>{opportunity.employmentType}</dd>
              </div>
            )}
            {salary && (
              <div className="flex gap-1">
                <dt className="text-muted-foreground">Salary:</dt>
                <dd>{salary}</dd>
              </div>
            )}
          </dl>
          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline">AI-generated summary</Badge>
            <Button size="sm" variant="outline" disabled={generateAction.isPending} onClick={handleGenerate}>
              <Sparkles className="size-3.5" />
              {generateAction.isPending ? "Generating…" : snapshot ? "Regenerate" : "Generate summary"}
            </Button>
          </div>
          {generateAction.isPending && generateAction.isSlow && (
            <p className="text-muted-foreground mt-2 text-sm">
              Still working — this can take up to a minute or two.
            </p>
          )}

          {snapshot ? (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm">{snapshot.aiSummary}</p>
              {highlights.length > 0 && (
                <div>
                  <p className="text-sm font-medium">What the listing tells us</p>
                  <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
                    {highlights.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {caveats.length > 0 && (
                <div>
                  <p className="text-sm font-medium">What isn&apos;t stated in this listing</p>
                  <ul className="text-muted-foreground mt-1 flex flex-col gap-1 text-sm">
                    {caveats.map((item, index) => (
                      <li key={index}>• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-muted-foreground text-xs">
                Generated {formatRelativeTime(new Date(snapshot.updatedAt))} from this listing&apos;s
                own text — not general knowledge about {opportunity.companyName}.
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">
              Not generated yet — this will summarize what the job listing itself says about the
              role and company.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
