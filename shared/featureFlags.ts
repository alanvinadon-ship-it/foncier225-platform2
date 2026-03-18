/**
 * Feature Flags System
 * Centralized feature flag configuration for gradual rollout.
 *
 * Supports both server-side env vars (`FLAG=true`) and Vite-style env vars
 * (`VITE_FLAG=true`) so the same helper can be reused safely on both sides.
 */

function readBooleanFlag(name: string): boolean {
  return process.env[name] === "true" || process.env[`VITE_${name}`] === "true";
}

export const FEATURE_FLAGS = {
  get CREDIT_WORKFLOW_ENABLED() {
    return readBooleanFlag("CREDIT_WORKFLOW_ENABLED");
  },
  get DOCUMENT_GENERATION_ENABLED() {
    return readBooleanFlag("DOCUMENT_GENERATION_ENABLED");
  },
  get BANK_PORTAL_ENABLED() {
    return readBooleanFlag("BANK_PORTAL_ENABLED");
  },
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

export function getEnabledFeatures(): Record<FeatureFlag, boolean> {
  return { ...FEATURE_FLAGS };
}
