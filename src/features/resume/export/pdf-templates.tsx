import "server-only";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  formatContactLine,
  formatDateRange,
  resumeDisplayName,
} from "@/features/resume/format";
import type { ResumeData } from "@/features/resume/schema";
import type { ResumeTemplateId } from "@/components/resume/templates";

const minimalStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#171717" },
  header: { textAlign: "center", marginBottom: 16 },
  name: { fontSize: 18, fontWeight: 700 },
  contact: { fontSize: 9, color: "#525252", marginTop: 4 },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottom: "1pt solid #d4d4d4",
    paddingBottom: 3,
  },
  entry: { marginTop: 8 },
  entryHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontSize: 10, fontWeight: 700 },
  entryMeta: { fontSize: 9, color: "#737373" },
  bullet: { fontSize: 9.5, marginTop: 2, lineHeight: 1.4 },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, color: "#404040" },
});

function MinimalPdfDocument({ data }: { data: ResumeData }) {
  const contactLine = formatContactLine(data);

  return (
    <Document>
      <Page size="A4" style={minimalStyles.page}>
        <View style={minimalStyles.header}>
          <Text style={minimalStyles.name}>{resumeDisplayName(data)}</Text>
          {contactLine ? (
            <Text style={minimalStyles.contact}>{contactLine}</Text>
          ) : null}
        </View>

        {data.summary ? (
          <View style={minimalStyles.section}>
            <Text style={minimalStyles.paragraph}>{data.summary}</Text>
          </View>
        ) : null}

        {data.experience.length > 0 ? (
          <View style={minimalStyles.section}>
            <Text style={minimalStyles.sectionTitle}>Experience</Text>
            {data.experience.map((entry, index) => (
              <View key={index} style={minimalStyles.entry}>
                <View style={minimalStyles.entryHeaderRow}>
                  <Text style={minimalStyles.entryTitle}>
                    {entry.title} · {entry.company}
                  </Text>
                  <Text style={minimalStyles.entryMeta}>
                    {formatDateRange(entry.startDate, entry.endDate, entry.current)}
                  </Text>
                </View>
                {entry.bullets.map((bullet, bulletIndex) => (
                  <Text key={bulletIndex} style={minimalStyles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {data.education.length > 0 ? (
          <View style={minimalStyles.section}>
            <Text style={minimalStyles.sectionTitle}>Education</Text>
            {data.education.map((entry, index) => (
              <View key={index} style={minimalStyles.entryHeaderRow}>
                <Text style={minimalStyles.entryTitle}>
                  {entry.degree ? `${entry.degree}, ` : ""}
                  {entry.institution}
                </Text>
                <Text style={minimalStyles.entryMeta}>
                  {formatDateRange(entry.startDate, entry.endDate, false)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {data.skills.length > 0 ? (
          <View style={minimalStyles.section}>
            <Text style={minimalStyles.sectionTitle}>Skills</Text>
            <Text style={minimalStyles.paragraph}>
              {data.skills.join("  ·  ")}
            </Text>
          </View>
        ) : null}

        {data.certifications.length > 0 ? (
          <View style={minimalStyles.section}>
            <Text style={minimalStyles.sectionTitle}>Certifications</Text>
            <Text style={minimalStyles.paragraph}>
              {data.certifications.map((cert) => cert.name).join("  ·  ")}
            </Text>
          </View>
        ) : null}

        {data.projects.length > 0 ? (
          <View style={minimalStyles.section}>
            <Text style={minimalStyles.sectionTitle}>Projects</Text>
            {data.projects.map((project, index) => (
              <View key={index} style={minimalStyles.entry}>
                <Text style={minimalStyles.entryTitle}>{project.name}</Text>
                {project.description ? (
                  <Text style={minimalStyles.paragraph}>
                    {project.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

const modernStyles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#171717",
    flexDirection: "row",
  },
  sidebar: { width: "32%", paddingRight: 16 },
  main: { width: "68%" },
  name: { fontSize: 16, fontWeight: 700 },
  contact: { fontSize: 8.5, color: "#525252", marginTop: 2 },
  sectionTitle: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#737373",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
  },
  listItem: { fontSize: 9, marginTop: 2, color: "#404040" },
  entry: { marginTop: 8 },
  entryHeaderRow: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontSize: 10, fontWeight: 700 },
  entryMeta: { fontSize: 8.5, color: "#737373" },
  bullet: { fontSize: 9.5, marginTop: 2, lineHeight: 1.4 },
  paragraph: { fontSize: 9.5, lineHeight: 1.5, color: "#404040" },
});

function ModernPdfDocument({ data }: { data: ResumeData }) {
  return (
    <Document>
      <Page size="A4" style={modernStyles.page}>
        <View style={modernStyles.sidebar}>
          <Text style={modernStyles.name}>{resumeDisplayName(data)}</Text>
          {data.contact.email ? (
            <Text style={modernStyles.contact}>{data.contact.email}</Text>
          ) : null}
          {data.contact.phone ? (
            <Text style={modernStyles.contact}>{data.contact.phone}</Text>
          ) : null}
          {data.contact.location ? (
            <Text style={modernStyles.contact}>{data.contact.location}</Text>
          ) : null}

          {data.skills.length > 0 ? (
            <>
              <Text style={modernStyles.sectionTitle}>Skills</Text>
              {data.skills.map((skill) => (
                <Text key={skill} style={modernStyles.listItem}>
                  {skill}
                </Text>
              ))}
            </>
          ) : null}

          {data.education.length > 0 ? (
            <>
              <Text style={modernStyles.sectionTitle}>Education</Text>
              {data.education.map((entry, index) => (
                <View key={index} style={{ marginTop: 4 }}>
                  <Text style={modernStyles.listItem}>
                    {entry.institution}
                  </Text>
                  {entry.degree ? (
                    <Text style={modernStyles.listItem}>{entry.degree}</Text>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}
        </View>

        <View style={modernStyles.main}>
          {data.summary ? (
            <View>
              <Text style={modernStyles.sectionTitle}>Summary</Text>
              <Text style={modernStyles.paragraph}>{data.summary}</Text>
            </View>
          ) : null}

          {data.experience.length > 0 ? (
            <View>
              <Text style={modernStyles.sectionTitle}>Experience</Text>
              {data.experience.map((entry, index) => (
                <View key={index} style={modernStyles.entry}>
                  <View style={modernStyles.entryHeaderRow}>
                    <Text style={modernStyles.entryTitle}>
                      {entry.title} · {entry.company}
                    </Text>
                    <Text style={modernStyles.entryMeta}>
                      {formatDateRange(
                        entry.startDate,
                        entry.endDate,
                        entry.current,
                      )}
                    </Text>
                  </View>
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <Text key={bulletIndex} style={modernStyles.bullet}>
                      • {bullet}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

const PDF_TEMPLATES: Record<
  ResumeTemplateId,
  (props: { data: ResumeData }) => React.ReactElement
> = {
  minimal: MinimalPdfDocument,
  modern: ModernPdfDocument,
};

export function getPdfDocument(templateId: ResumeTemplateId, data: ResumeData) {
  const Template = PDF_TEMPLATES[templateId];
  return <Template data={data} />;
}
