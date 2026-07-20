"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateCompanyResearchAction } from "@/actions/companies";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsyncAction } from "@/hooks/use-async-action";
import { SUBMISSION_METHOD_LABEL } from "@/features/applications/types";
import type { CompanyAggregates } from "@/features/companies/types";
import type { Company } from "@/generated/prisma/client";

export function CompanyIntelligencePanel({
  company: initialCompany,
  aggregates,
}: {
  company: Company;
  aggregates: CompanyAggregates;
}) {
  const [company, setCompany] = useState(initialCompany);
  const researchAction = useAsyncAction(generateCompanyResearchAction);

  const highlights = (company.aiHighlights as unknown as string[]) ?? [];
  const caveats = (company.aiCaveats as unknown as string[]) ?? [];

  async function handleResearch() {
    const result = await researchAction.run(company.id);
    if (result) {
      setCompany(result);
      toast.success("Company research generated");
    } else if (researchAction.error) {
      toast.error(researchAction.error);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/opportunities">
          <ArrowLeft />
          Back to Opportunities
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {company.industry && <Badge variant="outline">{company.industry}</Badge>}
          {company.businessCategory && <Badge variant="outline">{company.businessCategory}</Badge>}
          {company.sizeEstimate && <Badge variant="secondary">{company.sizeEstimate}</Badge>}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Company research</h2>
            <Button onClick={handleResearch} disabled={researchAction.isPending} size="sm" variant="outline">
              <Sparkles />
              {researchAction.isPending ? "Researching…" : company.aiSummary ? "Regenerate" : "Generate research"}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm">
            Grounded only in real job descriptions CareerOS has seen for this company — never
            general knowledge presented as fact.
          </p>
          {researchAction.error && <p className="text-destructive text-sm">{researchAction.error}</p>}

          {company.aiSummary ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">{company.aiSummary}</p>
              {highlights.length > 0 && (
                <div>
                  <p className="text-sm font-medium">Highlights</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {highlights.map((highlight) => (
                      <Badge key={highlight} variant="secondary">
                        {highlight}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {caveats.length > 0 && (
                <div>
                  <p className="text-sm font-medium">What we don&apos;t know</p>
                  <ul className="text-muted-foreground mt-1.5 list-disc pl-5 text-sm">
                    {caveats.map((caveat) => (
                      <li key={caveat}>{caveat}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No research generated yet — click above to summarize this company from the job
              listings CareerOS has on file for it.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Hiring signal</h2>
            <p className="text-muted-foreground text-sm">
              Every number here is real, computed from listings CareerOS has actually stored for
              this company across every user — never a synthetic trend.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl font-semibold">{aggregates.totalOpportunities}</p>
                <p className="text-muted-foreground text-sm">Listings on file</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{aggregates.hiringFrequencyLast90Days}</p>
                <p className="text-muted-foreground text-sm">New in last 90 days</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{aggregates.remoteCount}</p>
                <p className="text-muted-foreground text-sm">Remote listings</p>
              </div>
              <div>
                <p className="text-xl font-semibold">{aggregates.onsiteCount}</p>
                <p className="text-muted-foreground text-sm">On-site listings</p>
              </div>
            </div>
            {aggregates.locations.length > 0 && (
              <div>
                <p className="text-sm font-medium">Locations seen</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {aggregates.locations.map((location) => (
                    <Badge key={location} variant="outline">
                      {location}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Salary &amp; interview signal</h2>
            <p className="text-muted-foreground text-sm">
              From real listing data and self-reported interview ratings — never fabricated.
            </p>
            <div>
              <p className="text-sm font-medium">Salary range (from listings)</p>
              <p className="text-muted-foreground text-sm">
                {aggregates.salaryRangeMin !== null && aggregates.salaryRangeMax !== null
                  ? `${aggregates.salaryCurrency ?? ""}${aggregates.salaryRangeMin.toLocaleString()}–${aggregates.salaryRangeMax.toLocaleString()}`
                  : "No salary data stated in listings on file."}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Interview difficulty</p>
              <p className="text-muted-foreground text-sm">
                {aggregates.averageInterviewDifficulty !== null
                  ? `${aggregates.averageInterviewDifficulty}/5 average, from ${aggregates.interviewDifficultySampleSize} self-reported rating(s)`
                  : "No interview difficulty ratings yet."}
              </p>
            </div>
            {Object.keys(aggregates.applicationMethodCounts).length > 0 && (
              <div>
                <p className="text-sm font-medium">How people applied</p>
                <ul className="text-muted-foreground mt-1.5 text-sm">
                  {Object.entries(aggregates.applicationMethodCounts).map(([method, count]) => (
                    <li key={method}>
                      {SUBMISSION_METHOD_LABEL[method] ?? method}: {count}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
