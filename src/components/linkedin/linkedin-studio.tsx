"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  analyzeLinkedInProfileAction,
  updateLinkedInProfileAction,
} from "@/actions/linkedin-profile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScoreRing } from "@/components/dashboard/score-ring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncAction } from "@/hooks/use-async-action";
import type { LinkedInAnalysisOutput } from "@/features/linkedin-profile/format";
import type { LinkedInProfile, LinkedInProfileVersion } from "@/generated/prisma/client";

import { LinkedInVersionPanel } from "./linkedin-version-panel";

export function LinkedInStudio({
  profile: initialProfile,
  versions,
  latestAnalysis,
}: {
  profile: LinkedInProfile | null;
  versions: LinkedInProfileVersion[];
  latestAnalysis: LinkedInAnalysisOutput | null;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [profileText, setProfileText] = useState(initialProfile?.profileText ?? "");
  const [headline, setHeadline] = useState(initialProfile?.headline ?? "");
  const [targetRole, setTargetRole] = useState(initialProfile?.targetRole ?? "");
  const [saving, setSaving] = useState(false);

  const saveAction = useAsyncAction(updateLinkedInProfileAction);
  const analysisAction = useAsyncAction(analyzeLinkedInProfileAction);
  const analysis = analysisAction.result ?? latestAnalysis;

  async function handleSave() {
    setSaving(true);
    const result = await saveAction.run({
      profileText,
      headline: headline.trim() || null,
      targetRole: targetRole.trim() || null,
    });
    setSaving(false);

    if (result) {
      setProfile(result);
      toast.success("LinkedIn profile saved");
    } else if (saveAction.error) {
      toast.error(saveAction.error);
    }
  }

  async function handleAnalyze() {
    if (!profile) {
      toast.error("Save your profile before running an analysis.");
      return;
    }
    await analysisAction.run(profile.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LinkedIn Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          CareerOS doesn&apos;t connect to LinkedIn (no public per-profile API exists) — paste
          your profile text below. It&apos;s saved so you can version it and see your SEO score
          over time.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="analysis">SEO Analysis</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="linkedin-headline">Headline</Label>
                <Input
                  id="linkedin-headline"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  placeholder="e.g. Senior Backend Engineer | Distributed Systems | Kubernetes"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="linkedin-target-role">Target role</Label>
                <Input
                  id="linkedin-target-role"
                  value={targetRole}
                  onChange={(event) => setTargetRole(event.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="linkedin-profile-text">Profile text</Label>
                <p className="text-muted-foreground text-xs">
                  Paste your About section, Experience entries, Skills, Certifications, Featured,
                  and Projects — as much as you have. More sections in means more of the analysis
                  below can actually run.
                </p>
                <Textarea
                  id="linkedin-profile-text"
                  rows={14}
                  value={profileText}
                  onChange={(event) => setProfileText(event.target.value)}
                  placeholder="Paste your LinkedIn profile text here…"
                />
              </div>
              <Button onClick={handleSave} disabled={saving || !profileText.trim()} className="w-fit">
                {saving ? "Saving…" : "Save profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-semibold">LinkedIn SEO Intelligence</h2>
                <p className="text-muted-foreground text-sm">
                  Real, explainable scoring — never a claim to know LinkedIn&apos;s actual search
                  ranking algorithm, just keyword coverage and structure in the text you gave us.
                </p>
              </div>

              {!analysis ? (
                <div className="flex flex-col items-start gap-2">
                  <Button onClick={handleAnalyze} disabled={analysisAction.isPending || !profile} size="sm">
                    <Sparkles />
                    {analysisAction.isPending ? "Analyzing…" : "Run LinkedIn analysis"}
                  </Button>
                  {!profile && (
                    <p className="text-muted-foreground text-sm">Save your profile text first.</p>
                  )}
                  {analysisAction.error && <p className="text-destructive text-sm">{analysisAction.error}</p>}
                  {analysisAction.isPending && analysisAction.isSlow && (
                    <p className="text-muted-foreground text-sm">
                      Still working — this can take a few minutes.
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-wrap items-center gap-6">
                    {analysis.seoScore !== null ? (
                      <ScoreRing score={analysis.seoScore} label="SEO Score" />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        SEO Score: not available — that check failed, try re-running.
                      </p>
                    )}
                    {analysis.recruiterVisibilityScore !== null ? (
                      <ScoreRing
                        score={analysis.recruiterVisibilityScore}
                        label="Recruiter Visibility Score"
                      />
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        Recruiter Visibility Score: not available — that check failed, try
                        re-running.
                      </p>
                    )}
                  </div>

                  {analysis.missingKeywords.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Missing keywords</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {analysis.missingKeywords.map((keyword) => (
                          <Badge key={keyword} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.missingSections.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Missing sections</p>
                      <p className="text-muted-foreground text-xs">
                        Based on whether these section names appear anywhere in your pasted text —
                        a heuristic, not a live read of your actual profile.
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {analysis.missingSections.map((section) => (
                          <Badge key={section} variant="destructive">
                            {section}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.headlineSuggestions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Headline suggestions</p>
                      <ul className="text-muted-foreground mt-1.5 flex flex-col gap-1.5 text-sm">
                        {analysis.headlineSuggestions.map((suggestion) => (
                          <li key={suggestion} className="ring-foreground/10 rounded-lg p-2 ring-1">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium">About suggestions</p>
                    {analysis.aboutSuggestions ? (
                      <>
                        <p className="text-muted-foreground mt-1.5 whitespace-pre-line text-sm">
                          {analysis.aboutSuggestions.optimizedAbout}
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs">
                          {analysis.aboutSuggestions.rationale}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground mt-1.5 text-sm">
                        Not available — that check failed, try re-running.
                      </p>
                    )}
                  </div>

                  {analysis.experienceImprovements.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Experience improvements</p>
                      <ul className="mt-1.5 flex flex-col gap-2">
                        {analysis.experienceImprovements.map((improvement) => (
                          <li key={improvement.original} className="ring-foreground/10 rounded-lg p-3 ring-1">
                            <p className="text-muted-foreground text-xs line-through">{improvement.original}</p>
                            <p className="mt-1 text-sm">{improvement.suggestion}</p>
                            <p className="text-muted-foreground mt-1 text-xs">{improvement.reason}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    onClick={handleAnalyze}
                    disabled={analysisAction.isPending}
                    size="sm"
                    variant="outline"
                    className="w-fit"
                  >
                    <Sparkles />
                    {analysisAction.isPending ? "Re-analyzing…" : "Re-run analysis"}
                  </Button>
                  {analysisAction.error && <p className="text-destructive text-sm">{analysisAction.error}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="versions">
          <LinkedInVersionPanel
            versions={versions}
            onRestore={(restored) => {
              setProfile(restored);
              setProfileText(restored.profileText);
              setHeadline(restored.headline ?? "");
              setTargetRole(restored.targetRole ?? "");
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
