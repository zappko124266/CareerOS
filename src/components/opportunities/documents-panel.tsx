"use client";

import { useState } from "react";
import { Check } from "lucide-react";

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
import type { Opportunity } from "@/generated/prisma/client";

const NO_RESUME_VALUE = "__none__";

export function DocumentsPanel({
  opportunity,
  resumes,
  onChangeNotes,
}: {
  opportunity: Opportunity;
  resumes: { id: string; title: string }[];
  onChangeNotes: (input: {
    coverLetter?: string;
    recruiterNotes?: string;
    resumeId?: string | null;
  }) => Promise<void>;
}) {
  const [coverLetter, setCoverLetter] = useState(opportunity.coverLetter ?? "");
  const [recruiterNotes, setRecruiterNotes] = useState(
    opportunity.recruiterNotes ?? "",
  );
  const [savedField, setSavedField] = useState<string | null>(null);

  async function save(field: string, input: Parameters<typeof onChangeNotes>[0]) {
    await onChangeNotes(input);
    setSavedField(field);
    setTimeout(() => setSavedField((current) => (current === field ? null : current)), 2000);
  }

  return (
    <>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="resume-version">Resume version</Label>
          <p className="text-muted-foreground text-sm">
            Which of your resumes are you using for this application?
          </p>
          <Select
            value={opportunity.resumeId ?? NO_RESUME_VALUE}
            onValueChange={(value) =>
              save("resume", {
                resumeId: value === NO_RESUME_VALUE ? null : value,
              })
            }
          >
            <SelectTrigger id="resume-version" className="w-full sm:w-80">
              <SelectValue placeholder="No resume selected" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_RESUME_VALUE}>No resume selected</SelectItem>
              {resumes.map((resume) => (
                <SelectItem key={resume.id} value={resume.id}>
                  {resume.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {resumes.length === 0 && (
            <p className="text-muted-foreground text-sm">
              You haven&apos;t uploaded a resume yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="cover-letter">Cover letter</Label>
          <Textarea
            id="cover-letter"
            rows={8}
            placeholder="Draft your cover letter for this role…"
            value={coverLetter}
            onChange={(event) => setCoverLetter(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => save("coverLetter", { coverLetter })}
            >
              Save cover letter
            </Button>
            {savedField === "coverLetter" && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <Check className="size-3.5" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Label htmlFor="recruiter-notes">Recruiter notes</Label>
          <Textarea
            id="recruiter-notes"
            rows={5}
            placeholder="Notes from calls or emails with the recruiter…"
            value={recruiterNotes}
            onChange={(event) => setRecruiterNotes(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => save("recruiterNotes", { recruiterNotes })}
            >
              Save notes
            </Button>
            {savedField === "recruiterNotes" && (
              <span className="text-muted-foreground flex items-center gap-1 text-sm">
                <Check className="size-3.5" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
