"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { createResumeVersionAction, saveResumeDraftAction } from "@/actions/resume-studio";
import { AtsScorePanel } from "@/components/resume/ats-score-panel";
import { OptimizationSuggestionsList } from "@/components/resume/optimization-suggestions-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { ResumeTemplateId } from "@/components/resume/templates";
import {
  AtsScoreBreakdownSchema,
  OptimizationSuggestionSchema,
} from "@/features/resume/schema";
import type { ResumeData } from "@/features/resume/schema";
import { computeActionVerbUsage, computeReadability } from "@/features/resume/seo";
import type { Opportunity, ResumeAnalysis, ResumeVersion } from "@/generated/prisma/client";

import { ResumeBuilderEditor } from "./resume-builder-editor";
import { ResumeCopilotPanel } from "./resume-copilot-panel";
import { ResumeExportMenu } from "./resume-export-menu";
import { ResumeKeywordPanel } from "./resume-keyword-panel";
import { ResumeLivePreview } from "./resume-live-preview";
import { ResumeMissingSkillsPanel } from "./resume-missing-skills-panel";
import { ResumeSuggestionsPanel } from "./resume-suggestions-panel";
import { ResumeTailoringPanel } from "./resume-tailoring-panel";
import { ResumeTimeline } from "./resume-timeline";
import { ResumeVersionPanel } from "./resume-version-panel";

const AUTOSAVE_DELAY_MS = 1500;

function draftStorageKey(resumeId: string) {
  return `careeros:resume-draft:${resumeId}`;
}

/** Drops empty-string bullets/skills before persisting — the textarea
 * "one bullet per line" editing pattern produces a trailing empty entry
 * while the user is mid-typing a new one; that's fine on screen but
 * shouldn't be saved, previewed, or exported as a blank line. */
