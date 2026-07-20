import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ResumeData } from "@/features/resume/schema";

function diffSkills(before: string[], after: string[]) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: after.filter((skill) => !beforeSet.has(skill)),
    removed: before.filter((skill) => !afterSet.has(skill)),
  };
}

/**
 * A structural comparison, not a line-by-line text diff — counts and
 * skill-set differences are real, computed values; there's no pretense of
 * word-level diffing here (that would need a diff library this sprint
 * doesn't include).
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
  const skillsDiff = diffSkills(versionData.skills, currentData.skills);

  const rows = [
    {
      label: "Summary",
      before: versionData.summary || "—",
      after: currentData.summary || "—",
    },
    {
      label: "Experience entries",
      before: String(versionData.experience.length),
      after: String(currentData.experience.length),
    },
    {
      label: "Education entries",
      before: String(versionData.education.length),
      after: String(currentData.education.length),
    },
    {
      label: "Certifications",
      before: String(versionData.certifications.length),
      after: String(currentData.certifications.length),
    },
    {
      label: "Projects",
      before: String(versionData.projects.length),
      after: String(currentData.projects.length),
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">
          Comparing &quot;{versionLabel}&quot; to your current draft
        </h2>

        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-1 gap-2 sm:grid-cols-[8rem_1fr_1fr]">
              <p className="text-muted-foreground text-xs font-medium sm:pt-1">
                {row.label}
              </p>
              <p className="wrap-break-word text-sm">{row.before}</p>
              <p className="wrap-break-word text-sm font-medium">{row.after}</p>
            </div>
          ))}
        </div>

        {(skillsDiff.added.length > 0 || skillsDiff.removed.length > 0) && (
          <div>
            <p className="text-muted-foreground text-xs font-medium">
              Skills changed
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {skillsDiff.added.map((skill) => (
                <Badge key={`added-${skill}`} variant="secondary">
                  + {skill}
                </Badge>
              ))}
              {skillsDiff.removed.map((skill) => (
                <Badge key={`removed-${skill}`} variant="outline">
                  − {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
