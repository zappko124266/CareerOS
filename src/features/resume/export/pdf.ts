import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import type { ResumeData } from "@/features/resume/schema";
import type { ResumeTemplateId } from "@/components/resume/templates";

import { getPdfDocument } from "./pdf-templates";

export async function renderResumePdf(
  templateId: ResumeTemplateId,
  data: ResumeData,
): Promise<Buffer> {
  return renderToBuffer(getPdfDocument(templateId, data));
}