function sanitize(data: ResumeData): ResumeData {
  return {
    ...data,
    skills: data.skills.map((skill) => skill.trim()).filter(Boolean),
    experience: data.experience.map((entry) => ({
      ...entry,
      bullets: entry.bullets.map((bullet) => bullet.trim()).filter(Boolean),
    })),
    projects: data.projects.map((project) => ({
      ...project,
      bullets: project.bullets.map((bullet) => bullet.trim()).filter(Boolean),
    })),
  };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function ResumeStudio({
  resumeId,
  resumeTitle,
  resumeCreatedAt,
  initialData,
  initialVersions,
  analyses,
  missingSkills,
  savedOpportunities,
  name,
  targetRole,
  initialOpportunityId,
}: {
  resumeId: string;
  resumeTitle: string;
  resumeCreatedAt: Date;
  initialData: ResumeData;
  initialVersions: ResumeVersion[];
  analyses: ResumeAnalysis[];
  missingSkills: { skill: string; frequency: number }[];
  savedOpportunities: Pick<Opportunity, "id" | "title" | "companyName" | "description">[];
  name: string;
  targetRole: string | null;
  /** Sprint 12 (Job Studio) — set when arriving via a "Tailor a resume for
   * this job" deep link from the Job Studio's resume recommendation
   * panel (`?opportunityId=`); pre-selects that opportunity in the
   * Tailoring tab's picker instead of requiring a manual pick. */
  initialOpportunityId: string | null;
}) {
  const [data, setData] = useState(initialData);
  const [templateId, setTemplateId] = useState<ResumeTemplateId>("minimal");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [versions, setVersions] = useState(initialVersions);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedRecovery = useRef(false);

  // Draft recovery: on first mount only, check for a locally-saved draft
  // newer than what the server rendered — e.g. the tab was closed or
  // crashed before the debounced server save fired. Offered once, not
  // re-checked on every render.
  useEffect(() => {
    if (hasCheckedRecovery.current) return;
    hasCheckedRecovery.current = true;

    const raw = localStorage.getItem(draftStorageKey(resumeId));
    if (!raw) return;

    try {
      const stored = JSON.parse(raw) as { data: ResumeData; savedAt: string };
      const isDifferent = JSON.stringify(stored.data) !== JSON.stringify(initialData);
      if (!isDifferent) return;

      toast("Unsaved changes found from a previous session", {
        description: `From ${new Date(stored.savedAt).toLocaleString()}`,
        action: {
          label: "Restore",
          onClick: () => setData(stored.data),
        },
      });
    } catch {
      // Corrupted local draft — ignore it rather than blocking the editor.
      localStorage.removeItem(draftStorageKey(resumeId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateData(next: ResumeData) {
    setData(next);
    localStorage.setItem(
      draftStorageKey(resumeId),
      JSON.stringify({ data: next, savedAt: new Date().toISOString() }),
    );

    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const clean = sanitize(next);
      const result = await saveResumeDraftAction(resumeId, clean);
      if (result.status === "success") {
        setSaveStatus("saved");
        localStorage.removeItem(draftStorageKey(resumeId));
      } else {
        setSaveStatus("error");
        toast.error(result.message);
      }
    }, AUTOSAVE_DELAY_MS);
  }

  /** Sprint 10, Module 4/9 — "Save as new resume version" after applying
   * AI tailoring suggestions. `createResumeVersionAction` snapshots
   * whatever's currently persisted in `Resume.parsedData`, not client
   * state — so this explicitly flushes the live-edited `data` first
   * (bypassing the debounce timer) rather than racing it. Sprint 11:
   * threads through the optional saved-opportunity target so the new
   * version is a real company-specific variant, not just a free-text
   * label. */
  async function saveTailoredVersion(
    label: string,
    target?: { opportunityId: string; companyName: string },
  ): Promise<boolean> {
    const clean = sanitize(data);
    const saveResult = await saveResumeDraftAction(resumeId, clean);
    if (saveResult.status !== "success") {
      toast.error(saveResult.message);
      return false;
    }

    const versionResult = await createResumeVersionAction(resumeId, label, target);
    if (versionResult.status !== "success") {
      toast.error(versionResult.message);
      return false;
    }

    setVersions((prev) => [versionResult.data, ...prev]);
    toast.success("Saved as a new resume version");
    return true;
  }

  function applyBullet(experienceIndex: number, bulletIndex: number, text: string) {
    const experience = data.experience.map((entry, index) => {
      if (index !== experienceIndex) return entry;
      const bullets = entry.bullets.map((bullet, bIndex) =>
        bIndex === bulletIndex ? text : bullet,
      );
      return { ...entry, bullets };
    });
    updateData({ ...data, experience });
  }

  const latestAnalysis = analyses[0] ?? null;
  const actionVerbUsage = useMemo(() => computeActionVerbUsage(data), [data]);
  const readability = useMemo(() => computeReadability(data), [data]);
  const optimizationSuggestions = latestAnalysis
    ? z.array(OptimizationSuggestionSchema).parse(latestAnalysis.suggestions)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="min-w-0 max-w-full">
          <Link href={`/resume/${resumeId}`}>
            <ArrowLeft className="shrink-0" />
            <span className="truncate">Back to {resumeTitle}</span>
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="text-muted-foreground text-xs"
            role="status"
            aria-live="polite"
          >
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "All changes saved"}
            {saveStatus === "error" && "Couldn't save — retrying on next edit"}
          </span>
          <ResumeExportMenu resumeId={resumeId} templateId={templateId} />
        </div>
      </div>

      <Tabs defaultValue={initialOpportunityId ? "tailor" : "editor"}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="editor">Editor & Preview</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="tailor">Tailor & Optimize</TabsTrigger>
          <TabsTrigger value="versions">Versions & Timeline</TabsTrigger>
          <TabsTrigger value="copilot">Ask Copilot</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ResumeBuilderEditor data={data} onChange={updateData} />
            <ResumeLivePreview
              data={data}
              templateId={templateId}
              onTemplateChange={setTemplateId}
            />
          </div>
        </TabsContent>

        <TabsContent value="health" className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-6">
              {latestAnalysis ? (
                <>
                  <AtsScorePanel
                    overallScore={latestAnalysis.overallScore}
                    breakdown={AtsScoreBreakdownSchema.parse(latestAnalysis.breakdown)}
                    actionVerbUsage={actionVerbUsage}
                    readability={readability}
                  />
                  <OptimizationSuggestionsList suggestions={optimizationSuggestions} />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No ATS analysis yet — run one from the resume page.
                </p>
              )}
            </CardContent>
          </Card>
          <ResumeMissingSkillsPanel
            missingSkills={missingSkills}
            savedOpportunityCount={savedOpportunities.length}
          />
          <ResumeSuggestionsPanel resumeId={resumeId} />
        </TabsContent>

        <TabsContent value="tailor" className="flex flex-col gap-4">
          <ResumeTailoringPanel
            resumeId={resumeId}
            data={data}
            savedOpportunities={savedOpportunities}
            initialOpportunityId={initialOpportunityId}
            onApplyBullet={applyBullet}
            onSaveVersion={saveTailoredVersion}
          />
          <ResumeKeywordPanel resumeId={resumeId} />
        </TabsContent>

        <TabsContent value="versions" className="flex flex-col gap-4">
          <ResumeTimeline
            resumeCreatedAt={resumeCreatedAt}
            resumeTitle={resumeTitle}
            analyses={analyses}
            versions={versions}
          />
          <ResumeVersionPanel
            resumeId={resumeId}
            currentData={data}
            versions={versions}
            onVersionsChange={setVersions}
            onRestore={updateData}
          />
        </TabsContent>

        <TabsContent value="copilot">
          <ResumeCopilotPanel name={name} targetRole={targetRole} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
