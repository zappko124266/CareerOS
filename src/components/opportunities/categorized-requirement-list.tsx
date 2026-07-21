import { Badge } from "@/components/ui/badge";
import { categorizeRequirements } from "@/features/opportunities/requirement-categories";

/**
 * Groups missing/unmatched requirement strings into Skills / Tools /
 * Certifications for display — reused by both `MatchPanel`'s AI match
 * analysis and the Opportunity Intelligence Summary, so this
 * presentational categorization only lives in one place.
 */
export function CategorizedRequirementList({ requirements }: { requirements: string[] }) {
  const { skills, tools, certifications } = categorizeRequirements(requirements);
  const groups: { label: string; items: string[] }[] = [
    { label: "Missing skills", items: skills },
    { label: "Missing tools", items: tools },
    { label: "Missing certifications", items: certifications },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="text-sm font-medium">{group.label}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.items.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
