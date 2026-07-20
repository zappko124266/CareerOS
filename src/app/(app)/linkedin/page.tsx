import type { Metadata } from "next";

import { LinkedInStudio } from "@/components/linkedin/linkedin-studio";
import { toLinkedInAnalysisOutput } from "@/features/linkedin-profile/format";
import {
  getLatestLinkedInAnalysis,
  getLinkedInProfile,
  listLinkedInProfileVersions,
} from "@/features/linkedin-profile/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "LinkedIn Profile" };

export default async function LinkedInPage() {
  const user = await verifySession();

  const [profile, versions, latestAnalysis] = await Promise.all([
    getLinkedInProfile(user.id),
    listLinkedInProfileVersions(user.id),
    getLatestLinkedInAnalysis(user.id),
  ]);

  return (
    <LinkedInStudio
      profile={profile}
      versions={versions}
      latestAnalysis={latestAnalysis ? toLinkedInAnalysisOutput(latestAnalysis) : null}
    />
  );
}
