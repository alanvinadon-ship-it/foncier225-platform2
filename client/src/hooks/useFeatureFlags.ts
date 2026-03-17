import { trpc } from "@/lib/trpc";

export function useFeatureFlags() {
  const { data: flags, isLoading } = trpc.system.featureFlags.useQuery();

  return {
    creditWorkflowEnabled: flags?.creditWorkflowEnabled ?? false,
    documentGenerationEnabled: flags?.documentGenerationEnabled ?? false,
    bankPortalEnabled: flags?.bankPortalEnabled ?? false,
    isLoading,
  };
}
