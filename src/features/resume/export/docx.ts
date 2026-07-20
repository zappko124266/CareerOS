import "server-only";

import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

import {
  formatContactLine,
  formatDateRange,
  resumeDisplayName,
} from "@/features/resume/format";
import type { ResumeData } from "@/features/resume/schema";

const SECTION_HEADING = { heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 80 } };

/**
 * One DOCX layout, not one-per-template — unlike the PDF/preview
 * templates (which are about visual presentation for a human reader), a
 * DOCX intended for ATS parsing is *better* off simple and consistent:
 * multi-column layouts and heavy styling are exactly what trips up resume
 * parsers. This produces a single clean, ATS-friendly structure regardless
 * of which visual template the user picked for the PDF/preview.
 */
export async function renderResumeDocx(data: ResumeData): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: resumeDisplayName(data), bold: true, size: 32 }),
      ],
    }),
  );

  const contactLine = formatContactLine(data);
  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contactLine, size: 20, color: "525252" })],
      }),
    );
  }

  if (data.summary) {
    children.push(new Paragraph({ children: [new TextRun({ text: data.summary })] }));
  }

  if (data.experience.length > 0) {
    children.push(new Paragraph({ text: "Experience", ...SECTION_HEADING }));
    for (const entry of data.experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${entry.title} · ${entry.company}`, bold: true }),
            new TextRun({
              text: `   ${formatDateRange(entry.startDate, entry.endDate, entry.current)}`,
              color: "737373",
              size: 18,
            }),
          ],
        }),
      );
      for (const bullet of entry.bullets) {
        children.push(
          new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: bullet })] }),
        );
      }
    }
  }

  if (data.education.length > 0) {
    children.push(new Paragraph({ text: "Education", ...SECTION_HEADING }));
    for (const entry of data.education) {
      const title = entry.degree ? `${entry.degree}, ${entry.institution}` : entry.institution;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: title, bold: true }),
            new TextRun({
              text: `   ${formatDateRange(entry.startDate, entry.endDate, false)}`,
              color: "737373",
              size: 18,
            }),
          ],
        }),
      );
    }
  }

  if (data.skills.length > 0) {
    children.push(new Paragraph({ text: "Skills", ...SECTION_HEADING }));
    children.push(new Paragraph({ children: [new TextRun({ text: data.skills.join("  ·  ") })] }));
  }

  if (data.certifications.length > 0) {
    children.push(new Paragraph({ text: "Certifications", ...SECTION_HEADING }));
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: data.certifications.map((cert) => cert.name).join("  ·  ") }),
        ],
      }),
    );
  }

  if (data.projects.length > 0) {
    children.push(new Paragraph({ text: "Projects", ...SECTION_HEADING }));
    for (const project of data.projects) {
      children.push(new Paragraph({ children: [new TextRun({ text: project.name, bold: true })] }));
      if (project.description) {
        children.push(new Paragraph({ children: [new TextRun({ text: project.description })] }));
      }
    }
  }

  const document = new Document({ sections: [{ children }] });
  return Packer.toBuffer(document);
}
