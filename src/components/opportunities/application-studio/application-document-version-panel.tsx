"use client";

import { useEffect, useState } from "react";
import { Copy, Save } from "lucide-react";
import { toast } from "sonner";

import {
  createApplicationDocumentVersionAction,
  duplicateApplicationDocumentAction,
  listApplicationDocumentVersionsAction,
  restoreApplicationDocumentVersionAction,
} from "@/actions/application-studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";
import type { ApplicationDocument, ApplicationDocumentVersion } from "@/generated/prisma/client";

/** Shared version history — restore/duplicate/compare — for one Cover
 * Letter, Email, or Recruiter Message document. Same explicit-checkpoint
 * pattern as `ResumeVersionPanel`: auto-save keeps the live draft current,
 * this is for deliberate snapshots the user names themselves. */
export function ApplicationDocumentVersionPanel({
  document,
  onRestore,
  onDuplicated,
}: {
  document: ApplicationDocument;
  onRestore: (content: string, subjectLine: string) => void;
  onDuplicated: (document: ApplicationDocument) => void;
}) {
  const [versions, setVersions] = useState<ApplicationDocumentVersion[]>([]);
  const [loadedForId, setLoadedForId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);

  const loaded = loadedForId === document.id;

  useEffect(() => {
    let cancelled = false;
    listApplicationDocumentVersionsAction(document.id).then((result) => {
      if (cancelled) return;
      if (result.status === "success") setVersions(result.data);
      setLoadedForId(document.id);
    });
    return () => {
      cancelled = true;
    };
  }, [document.id]);

  async function handleSaveVersion() {
    setSaving(true);
    const result = await createApplicationDocumentVersionAction({
      documentId: document.id,
      label: label.trim() || "Untitled version",
    });
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
    const result = await restoreApplicationDocumentVersionAction(document.id, versionId);
    setRestoringId(null);

    if (result.status === "success") {
      onRestore(result.data.content, result.data.subjectLine ?? "");
      toast.success("Version restored");
    } else {
      toast.error(result.message);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const result = await duplicateApplicationDocumentAction(document.id);
    setDuplicating(false);

    if (result.status === "success") {
      onDuplicated(result.data);
      toast.success("Duplicated as a new draft");
    } else {
      toast.error(result.message);
    }
  }

  const compareVersion = versions.find((version) => version.id === compareId);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Save a version</h3>
            <Button size="sm" variant="outline" onClick={handleDuplicate} disabled={duplicating}>
              <Copy />
              {duplicating ? "Duplicating…" : "Duplicate as new draft"}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="e.g. First draft before feedback"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="min-w-0 flex-1"
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
          <h3 className="text-sm font-semibold">Version history</h3>
          {!loaded ? (
            <p className="text-muted-foreground mt-3 text-sm">Loading…</p>
          ) : versions.length === 0 ? (
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
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{version.label}</p>
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
                      {compareId === version.id ? "Hide" : "Compare"}
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
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold">
              Comparing “{compareVersion.label}” to the current draft
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  {compareVersion.label}
                </p>
                <p className="text-sm wrap-break-word whitespace-pre-line">
                  {compareVersion.content}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium uppercase">
                  Current draft
                </p>
                <p className="text-sm wrap-break-word whitespace-pre-line">{document.content}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
