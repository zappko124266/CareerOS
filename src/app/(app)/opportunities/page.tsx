import type { Metadata } from "next";

import { DiscoveryWorkspace } from "@/components/opportunities/discovery-workspace";
import { getAllProviders } from "@/features/opportunities/providers/registry";
import { getSavedSourceIds } from "@/features/opportunities/queries";
import { verifySession } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const user = await verifySession();

  const [providers, savedSourceIds] = await Promise.all([
    getAllProviders(),
    getSavedSourceIds(user.id),
  ]);

  const providerAvailability = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    configured: provider.isConfigured(),
  }));

  return (
    <DiscoveryWorkspace
      providers={providerAvailability}
      initialSavedSourceIds={Array.from(savedSourceIds)}
    />
  );
}
