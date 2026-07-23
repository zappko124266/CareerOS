"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  createResumeVersionAction,
  restoreResumeVersionAction,
} from "@/actions/resume-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";
import type { ResumeData } from "@/features/resume/schema";
import type { ResumeVersion } from "@/generated/prisma/client";

import { ResumeVersionCompare } from "./resume-version-compare";

export function ResumeVersionPanel({
  resumeId,
  currentData,
  versions,
  onVersionsChange,
  onRestore,
}: {
  resumeId: string;
  currentData: ResumeData;
  versions: ResumeVersion[];
  onVersionsChange: (versions: ResumeVersion[]) => void;
  onRestore: (data: ResumeData) => void;
}) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);

  async function handleSaveVersion() {
    setSaving(true);
    const result = await createResumeVersionAction(resumeId, label);
    setSaving(false);

    if (result.status === "success") {
      onVersionsChange([result.data, ...versions]);
      setLabel("");
      toast.success("Version saved");
    } else {
      toast.error(result.message);
    }
  }

  async function handleRestore(versionId: string) {
    setRestoringId(versionId);
    const result = await restoreResumeVersionAction(resumeId, versionId);
    setRestoringId(null);

    if (result.status === "success") {
      const parsedData = result.data.parsedData as unknown as ResumeData;
      onRestore(parsedData);
      toast.success("Version restored — remember to review before applying elsewhere.");
    } else {
      toast.error(result.message);
    }
  }

  const compareVersion = versions.find((version) => version.id === compareId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Save a version</h2>
          <p className="text-muted-foreground text-sm">
            Saves a snapshot of your current draft you can restore or compare
            against later. Auto-save keeps your live draft up to date
            separately — this is for deliberate checkpoints.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Before tailoring for Acme Corp"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <Button onClick={handleSaveVersion} disabled={saving}>
              <Save />
              {saving ? "Saving…" : "Save version"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold">Version history</h2>
          {versions.length === 0 ? (
            <EmptyState
              title="No versions yet"
              description="Save your first version above to start building history."
              className="py-8"
            />
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {versions.map((version) => (
                <li
                  key={version.id}
                  className="ring-foreground/10 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ring-1"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{version.label}</p>
                      {version.targetCompanyName && (
                        <Badge variant="outline">
                          Tailored for {version.targetCompanyName}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeTime(new Date(version.createdAt))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCompareId((current) => (current === version.id ? null : version.id))
                      }
                    >
                      {compareId === version.id ? "Hide comparison" : "Compare"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoringId === version.id}
                      onClick={() => handleRestore(version.id)}
                    >
                      {restoringId === version.id ? "Restoring…" : "Restore"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {compareVersion && (
        <ResumeVersionCompare
          currentData={currentData}
          versionLabel={compareVersion.label}
          versionData={compareVersion.data as unknown as ResumeData}
        />
      )}
    </div>
  );
}
