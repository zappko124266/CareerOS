"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { generateApplicationDocumentAction } from "@/actions/application-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsyncAction } from "@/hooks/use-async-action";
import { formatRelativeTime } from "@/lib/utils";
import {
  AUDIENCE_LABEL,
  LENGTH_LABEL,
  SUBTYPE_LABEL,
  TONE_LABEL,
} from "@/features/applications/types";
import type {
  ApplicationDocumentAudience,
  ApplicationDocumentKind,
  ApplicationDocumentLength,
  ApplicationDocumentSubtype,
  ApplicationDocumentTone,
} from "@/features/applications/types";
import type { ApplicationDocument } from "@/generated/prisma/client";

import { ApplicationDocumentEditor } from "./application-document-editor";

const TONES: ApplicationDocumentTone[] = [
  "PROFESSIONAL",
  "FRIENDLY",
  "EXECUTIVE",
  "TECHNICAL",
  "CREATIVE",
];
const LENGTHS: ApplicationDocumentLength[] = ["SHORT", "MEDIUM", "LONG"];
const AUDIENCES: ApplicationDocumentAudience[] = [
  "HIRING_MANAGER",
  "RECRUITER",
  "REFERRAL",
  "FRESHER",
  "EXPERIENCED",
  "INTERNSHIP",
  "EXECUTIVE",
  "STARTUP",
  "ENTERPRISE",
  "REMOTE",
  "GOVERNMENT",
  "COMPANY",
];

export interface DocumentKindConfig {
  kind: ApplicationDocumentKind;
  label: string;
  description: string;
  usesAudience: boolean;
  usesSubtype: boolean;
  usesLength: boolean;
  subtypeOptions?: ApplicationDocumentSubtype[];
}

/**
 * One generic panel, instantiated once per document kind (Cover Letter
 * Studio / Email Studio / Recruiter Message Studio) rather than three
 * near-identical components — `config` supplies the only real differences
 * (which shaping inputs apply, which subtype list to offer). Everything
 * else (generation form, document list, open editor) is shared.
 */
export function ApplicationDocumentPanel({
  opportunityId,
  config,
  documents,
  onDocumentsChange,
}: {
  opportunityId: string;
  config: DocumentKindConfig;
  documents: ApplicationDocument[];
  onDocumentsChange: (documents: ApplicationDocument[]) => void;
}) {
  const [subtype, setSubtype] = useState<ApplicationDocumentSubtype | undefined>(
    config.subtypeOptions?.[0],
  );
  const [audience, setAudience] = useState<ApplicationDocumentAudience>("HIRING_MANAGER");
  const [tone, setTone] = useState<ApplicationDocumentTone>("PROFESSIONAL");
  const [length, setLength] = useState<ApplicationDocumentLength>("MEDIUM");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const generateAction = useAsyncAction(generateApplicationDocumentAction);

  const kindDocuments = documents.filter((document) => document.kind === config.kind);
  const activeDocuments = kindDocuments.filter((document) => document.status !== "ARCHIVED");
  const archivedDocuments = kindDocuments.filter((document) => document.status === "ARCHIVED");
  const selected = kindDocuments.find((document) => document.id === selectedId) ?? null;

  async function handleGenerate() {
    const result = await generateAction.run({
      opportunityId,
      kind: config.kind,
      subtype: config.usesSubtype ? subtype : undefined,
      audience: config.usesAudience ? audience : undefined,
      tone,
      length: config.usesLength ? length : undefined,
    });

    if (result) {
      onDocumentsChange([result, ...documents]);
      setSelectedId(result.id);
      toast.success(`${config.label} generated`);
    } else if (generateAction.error) {
      toast.error(generateAction.error);
    }
  }

  function updateDocument(updated: ApplicationDocument) {
    onDocumentsChange(documents.map((doc) => (doc.id === updated.id ? updated : doc)));
  }

  function handleDeleted() {
    onDocumentsChange(documents.filter((doc) => doc.id !== selectedId));
    setSelectedId(null);
  }

  function handleDuplicated(newDocument: ApplicationDocument) {
    onDocumentsChange([newDocument, ...documents]);
    setSelectedId(newDocument.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold">Generate a new {config.label.toLowerCase()}</h2>
            <p className="text-muted-foreground text-sm">{config.description}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {config.usesSubtype && config.subtypeOptions && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${config.kind}-subtype`}>Type</Label>
                <Select
                  value={subtype}
                  onValueChange={(value) => setSubtype(value as ApplicationDocumentSubtype)}
                >
                  <SelectTrigger id={`${config.kind}-subtype`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.subtypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SUBTYPE_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {config.usesAudience && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${config.kind}-audience`}>Written for</Label>
                <Select
                  value={audience}
                  onValueChange={(value) => setAudience(value as ApplicationDocumentAudience)}
                >
                  <SelectTrigger id={`${config.kind}-audience`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {AUDIENCE_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${config.kind}-tone`}>Tone</Label>
              <Select value={tone} onValueChange={(value) => setTone(value as ApplicationDocumentTone)}>
                <SelectTrigger id={`${config.kind}-tone`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {TONE_LABEL[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config.usesLength && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${config.kind}-length`}>Length</Label>
                <Select
                  value={length}
                  onValueChange={(value) => setLength(value as ApplicationDocumentLength)}
                >
                  <SelectTrigger id={`${config.kind}-length`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LENGTHS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {LENGTH_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {generateAction.isPending && generateAction.isSlow && (
            <p className="text-muted-foreground text-sm">
              Still working — this can take up to a minute or two.
            </p>
          )}
          <Button onClick={handleGenerate} disabled={generateAction.isPending} className="w-fit">
            <Sparkles />
            {generateAction.isPending ? "Generating…" : `Generate ${config.label.toLowerCase()}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold">Your {config.label.toLowerCase()}s</h2>
          {activeDocuments.length === 0 ? (
            <EmptyState
              title={`No ${config.label.toLowerCase()}s yet`}
              description="Generate one above to get started."
              className="py-8"
            />
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {activeDocuments.map((document) => (
                <li key={document.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(document.id)}
                    className={`ring-foreground/10 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-left ring-1 ${
                      selectedId === document.id ? "bg-accent" : ""
                    }`}
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{document.title}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {formatRelativeTime(new Date(document.updatedAt))}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {archivedDocuments.length > 0 && (
            <details className="mt-3">
              <summary className="text-muted-foreground cursor-pointer text-sm">
                {archivedDocuments.length} archived
              </summary>
              <ul className="mt-2 flex flex-col gap-2">
                {archivedDocuments.map((document) => (
                  <li key={document.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(document.id)}
                      className={`ring-foreground/10 flex w-full flex-wrap items-center justify-between gap-2 rounded-lg p-3 text-left opacity-70 ring-1 ${
                        selectedId === document.id ? "bg-accent" : ""
                      }`}
                    >
                      <span className="min-w-0 truncate text-sm font-medium">{document.title}</span>
                      <Badge variant="outline">Archived</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </CardContent>
      </Card>

      {selected && (
        <ApplicationDocumentEditor
          opportunityId={opportunityId}
          document={selected}
          onChange={updateDocument}
          onArchiveChange={updateDocument}
          onDeleted={handleDeleted}
          onDuplicated={handleDuplicated}
        />
      )}
    </div>
  );
}
