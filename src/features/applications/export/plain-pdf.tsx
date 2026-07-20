import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#171717" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 16 },
  paragraph: { marginBottom: 10, lineHeight: 1.5 },
});

/**
 * Generic single-column text-document PDF — reused by Cover Letter, Email,
 * and Recruiter Message export, since none of the three need a resume's
 * multi-section layout. Splits on blank lines so paragraph breaks in the
 * editor are preserved as paragraph breaks in the PDF.
 */
function PlainDocumentPdf({ title, body }: { title: string; body: string }) {
  const paragraphs = body.split(/\n{2,}/).filter((paragraph) => paragraph.trim());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        {paragraphs.map((paragraph, index) => (
          <View key={index} style={styles.paragraph}>
            <Text>{paragraph.trim()}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderPlainDocumentPdf(title: string, body: string): Promise<Buffer> {
  return renderToBuffer(<PlainDocumentPdf title={title} body={body} />);
}
