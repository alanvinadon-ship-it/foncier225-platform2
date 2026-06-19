import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { erpUserProfiles, users } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { createAuditEvent } from "../db";

// ============================================================
// ERP PROFILE ROUTER — Sprint 15
// ============================================================

const DEFAULT_PREFERENCES = {
  language: "fr",
  timezone: "Africa/Abidjan",
  dateFormat: "DD/MM/YYYY",
  currency: "XOF",
  emailNotifications: true,
  pushNotifications: true,
  theme: "system",
};

const DEFAULT_SECURITY = {
  twoFactorEnabled: false,
  sessionTimeout: 30,
  loginAlerts: true,
  lastPasswordChange: null as number | null,
};

export const erpProfileRouter = router({
  /**
   * GET profile — Récupérer le profil complet de l'utilisateur connecté
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [profile] = await db
      .select()
      .from(erpUserProfiles)
      .where(eq(erpUserProfiles.userId, ctx.user.id))
      .limit(1);

    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!profile) {
      // Auto-create profile on first access
      const now = Date.now();
      await db.insert(erpUserProfiles).values({
        userId: ctx.user.id,
        preferences: DEFAULT_PREFERENCES,
        securitySettings: DEFAULT_SECURITY,
        createdAt: now,
        updatedAt: now,
      });
      return {
        user,
        phone: null,
        company: null,
        position: null,
        avatarUrl: null,
        preferences: DEFAULT_PREFERENCES,
        securitySettings: DEFAULT_SECURITY,
      };
    }

    return {
      user,
      phone: profile.phone,
      company: profile.company,
      position: profile.position,
      avatarUrl: profile.avatarUrl,
      preferences: profile.preferences || DEFAULT_PREFERENCES,
      securitySettings: profile.securitySettings || DEFAULT_SECURITY,
    };
  }),

  /**
   * PUT profile — Modifier nom, téléphone, entreprise, poste
   */
  update: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128).optional(),
      phone: z.string().max(32).optional(),
      company: z.string().max(255).optional(),
      position: z.string().max(128).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = Date.now();

      // Update user name if provided
      if (input.name) {
        await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.user.id));
      }

      // Ensure profile exists
      const [existing] = await db
        .select({ id: erpUserProfiles.id })
        .from(erpUserProfiles)
        .where(eq(erpUserProfiles.userId, ctx.user.id))
        .limit(1);

      if (!existing) {
        await db.insert(erpUserProfiles).values({
          userId: ctx.user.id,
          phone: input.phone || null,
          company: input.company || null,
          position: input.position || null,
          preferences: DEFAULT_PREFERENCES,
          securitySettings: DEFAULT_SECURITY,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.update(erpUserProfiles).set({
          phone: input.phone,
          company: input.company,
          position: input.position,
          updatedAt: now,
        }).where(eq(erpUserProfiles.userId, ctx.user.id));
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "erp.profile.update",
        targetType: "user_profile",
        targetId: ctx.user.id,
        details: { fields: Object.keys(input).filter(k => (input as Record<string, unknown>)[k] !== undefined) },
      });

      return { success: true };
    }),

  /**
   * PUT password — Modifier le mot de passe (simulation — OAuth ne gère pas les mots de passe localement)
   */
  updatePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
      confirmPassword: z.string().min(8).max(128),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.newPassword !== input.confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = Date.now();

      // Update security settings with last password change timestamp
      const [existing] = await db
        .select({ id: erpUserProfiles.id, securitySettings: erpUserProfiles.securitySettings })
        .from(erpUserProfiles)
        .where(eq(erpUserProfiles.userId, ctx.user.id))
        .limit(1);

      const currentSecurity = existing?.securitySettings || DEFAULT_SECURITY;
      const updatedSecurity = { ...currentSecurity, lastPasswordChange: now };

      if (!existing) {
        await db.insert(erpUserProfiles).values({
          userId: ctx.user.id,
          securitySettings: updatedSecurity,
          preferences: DEFAULT_PREFERENCES,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.update(erpUserProfiles).set({
          securitySettings: updatedSecurity,
          updatedAt: now,
        }).where(eq(erpUserProfiles.userId, ctx.user.id));
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "erp.profile.password_change",
        targetType: "user_profile",
        targetId: ctx.user.id,
        details: { timestamp: now },
      });

      return { success: true, message: "Mot de passe modifié avec succès" };
    }),

  /**
   * POST avatar — Uploader un avatar
   */
  uploadAvatar: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = Date.now();

      // Upload to S3
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.fileName.split(".").pop() || "png";
      const key = `erp-avatars/${ctx.user.id}-${now}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Ensure profile exists
      const [existing] = await db
        .select({ id: erpUserProfiles.id })
        .from(erpUserProfiles)
        .where(eq(erpUserProfiles.userId, ctx.user.id))
        .limit(1);

      if (!existing) {
        await db.insert(erpUserProfiles).values({
          userId: ctx.user.id,
          avatarUrl: url,
          preferences: DEFAULT_PREFERENCES,
          securitySettings: DEFAULT_SECURITY,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.update(erpUserProfiles).set({
          avatarUrl: url,
          updatedAt: now,
        }).where(eq(erpUserProfiles.userId, ctx.user.id));
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "erp.profile.avatar_upload",
        targetType: "user_profile",
        targetId: ctx.user.id,
        details: { fileName: input.fileName },
      });

      return { success: true, avatarUrl: url };
    }),

  /**
   * GET preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [profile] = await db
      .select({ preferences: erpUserProfiles.preferences })
      .from(erpUserProfiles)
      .where(eq(erpUserProfiles.userId, ctx.user.id))
      .limit(1);

    return profile?.preferences || DEFAULT_PREFERENCES;
  }),

  /**
   * PUT preferences
   */
  updatePreferences: protectedProcedure
    .input(z.object({
      language: z.string().optional(),
      timezone: z.string().optional(),
      dateFormat: z.string().optional(),
      currency: z.string().optional(),
      emailNotifications: z.boolean().optional(),
      pushNotifications: z.boolean().optional(),
      theme: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const now = Date.now();

      const [existing] = await db
        .select({ id: erpUserProfiles.id, preferences: erpUserProfiles.preferences })
        .from(erpUserProfiles)
        .where(eq(erpUserProfiles.userId, ctx.user.id))
        .limit(1);

      const currentPrefs = existing?.preferences || DEFAULT_PREFERENCES;
      const updatedPrefs = { ...currentPrefs };
      if (input.language !== undefined) updatedPrefs.language = input.language;
      if (input.timezone !== undefined) updatedPrefs.timezone = input.timezone;
      if (input.dateFormat !== undefined) updatedPrefs.dateFormat = input.dateFormat;
      if (input.currency !== undefined) updatedPrefs.currency = input.currency;
      if (input.emailNotifications !== undefined) updatedPrefs.emailNotifications = input.emailNotifications;
      if (input.pushNotifications !== undefined) updatedPrefs.pushNotifications = input.pushNotifications;
      if (input.theme !== undefined) updatedPrefs.theme = input.theme;

      if (!existing) {
        await db.insert(erpUserProfiles).values({
          userId: ctx.user.id,
          preferences: updatedPrefs,
          securitySettings: DEFAULT_SECURITY,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await db.update(erpUserProfiles).set({
          preferences: updatedPrefs,
          updatedAt: now,
        }).where(eq(erpUserProfiles.userId, ctx.user.id));
      }

      await createAuditEvent({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: "erp.profile.preferences_update",
        targetType: "user_profile",
        targetId: ctx.user.id,
        details: { changed: Object.keys(input).filter(k => (input as Record<string, unknown>)[k] !== undefined) },
      });

      return { success: true, preferences: updatedPrefs };
    }),
});
