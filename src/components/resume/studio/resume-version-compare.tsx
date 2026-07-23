import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  ResumeCertification,
  ResumeData,
  ResumeEducation,
} from "@/features/resume/schema";

function diffTextList(before: string[], after: string[]) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((item) => !beforeSet.has(item)),
    removed: before.filter((item) => !afterSet.has(item)),
  };
}

/** Structural entries (education/certifications) don't carry a stable ID,
 * so entries are matched by their natural key (institution/name) — an
 * entry present under the same key in both versions but with different
 * details counts as "changed" rather than one remove + one add. */
function diffByKey<T>(
  before: T[],
  after: T[],
  keyOf: (item: T) => string,
  didChange: (before: T, after: T) => boolean,
) {
  const beforeByKey = new Map(before.map((item) => [keyOf(item), item]));
  const afterByKey = new Map(after.map((item) => [keyOf(item), item]));

  const added: T[] = [];
  const changed: T[] = [];
  for (const [key, afterItem] of afterByKey) {
    const beforeItem = beforeByKey.get(key);
    if (!beforeItem) {
      added.push(afterItem);
    } else if (didChange(beforeItem, afterItem)) {
      changed.push(afterItem);
    }
  }

  const removed: T[] = [];
  for (const [key, beforeItem] of beforeByKey) {
    if (!afterByKey.has(key)) removed.push(beforeItem);
  }

  return { added, removed, changed };
}

function educationLabel(entry: ResumeEducation) {
  return [entry.degree, entry.field].filter(Boolean).join(", ") || entry.institution;
}

function certificationLabel(entry: ResumeCertification) {
  return entry.issuer ? `${entry.name} (${entry.issuer})` : entry.name;
}

/**
 * A real structural comparison — every section below is a genuine
 * added/removed/changed computation over the parsed resume's arrays
 * (`Set` difference for free-text bullets/skills, key-matched diffing for
 * education/certifications), not just before/after counts. No text-diff
 * library is used: resume content is already structured data, so plain
 * array/Set comparison is enough.
 */
export function ResumeVersionCompare({
  currentData,
  versionLabel,
  versionData,
}: {
  currentData: ResumeData;
  versionLabel: string;
  versionData: ResumeData;
}) {
  const skillsDiff = diffTextList(versionData.skills, currentData.skills);

  const experienceBulletsDiff = diffTextList(
    versionData.experience.flatMap((entry) => entry.bullets),
    currentData.experience.flatMap((entry) => entry.bullets),
  );

  const projectBulletsDiff = diffTextList(
    versionData.projects.flatMap((entry) => entry.bullets),
    currentData.projects.flatMap((entry) => entry.bullets),
  );

  const educationDiff = diffByKey(
    versionData.education,
    currentData.education,
    (entry) => entry.institution,
    (before, after) =>
      before.degree !== after.degree ||
      before.field !== after.field ||
      before.startDate !== after.startDate ||
      before.endDate !== after.endDate,
  );

  const certificationsDiff = diffByKey(
    versionData.certifications,
    currentData.certifications,
    (entry) => entry.name,
    (before, after) => before.issuer !== after.issuer || before.date !== after.date,
  );

  const summaryChanged = (versionData.summary ?? "") !== (currentData.summary ?? "");

  const changeSections = [
    {
      label: "Skills",
      ...skillsDiff,
      changed: [] as string[],
      renderItem: (item: string) => item,
    },
    {
      label: "Experience bullets",
      ...experienceBulletsDiff,
      changed: [] as string[],
      renderItem: (item: string) => item,
    },
    {
      label: "Project bullets",
      ...projectBulletsDiff,
      changed: [] as string[],
      renderItem: (item: string) => item,
    },
    {
      label: "Education",
      added: educationDiff.added.map(educationLabel),
      removed: educationDiff.removed.map(educationLabel),
      changed: educationDiff.changed.map(educationLabel),
      renderItem: (item: string) => item,
    },
    {
      label: "Certifications",
      added: certificationsDiff.added.map(certificationLabel),
      removed: certificationsDiff.removed.map(certificationLabel),
      changed: certificationsDiff.changed.map(certificationLabel),
      renderItem: (item: string) => item,
    },
  ].filter(
    (section) => section.added.length > 0 || section.removed.length > 0 || section.changed.length > 0,
  );

  const hasAnyChange = summaryChanged || changeSections.length > 0;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">
          Comparing &quot;{versionLabel}&quot; to your current draft
        </h2>

        {!hasAnyChange && (
          <p className="text-muted-foreground text-sm">
            No structural differences — the content is identical.
          </p>
        )}

        {summaryChanged && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_1fr]">
            <p className="text-muted-foreground text-xs font-medium sm:pt-1">Summary</p>
            <p className="wrap-break-word text-sm line-through">{versionData.summary || "—"}</p>
            <p className="wrap-break-word text-sm font-medium">{currentData.summary || "—"}</p>
          </div>
        )}

        {changeSections.map((section) => (
          <div key={section.label}>
            <p className="text-muted-foreground text-xs font-medium">{section.label} changed</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {section.added.map((item, index) => (
                <Badge key={`added-${section.label}-${index}`} variant="secondary">
                  + {section.renderItem(item)}
                </Badge>
              ))}
              {section.removed.map((item, index) => (
                <Badge key={`removed-${section.label}-${index}`} variant="outline">
                  − {section.renderItem(item)}
                </Badge>
              ))}
              {section.changed.map((item, index) => (
                <Badge key={`changed-${section.label}-${index}`} variant="outline">
                  ~ {section.renderItem(item)}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
