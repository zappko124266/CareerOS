import "server-only";

import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

/**
 * Generic single-column text-document DOCX — reused by Cover Letter,
 * Email, and Recruiter Message export. Same rationale as the resume
 * exporter's single unified layout: these documents are prose, not
 * multi-section resumes, so there's nothing template-specific to vary.
 */
export async function renderPlainDocumentDocx(title: string, body: string): Promise<Buffer> {
  const paragraphs = body.split(/\n{2,}/).filter((paragraph) => paragraph.trim());

  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 240 },
      children: [new TextRun({ text: title, bold: true })],
    }),
    ...paragraphs.map(
      (paragraph) =>
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: paragraph.trim() })],
        }),
    ),
  ];

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
