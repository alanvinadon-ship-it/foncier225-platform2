/**
 * Feature Flags System
 * Centralized feature flag configuration for gradual rollout
 */

export const FEATURE_FLAGS = {
  CREDIT_WORKFLOW_ENABLED: process.env.VITE_CREDIT_WORKFLOW_ENABLED === 'true',
  DOCUMENT_GENERATION_ENABLED: process.env.VITE_DOCUMENT_GENERATION_ENABLED === 'true',
  BANK_PORTAL_ENABLED: process.env.VITE_BANK_PORTAL_ENABLED === 'true',
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

export function getEnabledFeatures(): Record<FeatureFlag, boolean> {
  return { ...FEATURE_FLAGS };
}
