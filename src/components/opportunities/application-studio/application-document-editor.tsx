"use client";

import { useRef, useState } from "react";
import { Archive, ArchiveRestore, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  archiveApplicationDocumentAction,
  deleteApplicationDocumentAction,
  reviseApplicationDocumentAction,
  saveApplicationDocumentDraftAction,
} from "@/actions/application-studio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { ACTION_LABEL, TONE_LABEL } from "@/features/applications/types";
import type {
  ApplicationDocumentAction,
  ApplicationDocumentTone,
} from "@/features/applications/types";
import type { ApplicationDocument } from "@/generated/prisma/client";

import { ApplicationDocumentExportMenu } from "./application-document-export-menu";
import { ApplicationDocumentVersionPanel } from "./application-document-version-panel";

const AUTOSAVE_DELAY_MS = 1500;

const REVISE_ACTIONS: ApplicationDocumentAction[] = [
  "REWRITE",
  "EXPAND",
  "SHORTEN",
  "IMPROVE",
  "ATS_FRIENDLY",
  "GRAMMAR",
];

const TONES: ApplicationDocumentTone[] = [
  "PROFESSIONAL",
  "FRIENDLY",
  "EXECUTIVE",
  "TECHNICAL",
  "CREATIVE",
];

type SaveStatus = "idle" | "saving" | "saved" | "error";

/** Shared editor for one Application Studio document (cover letter, email,
 * or recruiter message) — textarea + auto-save + the AI action toolbar
 * (Rewrite/Expand/Shorten/Improve/ATS-friendly/Grammar/tone change) +
 * export + version history. Used identically by all three studios;
 * `document.kind` only affects labeling done by the caller. */
export function ApplicationDocumentEditor({
  opportunityId,
  document,
  onChange,
  onArchiveChange,
  onDeleted,
  onDuplicated,
}: {
  opportunityId: string;
  document: ApplicationDocument;
  onChange: (document: ApplicationDocument) => void;
  onArchiveChange: (document: ApplicationDocument) => void;
  onDeleted: () => void;
  onDuplicated: (document: ApplicationDocument) => void;
}) {
  const [content, setContent] = useState(document.content);
  const [subjectLine, setSubjectLine] = useState(document.subjectLine ?? "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [revising, setRevising] = useState<ApplicationDocumentAction | null>(null);
  const [changeTone, setChangeTone] = useState<ApplicationDocumentTone>(
    (document.tone as ApplicationDocumentTone | null) ?? "PROFESSIONAL",
  );
  const [showVersions, setShowVersions] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviseAction = useAsyncAction(reviseApplicationDocumentAction);

  function scheduleSave(nextContent: string, nextSubjectLine: string) {
    setSaveStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const result = await saveApplicationDocumentDraftAction({
        documentId: document.id,
        content: nextContent,
        subjectLine: document.kind === "EMAIL" ? nextSubjectLine : undefined,
      });
      setSaveStatus(result.status === "success" ? "saved" : "error");
      if (result.status === "success") {
        onChange({ ...document, content: nextContent, subjectLine: nextSubjectLine || null });
      }
    }, AUTOSAVE_DELAY_MS);
  }

  function handleContentChange(next: string) {
    setContent(next);
    scheduleSave(next, subjectLine);
  }

  function handleSubjectLineChange(next: string) {
    setSubjectLine(next);
    scheduleSave(content, next);
  }

  async function handleRevise(action: ApplicationDocumentAction) {
    setRevising(action);
    const result = await reviseAction.run({
      documentId: document.id,
      action,
      tone: action === "CHANGE_TONE" ? changeTone : undefined,
    });
    setRevising(null);

    if (result) {
      setContent(result.content);
      setSubjectLine(result.subjectLine ?? "");
      onChange(result);
      toast.success(`${ACTION_LABEL[action]} applied`);
    } else if (reviseAction.error) {
      toast.error(reviseAction.error);
    }
  }

  async function handleArchiveToggle() {
    const result = await archiveApplicationDocumentAction(
      document.id,
      document.status !== "ARCHIVED",
    );
    if (result.status === "success") {
      onArchiveChange(result.data);
      toast.success(document.status === "ARCHIVED" ? "Restored from archive" : "Archived");
    } else {
      toast.error(result.message);
    }
  }

  async function handleDelete() {
    const result = await deleteApplicationDocumentAction(document.id, opportunityId);
    if (result.status === "success") {
      onDeleted();
      toast.success("Deleted");
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold">{document.title}</h3>
            <span
              className="text-muted-foreground shrink-0 text-xs"
              role="status"
              aria-live="polite"
            >
              {saveStatus === "saving" && "Saving…"}
              {saveStatus === "saved" && "All changes saved"}
              {saveStatus === "error" && "Couldn't save — retrying on next edit"}
            </span>
          </div>

          {document.kind === "EMAIL" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${document.id}-subject`}>Subject line</Label>
              <Input
                id={`${document.id}-subject`}
                value={subjectLine}
                onChange={(event) => handleSubjectLineChange(event.target.value)}
              />
            </div>
          )}

          <Textarea
            rows={14}
            value={content}
            onChange={(event) => handleContentChange(event.target.value)}
            aria-label={document.title}
          />

          {reviseAction.isPending && reviseAction.isSlow && (
            <p className="text-muted-foreground text-sm">
              Still working — this can take up to a minute or two.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {REVISE_ACTIONS.map((action) => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                disabled={reviseAction.isPending}
                onClick={() => handleRevise(action)}
              >
                <Sparkles className="size-3.5" />
                {revising === action ? "Working…" : ACTION_LABEL[action]}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={changeTone}
              onValueChange={(value) => setChangeTone(value as ApplicationDocumentTone)}
            >
              <SelectTrigger className="w-full sm:w-48" aria-label="Tone to change to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((tone) => (
                  <SelectItem key={tone} value={tone}>
                    {TONE_LABEL[tone]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              disabled={reviseAction.isPending}
              onClick={() => handleRevise("CHANGE_TONE")}
            >
              <Sparkles className="size-3.5" />
              {revising === "CHANGE_TONE" ? "Working…" : "Change tone"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <div className="flex flex-wrap gap-2">
              <ApplicationDocumentExportMenu
                opportunityId={opportunityId}
                documentId={document.id}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const text =
                    document.kind === "EMAIL" && subjectLine
                      ? `Subject: ${subjectLine}\n\n${content}`
                      : content;
                  navigator.clipboard.writeText(text);
                  toast.success("Copied — ready to paste into an email or message");
                }}
              >
                Copy (email-ready)
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowVersions((v) => !v)}>
                {showVersions ? "Hide versions" : "Versions"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleArchiveToggle}>
                {document.status === "ARCHIVED" ? <ArchiveRestore /> : <Archive />}
                {document.status === "ARCHIVED" ? "Unarchive" : "Archive"}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
                <Trash2 />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showVersions && (
        <ApplicationDocumentVersionPanel
          document={{ ...document, content, subjectLine: subjectLine || null }}
          onRestore={(restoredContent, restoredSubjectLine) => {
            setContent(restoredContent);
            setSubjectLine(restoredSubjectLine);
            onChange({ ...document, content: restoredContent, subjectLine: restoredSubjectLine || null });
          }}
          onDuplicated={onDuplicated}
        />
      )}
    </div>
  );
}
