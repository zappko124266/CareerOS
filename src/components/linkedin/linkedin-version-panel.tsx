"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  createLinkedInProfileVersionAction,
  restoreLinkedInProfileVersionAction,
} from "@/actions/linkedin-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";
import type { LinkedInProfile, LinkedInProfileVersion } from "@/generated/prisma/client";

type VersionSnapshot = { profileText: string; headline: string | null; targetRole: string | null };

/** Sprint 10, Module 9 — LinkedIn version history. Comparison is
 * deliberately kept to a side-by-side raw-text view rather than a smart
 * structural differ (unlike `ResumeVersionCompare`, which diffs a
 * structured `ResumeData` shape) — LinkedIn profile data here is just
 * free text, so a real structural diff isn't available cheaply, and
 * building one is out of this sprint's effort budget. */
export function LinkedInVersionPanel({
  versions: initialVersions,
  onRestore,
}: {
  versions: LinkedInProfileVersion[];
  onRestore: (profile: LinkedInProfile) => void;
}) {
  const [versions, setVersions] = useState(initialVersions);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);

  async function handleSaveVersion() {
    setSaving(true);
    const result = await createLinkedInProfileVersionAction(label);
    setSaving(false);

    if (result.status === "success") {
      setVersions((prev) => [result.data, ...prev]);
      setLabel("");
      toast.success("Version saved");
    } else {
      toast.error(result.message);
    }
  }

  async function handleRestore(versionId: string) {
    setRestoringId(versionId);
    const result = await restoreLinkedInProfileVersionAction(versionId);
    setRestoringId(null);

    if (result.status === "success") {
      onRestore(result.data);
      toast.success("Version restored — remember to review before saving elsewhere.");
    } else {
      toast.error(result.message);
    }
  }

  const compareVersion = versions.find((version) => version.id === compareId);
  const compareSnapshot = compareVersion?.data as unknown as VersionSnapshot | undefined;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Save a version</h2>
          <p className="text-muted-foreground text-sm">
            Saves a snapshot of your current profile text you can restore or compare against
            later.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Before headline rewrite"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
            <Button onClick={handleSaveVersion} disabled={saving}>
              {saving ? "Saving…" : "Save version"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {versions.length === 0 ? (
        <EmptyState title="No versions saved yet" className="py-8" />
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((version) => (
            <li key={version.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{version.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatRelativeTime(new Date(version.createdAt))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCompareId((prev) => (prev === version.id ? null : version.id))}
                    >
                      {compareId === version.id ? "Hide" : "Compare"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoringId !== null}
                      onClick={() => handleRestore(version.id)}
                    >
                      {restoringId === version.id ? "Restoring…" : "Restore"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {compareVersion && compareSnapshot && (
        <Card>
          <CardContent className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{compareVersion.label}</h3>
            {compareSnapshot.headline && (
              <p className="text-sm">
                <span className="font-medium">Headline: </span>
                {compareSnapshot.headline}
              </p>
            )}
            <p className="text-muted-foreground wrap-break-word whitespace-pre-line text-sm">
              {compareSnapshot.profileText}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
