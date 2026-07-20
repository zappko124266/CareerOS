/** Sprint 10, Module 3 — presentational-only categorization of missing
 * skill/requirement strings into Skills / Tools / Certifications. Plain
 * keyword matching, not AI — a curated, necessarily non-exhaustive list,
 * so anything that doesn't match a known certification or tool pattern
 * defaults to the broad "Skills" bucket rather than guessing. No new AI
 * call, no new data — purely a different view over the same
 * `missingSkills`/`unmatchedRequirements` strings `computeMatch`/
 * `analyzeJobMatch` already produce. */

const CERTIFICATION_PATTERN =
  /certif|licens(e|ure)|\b(PMP|CISSP|CISA|CISM|CFA|CPA|CCNA|CCNP|CCIE|CSM|PSM|ITIL|Six Sigma|CompTIA|CKA|CKAD)\b/i;

const KNOWN_TOOLS = [
  "aws",
  "azure",
  "gcp",
  "google cloud",
  "kubernetes",
  "docker",
  "terraform",
  "jenkins",
  "git",
  "github",
  "gitlab",
  "jira",
  "figma",
  "salesforce",
  "tableau",
  "power bi",
  "excel",
  "sql",
  "postgresql",
  "mysql",
  "mongodb",
  "redis",
  "kafka",
  "spark",
  "hadoop",
  "react",
  "angular",
  "vue",
  "node.js",
  "nodejs",
  "python",
  "java",
  "typescript",
  "javascript",
  "go",
  "rust",
  "graphql",
  "rest api",
  "grpc",
  "linux",
  "unix",
  "bash",
  "ansible",
  "puppet",
  "chef",
  "prometheus",
  "grafana",
  "datadog",
  "splunk",
  "webpack",
  "next.js",
  "nextjs",
];

export interface CategorizedRequirements {
  skills: string[];
  tools: string[];
  certifications: string[];
}

export function categorizeRequirements(requirements: string[]): CategorizedRequirements {
  const result: CategorizedRequirements = { skills: [], tools: [], certifications: [] };

  for (const requirement of requirements) {
    const normalized = requirement.toLowerCase();
    if (CERTIFICATION_PATTERN.test(requirement)) {
      result.certifications.push(requirement);
    } else if (KNOWN_TOOLS.some((tool) => normalized.includes(tool))) {
      result.tools.push(requirement);
    } else {
      result.skills.push(requirement);
    }
  }

  return result;
}
