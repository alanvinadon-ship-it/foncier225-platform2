import { z } from "zod";
import { FEATURE_FLAGS } from "@shared/featureFlags";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  featureFlags: publicProcedure.query(() => ({
    creditWorkflowEnabled: FEATURE_FLAGS.CREDIT_WORKFLOW_ENABLED,
    documentGenerationEnabled: FEATURE_FLAGS.DOCUMENT_GENERATION_ENABLED,
    bankPortalEnabled: FEATURE_FLAGS.BANK_PORTAL_ENABLED,
  })),
});
