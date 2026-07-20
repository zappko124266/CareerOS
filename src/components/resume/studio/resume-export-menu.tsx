"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ResumeTemplateId } from "@/components/resume/templates";

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

export function ResumeExportMenu({
  resumeId,
  templateId,
}: {
  resumeId: string;
  templateId: ResumeTemplateId;
}) {
  const [downloading, setDownloading] = useState<"pdf" | "docx" | null>(null);

  async function handleDownload(format: "pdf" | "docx") {
    setDownloading(format);
    const url =
      format === "pdf"
        ? `/resume/${resumeId}/export/pdf?template=${templateId}`
        : `/resume/${resumeId}/export/docx`;
    await downloadFile(url, `resume.${format}`);
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
        {downloading === "pdf" ? "Preparing…" : "Export PDF"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={downloading !== null}
        onClick={() => handleDownload("docx")}
      >
        <Download />
        {downloading === "docx" ? "Preparing…" : "Export DOCX"}
      </Button>
    </div>
  );
}
