"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

import { getResumeKeywordAnalysisAction } from "@/actions/resume-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";

export function ResumeKeywordPanel({ resumeId }: { resumeId: string }) {
  const [jobDescription, setJobDescription] = useState("");
  const { run, isPending, isSlow, result, error } = useAsyncAction(
    getResumeKeywordAnalysisAction,
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold">Keyword Optimization</h2>
          <p className="text-muted-foreground text-sm">
            Compares your resume&apos;s language against a job description the
            way an ATS keyword filter or recruiter search would.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="keyword-job-description">Target job description</Label>
          <Textarea
            id="keyword-job-description"
            rows={6}
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
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
          onClick={() => run(resumeId, jobDescription)}
          disabled={isPending || !jobDescription.trim()}
          className="w-fit"
        >
          <Sparkles />
          {isPending ? "Analyzing…" : "Analyze keywords"}
        </Button>

        {result && (
          <div className="flex flex-col gap-4 border-t pt-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>Keyword coverage</span>
                <span className="text-muted-foreground">
                  {result.keywordDensityScore}/100
                </span>
              </div>
              <Progress
                value={result.keywordDensityScore}
                aria-label="Keyword coverage"
                aria-valuetext={`${result.keywordDensityScore} out of 100`}
              />
            </div>

            {result.matchedKeywords.length > 0 && (
              <div>
                <p className="text-sm font-medium">Matched keywords</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.matchedKeywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.missingKeywords.length > 0 && (
              <div>
                <p className="text-sm font-medium">Missing keywords</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {result.missingKeywords.map((keyword) => (
                    <Badge key={keyword} variant="outline">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium">Suggestions</p>
                <ul className="text-muted-foreground mt-1.5 flex flex-col gap-1 text-sm">
                  {result.suggestions.map((suggestion) => (
                    <li key={suggestion}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
