"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

async function downloadFile(url: string, fallbackName: string) {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    toast.error(body?.error ?? "We couldn't generate that file.");
    return;
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const filenameMatch = disposition?.match(/filename="(.+)"/);
  const filename = filenameMatch?.[1] ?? fallbackName;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

/** Generic export menu for any Application Studio document (cover letter,
 * email, or recruiter message) — same download/blob/toast pattern as
 * `ResumeExportMenu`, parameterized by opportunity+document id instead of
 * resume id, so the three studios share one component instead of three. */
export function ApplicationDocumentExportMenu({
  opportunityId,
  documentId,
}: {
  opportunityId: string;
  documentId: string;
}) {
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  async function handleDownload(format: "pdf" | "docx") {
    setDownloading(format);
    const url = `/opportunities/${opportunityId}/documents/${documentId}/export/${format}`;
    await downloadFile(url, `document.${format}`);
    setDownloading(null);
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={downloading !== null}
        onClick={() => handleDownload("pdf")}
      >
        <Download />
        {downloading === "pdf" ? "Preparing…" : "PDF"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={downloading !== null}
        onClick={() => handleDownload("docx")}
      >
        <Download />
        {downloading === "docx" ? "Preparing…" : "DOCX"}
      </Button>
    </div>
  );
}
