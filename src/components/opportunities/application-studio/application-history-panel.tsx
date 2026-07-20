"use client";

import { toast } from "sonner";

import {
  archiveApplicationDocumentAction,
  deleteApplicationDocumentAction,
  duplicateApplicationDocumentAction,
} from "@/actions/application-studio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import { DOCUMENT_KIND_LABEL } from "@/features/applications/types";
import type { ApplicationDocument } from "@/generated/prisma/client";
import type { ApplicationReviewOutput } from "@/features/career-intelligence/applications/review/types";

type ReviewRow = ApplicationReviewOutput & { id: string; createdAt: Date };

/** Every Application Document (any kind, any status) plus every past AI
 * Review run for this opportunity — draft/version/duplicate/restore/
 * archive/delete all live per-document in the studio tabs; this view is
 * the flat cross-kind timeline the sprint's "Application History"
 * requirement asks for. */
export function ApplicationHistoryPanel({
  opportunityId,
  documents: initialDocuments,
  reviews,
  onDocumentsChange,
}: {
  opportunityId: string;
  documents: ApplicationDocument[];
  reviews: ReviewRow[];
  onDocumentsChange: (documents: ApplicationDocument[]) => void;
}) {
  async function handleDuplicate(documentId: string) {
    const result = await duplicateApplicationDocumentAction(documentId);
    if (result.status === "success") {
      onDocumentsChange([result.data, ...initialDocuments]);
      toast.success("Duplicated as a new draft");
    } else {
      toast.error(result.message);
    }
  }

  async function handleArchiveToggle(document: ApplicationDocument) {
    const result = await archiveApplicationDocumentAction(
      document.id,
      document.status !== "ARCHIVED",
    );
    if (result.status === "success") {
      onDocumentsChange(
        initialDocuments.map((doc) => (doc.id === document.id ? result.data : doc)),
      );
    } else {
      toast.error(result.message);
    }
  }

  async function handleDelete(documentId: string) {
    const result = await deleteApplicationDocumentAction(documentId, opportunityId);
    if (result.status === "success") {
      onDocumentsChange(initialDocuments.filter((doc) => doc.id !== documentId));
      toast.success("Deleted");
    } else {
      toast.error(result.message);
    }
  }

  const sorted = [...initialDocuments].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold">All documents</h2>
          {sorted.length === 0 ? (
            <EmptyState
              title="Nothing yet"
              description="Generate a cover letter, email, or recruiter message to see it here."
              className="py-8"
            />
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {sorted.map((document) => (
                <li
                  key={document.id}
                  className="ring-foreground/10 flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 ring-1"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{DOCUMENT_KIND_LABEL[document.kind]}</Badge>
                      {document.status === "ARCHIVED" && <Badge variant="outline">Archived</Badge>}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{document.title}</p>
                    <p className="text-muted-foreground text-xs">
                      Updated {formatRelativeTime(new Date(document.updatedAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleDuplicate(document.id)}>
                      Duplicate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleArchiveToggle(document)}>
                      {document.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => handleDelete(document.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold">Review history</h2>
          {reviews.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Run an Application Review to start building history."
              className="py-8"
            />
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="ring-foreground/10 flex items-center justify-between gap-2 rounded-lg p-3 ring-1"
                >
                  <p className="text-sm">{formatRelativeTime(new Date(review.createdAt))}</p>
                  <span className="text-sm font-medium">{review.overallReadiness}/100 readiness</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
