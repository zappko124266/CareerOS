"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";

import { tailorResumeStudioAction } from "@/actions/resume-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { ResumeData } from "@/features/resume/schema";
import type { Opportunity } from "@/generated/prisma/client";

const BULLET_ID_SEPARATOR = ":";
const NONE_VALUE = "__none__";

function flattenBullets(data: ResumeData) {
  return data.experience.flatMap((entry, experienceIndex) =>
    entry.bullets.map((text, bulletIndex) => ({
      id: `${experienceIndex}${BULLET_ID_SEPARATOR}${bulletIndex}`,
      text,
      roleLabel: `${entry.title} · ${entry.company}`,
    })),
  );
}

export function ResumeTailoringPanel({
  resumeId,
  data,
  savedOpportunities,
  initialOpportunityId,
  onApplyBullet,
  onSaveVersion,
}: {
  resumeId: string;
  data: ResumeData;
  /** Sprint 11, requirement 4 — reused from `CareerBrain.raw.opportunities`
   * (already fetched by the Studio page), never a new query. */
  savedOpportunities: Pick<Opportunity, "id" | "title" | "companyName" | "description">[];
  /** Sprint 12 (Job Studio) — pre-selects this opportunity when arriving
   * via the "Tailor a resume for this job" deep link. */
  initialOpportunityId: string | null;
  onApplyBullet: (experienceIndex: number, bulletIndex: number, text: string) => void;
  onSaveVersion: (label: string, target?: { opportunityId: string; companyName: string }) => Promise<boolean>;
}) {
  const [jobDescription, setJobDescription] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(NONE_VALUE);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [savingVersion, setSavingVersion] = useState(false);
  const { run, isPending, isSlow, result, error, reset } = useAsyncAction(
    tailorResumeStudioAction,
  );

  const bulletsById = new Map(flattenBullets(data).map((bullet) => [bullet.id, bullet]));
  const selectedOpportunity = savedOpportunities.find((o) => o.id === selectedOpportunityId) ?? null;

  useEffect(() => {
    if (initialOpportunityId) {
      handleSelectOpportunity(initialOpportunityId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOpportunityId]);

  function handleSelectOpportunity(opportunityId: string) {
    setSelectedOpportunityId(opportunityId);
    const opportunity = savedOpportunities.find((o) => o.id === opportunityId);
    if (opportunity?.description) {
      setJobDescription(opportunity.description);
    }
  }

  function handleTailor() {
    const bullets = flattenBullets(data).map(({ id, text }) => ({ id, text }));
    run(resumeId, jobDescription, bullets);
  }

  function handleApply(bulletId: string, tailoredText: string) {
    const [experienceIndex, bulletIndex] = bulletId
      .split(BULLET_ID_SEPARATOR)
      .map(Number);
    onApplyBullet(experienceIndex, bulletIndex, tailoredText);
    setAppliedIds((prev) => new Set(prev).add(bulletId));
  }

  async function handleSaveVersion() {
    setSavingVersion(true);
    const label = selectedOpportunity
      ? `Tailored for ${selectedOpportunity.companyName}`
      : `AI-optimized ${new Date().toLocaleDateString()}`;
    const target = selectedOpportunity
      ? { opportunityId: selectedOpportunity.id, companyName: selectedOpportunity.companyName }
      : undefined;
    await onSaveVersion(label, target);
    setSavingVersion(false);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">AI Resume Tailoring</h2>
          <p className="text-muted-foreground text-sm">
            Paste a job description — CareerOS suggests rewrites for your
            existing bullets and summary, tuned to that role. Nothing
            changes until you apply a suggestion.
          </p>
        </div>

        {savedOpportunities.length > 0 && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="tailoring-opportunity">Tailor for a saved opportunity</Label>
            <Select value={selectedOpportunityId} onValueChange={handleSelectOpportunity}>
              <SelectTrigger id="tailoring-opportunity" className="w-full">
                <SelectValue placeholder="Choose one, or paste a job description below" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None — paste manually</SelectItem>
                {savedOpportunities.map((opportunity) => (
                  <SelectItem key={opportunity.id} value={opportunity.id}>
                    {opportunity.title} · {opportunity.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="tailoring-job-description">Target job description</Label>
          <Textarea
            id="tailoring-job-description"
            rows={6}
            value={jobDescription}
            onChange={(event) => {
              setJobDescription(event.target.value);
              setSelectedOpportunityId(NONE_VALUE);
            }}
            placeholder="Paste the job posting here…"
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
        {isPending && isSlow && (
          <p className="text-muted-foreground text-sm">
            Still working — this can take up to a minute or two.
          </p>
        )}

        <Button
          onClick={handleTailor}
          disabled={isPending || !jobDescription.trim() || bulletsById.size === 0}
          className="w-fit"
        >
          <Sparkles />
          {isPending ? "Tailoring…" : "Tailor my resume"}
        </Button>

        {bulletsById.size === 0 && (
          <p className="text-muted-foreground text-sm">
            Add at least one experience bullet in the Editor tab first.
          </p>
        )}

        {result && (
          <div className="flex flex-col gap-4 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Suggested summary</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {result.tailoredSummary}
              </p>
            </div>

            {result.keywordsToEmphasize.length > 0 && (
              <div>
                <p className="text-sm font-medium">Keywords to emphasize</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.keywordsToEmphasize.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.bulletSuggestions.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">Bullet suggestions</p>
                {result.bulletSuggestions.map((suggestion) => {
                  const original = bulletsById.get(suggestion.bulletId);
                  if (!original) return null;
                  const applied = appliedIds.has(suggestion.bulletId);

                  return (
                    <div
                      key={suggestion.bulletId}
                      className="ring-foreground/10 rounded-lg p-3 ring-1"
                    >
                      <p className="text-muted-foreground text-xs">
                        {original.roleLabel}
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm line-through">
                        {original.text}
                      </p>
                      <p className="mt-1 text-sm">{suggestion.tailoredText}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {suggestion.reason}
                      </p>
                      <Button
                        size="sm"
                        variant={applied ? "secondary" : "outline"}
                        className="mt-2"
                        disabled={applied}
                        onClick={() => handleApply(suggestion.bulletId, suggestion.tailoredText)}
                      >
                        {applied ? (
                          <>
                            <Check /> Applied
                          </>
                        ) : (
                          "Apply to resume"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" className="w-fit" onClick={reset}>
                Tailor for a different job
              </Button>
              {appliedIds.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  disabled={savingVersion}
                  onClick={handleSaveVersion}
                >
                  {savingVersion ? "Saving…" : "Save as new resume version"}
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
