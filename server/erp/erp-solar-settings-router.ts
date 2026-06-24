/**
 * ERP Solar Settings Router
 * Gestion du paramétrage global, projet/site, formules versionnées et historique calculs
 */
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import {
  erpSolarGlobalSettings,
  erpSolarSiteSettings,
  erpSolarCalculationFormulas,
  erpSolarCalculationRuns,
  erpSolarBudgetParameters,
  erpSolarAuditLogs,
} from "../../drizzle/schema";

// ============================================================
// HELPERS
// ============================================================

async function createAuditLog(params: {
  solarProjectId?: number;
  userId: number;
  action: string;
  module: string;
  parameterCode?: string;
  oldValue?: string;
  newValue?: string;
  justification?: string;
  metadata?: string;
}) {
  const db = (await getDb())!;
  await db.insert(erpSolarAuditLogs).values({
    ...params,
    createdAt: Date.now(),
  });
}

// ============================================================
// GLOBAL SETTINGS ROUTER
// ============================================================

const globalSettingsRouter = router({
  list: protectedProcedure
    .input(z.object({ group: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const all = await db.select().from(erpSolarGlobalSettings).orderBy(erpSolarGlobalSettings.parameterGroup, erpSolarGlobalSettings.parameterCode);
      if (input?.group) {
        return all.filter((p: any) => p.parameterGroup === input.group);
      }
      return all;
    }),

  getByCode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [param] = await db.select().from(erpSolarGlobalSettings).where(eq(erpSolarGlobalSettings.parameterCode, input.code));
      return param ?? null;
    }),

  upsert: protectedProcedure
    .input(z.object({
      parameterCode: z.string(),
      parameterName: z.string(),
      parameterGroup: z.string(),
      parameterValue: z.number(),
      unit: z.string().optional(),
      description: z.string().optional(),
      minValue: z.number().optional(),
      maxValue: z.number().optional(),
      dataType: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const existing = await db.select().from(erpSolarGlobalSettings).where(eq(erpSolarGlobalSettings.parameterCode, input.parameterCode));
      
      if (existing.length > 0) {
        const oldValue = existing[0].parameterValue;
        await db.update(erpSolarGlobalSettings)
          .set({
            parameterName: input.parameterName,
            parameterGroup: input.parameterGroup,
            parameterValue: String(input.parameterValue),
            unit: input.unit,
            description: input.description,
            minValue: input.minValue != null ? String(input.minValue) : null,
            maxValue: input.maxValue != null ? String(input.maxValue) : null,
            dataType: input.dataType,
            lastModifiedBy: ctx.user.id,
            updatedAt: now,
          })
          .where(eq(erpSolarGlobalSettings.parameterCode, input.parameterCode));
        
        await createAuditLog({
          userId: ctx.user.id,
          action: "update_global_setting",
          module: "solar_settings",
          parameterCode: input.parameterCode,
          oldValue: String(oldValue),
          newValue: String(input.parameterValue),
        });
        return { action: "updated" as const };
      } else {
        await db.insert(erpSolarGlobalSettings).values({
          parameterCode: input.parameterCode,
          parameterName: input.parameterName,
          parameterGroup: input.parameterGroup,
          parameterValue: String(input.parameterValue),
          unit: input.unit,
          description: input.description,
          minValue: input.minValue != null ? String(input.minValue) : null,
          maxValue: input.maxValue != null ? String(input.maxValue) : null,
          dataType: input.dataType || "number",
          lastModifiedBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        });
        
        await createAuditLog({
          userId: ctx.user.id,
          action: "create_global_setting",
          module: "solar_settings",
          parameterCode: input.parameterCode,
          newValue: String(input.parameterValue),
        });
        return { action: "created" as const };
      }
    }),

  resetDefaults: protectedProcedure
    .mutation(async ({ ctx }) => {
      const db = (await getDb())!;
      await createAuditLog({
        userId: ctx.user.id,
        action: "reset_global_defaults",
        module: "solar_settings",
      });
      await db.delete(erpSolarGlobalSettings);
      await seedGlobalDefaults(ctx.user.id);
      return { success: true };
    }),

  listGroups: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const all = await db.select().from(erpSolarGlobalSettings);
    const groups = Array.from(new Set(all.map((p: any) => p.parameterGroup)));
    return groups.sort();
  }),
});

// ============================================================
// SITE SETTINGS ROUTER (overrides par projet)
// ============================================================

const siteSettingsRouter = router({
  list: protectedProcedure
    .input(z.object({ solarProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSolarSiteSettings)
        .where(eq(erpSolarSiteSettings.solarProjectId, input.solarProjectId))
        .orderBy(erpSolarSiteSettings.parameterCode);
    }),

  upsert: protectedProcedure
    .input(z.object({
      solarProjectId: z.number(),
      parameterCode: z.string(),
      overrideValue: z.number(),
      justification: z.string().optional(),
      source: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const existing = await db.select().from(erpSolarSiteSettings)
        .where(and(
          eq(erpSolarSiteSettings.solarProjectId, input.solarProjectId),
          eq(erpSolarSiteSettings.parameterCode, input.parameterCode)
        ));
      
      if (existing.length > 0) {
        const oldValue = existing[0].overrideValue;
        await db.update(erpSolarSiteSettings)
          .set({
            overrideValue: String(input.overrideValue),
            justification: input.justification,
            source: input.source,
            updatedAt: now,
          })
          .where(eq(erpSolarSiteSettings.id, existing[0].id));
        
        await createAuditLog({
          solarProjectId: input.solarProjectId,
          userId: ctx.user.id,
          action: "update_site_setting",
          module: "solar_settings",
          parameterCode: input.parameterCode,
          oldValue: String(oldValue),
          newValue: String(input.overrideValue),
          justification: input.justification,
        });
        return { action: "updated" as const };
      } else {
        await db.insert(erpSolarSiteSettings).values({
          solarProjectId: input.solarProjectId,
          parameterCode: input.parameterCode,
          overrideValue: String(input.overrideValue),
          justification: input.justification,
          source: input.source,
          createdBy: ctx.user.id,
          createdAt: now,
          updatedAt: now,
        });
        
        await createAuditLog({
          solarProjectId: input.solarProjectId,
          userId: ctx.user.id,
          action: "create_site_setting",
          module: "solar_settings",
          parameterCode: input.parameterCode,
          newValue: String(input.overrideValue),
          justification: input.justification,
        });
        return { action: "created" as const };
      }
    }),

  resetToGlobal: protectedProcedure
    .input(z.object({
      solarProjectId: z.number(),
      parameterCode: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      await db.delete(erpSolarSiteSettings)
        .where(and(
          eq(erpSolarSiteSettings.solarProjectId, input.solarProjectId),
          eq(erpSolarSiteSettings.parameterCode, input.parameterCode)
        ));
      
      await createAuditLog({
        solarProjectId: input.solarProjectId,
        userId: ctx.user.id,
        action: "reset_to_global",
        module: "solar_settings",
        parameterCode: input.parameterCode,
      });
      return { success: true };
    }),

  getAllEffective: protectedProcedure
    .input(z.object({ solarProjectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const globals = await db.select().from(erpSolarGlobalSettings);
      const overrides = await db.select().from(erpSolarSiteSettings)
        .where(eq(erpSolarSiteSettings.solarProjectId, input.solarProjectId));
      
      const overrideMap = new Map(overrides.map((o: any) => [o.parameterCode, o]));
      
      return globals.map((g: any) => {
        const override = overrideMap.get(g.parameterCode) as any;
        return {
          parameterCode: g.parameterCode,
          parameterName: g.parameterName,
          parameterGroup: g.parameterGroup,
          globalValue: Number(g.parameterValue),
          effectiveValue: override ? Number(override.overrideValue) : Number(g.parameterValue),
          isOverridden: !!override,
          justification: override?.justification ?? null,
          source: override?.source ?? null,
          unit: g.unit,
          description: g.description,
        };
      });
    }),
});

// ============================================================
// FORMULAS ROUTER
// ============================================================

const formulasRouter = router({
  list: protectedProcedure
    .input(z.object({ group: z.string().optional(), status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      let all = await db.select().from(erpSolarCalculationFormulas).orderBy(desc(erpSolarCalculationFormulas.version));
      if (input?.group) all = all.filter((f: any) => f.formulaGroup === input.group);
      if (input?.status) all = all.filter((f: any) => f.status === input.status);
      return all;
    }),

  create: protectedProcedure
    .input(z.object({
      formulaCode: z.string(),
      formulaName: z.string(),
      formulaGroup: z.string(),
      expression: z.string(),
      description: z.string().optional(),
      inputParameters: z.string().optional(),
      outputUnit: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const existing = await db.select().from(erpSolarCalculationFormulas)
        .where(eq(erpSolarCalculationFormulas.formulaCode, input.formulaCode))
        .orderBy(desc(erpSolarCalculationFormulas.version));
      
      const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;
      
      const [result] = await db.insert(erpSolarCalculationFormulas).values({
        formulaCode: input.formulaCode,
        formulaName: input.formulaName,
        formulaGroup: input.formulaGroup,
        version: nextVersion,
        expression: input.expression,
        description: input.description,
        inputParameters: input.inputParameters,
        outputUnit: input.outputUnit,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      
      await createAuditLog({
        userId: ctx.user.id,
        action: "create_formula",
        module: "solar_formulas",
        parameterCode: input.formulaCode,
        newValue: `v${nextVersion}`,
      });
      
      return { id: result.insertId, version: nextVersion };
    }),

  activate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [formula] = await db.select().from(erpSolarCalculationFormulas).where(eq(erpSolarCalculationFormulas.id, input.id));
      if (!formula) throw new Error("Formule introuvable");
      
      const others = await db.select().from(erpSolarCalculationFormulas)
        .where(eq(erpSolarCalculationFormulas.formulaCode, formula.formulaCode));
      for (const other of others) {
        if (other.id !== input.id && other.status === "active") {
          await db.update(erpSolarCalculationFormulas)
            .set({ status: "deprecated", updatedAt: now })
            .where(eq(erpSolarCalculationFormulas.id, other.id));
        }
      }
      
      await db.update(erpSolarCalculationFormulas)
        .set({ status: "active", activatedAt: now, activatedBy: ctx.user.id, updatedAt: now })
        .where(eq(erpSolarCalculationFormulas.id, input.id));
      
      await createAuditLog({
        userId: ctx.user.id,
        action: "activate_formula",
        module: "solar_formulas",
        parameterCode: formula.formulaCode,
        newValue: `v${formula.version}`,
      });
      
      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [formula] = await db.select().from(erpSolarCalculationFormulas).where(eq(erpSolarCalculationFormulas.id, input.id));
      if (!formula) throw new Error("Formule introuvable");
      
      const existing = await db.select().from(erpSolarCalculationFormulas)
        .where(eq(erpSolarCalculationFormulas.formulaCode, formula.formulaCode))
        .orderBy(desc(erpSolarCalculationFormulas.version));
      const nextVersion = existing[0].version + 1;
      
      const [result] = await db.insert(erpSolarCalculationFormulas).values({
        formulaCode: formula.formulaCode,
        formulaName: formula.formulaName,
        formulaGroup: formula.formulaGroup,
        version: nextVersion,
        expression: formula.expression,
        description: formula.description,
        inputParameters: formula.inputParameters,
        outputUnit: formula.outputUnit,
        status: "draft",
        createdBy: ctx.user.id,
        createdAt: now,
        updatedAt: now,
      });
      
      return { id: result.insertId, version: nextVersion };
    }),
});

// ============================================================
// CALCULATION RUNS ROUTER
// ============================================================

const calculationRunsRouter = router({
  list: protectedProcedure
    .input(z.object({ solarProjectId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const runs = await db.select().from(erpSolarCalculationRuns)
        .where(eq(erpSolarCalculationRuns.solarProjectId, input.solarProjectId))
        .orderBy(desc(erpSolarCalculationRuns.createdAt));
      return input.limit ? runs.slice(0, input.limit) : runs;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [run] = await db.select().from(erpSolarCalculationRuns).where(eq(erpSolarCalculationRuns.id, input.id));
      return run ?? null;
    }),
});

// ============================================================
// BUDGET PARAMETERS ROUTER
// ============================================================

const budgetParametersRouter = router({
  list: protectedProcedure
    .input(z.object({ solarProjectId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const all = await db.select().from(erpSolarBudgetParameters);
      if (input?.solarProjectId) {
        const projectParams = all.filter((p: any) => p.solarProjectId === input.solarProjectId);
        const globalParams = all.filter((p: any) => p.isGlobal);
        const projectCodes = new Set(projectParams.map((p: any) => p.parameterCode));
        const merged = [...projectParams, ...globalParams.filter((g: any) => !projectCodes.has(g.parameterCode))];
        return merged;
      }
      return all.filter((p: any) => p.isGlobal);
    }),

  upsert: protectedProcedure
    .input(z.object({
      solarProjectId: z.number().optional(),
      parameterCode: z.string(),
      parameterName: z.string(),
      parameterValue: z.number(),
      unit: z.string().optional(),
      description: z.string().optional(),
      isGlobal: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const isGlobal = input.isGlobal ?? (input.solarProjectId == null);
      
      let existing: any[];
      if (input.solarProjectId) {
        existing = await db.select().from(erpSolarBudgetParameters)
          .where(and(
            eq(erpSolarBudgetParameters.solarProjectId, input.solarProjectId),
            eq(erpSolarBudgetParameters.parameterCode, input.parameterCode)
          ));
      } else {
        existing = await db.select().from(erpSolarBudgetParameters)
          .where(and(
            eq(erpSolarBudgetParameters.parameterCode, input.parameterCode),
            eq(erpSolarBudgetParameters.isGlobal, true)
          ));
      }
      
      if (existing.length > 0) {
        await db.update(erpSolarBudgetParameters)
          .set({
            parameterName: input.parameterName,
            parameterValue: String(input.parameterValue),
            unit: input.unit,
            description: input.description,
            updatedAt: now,
          })
          .where(eq(erpSolarBudgetParameters.id, existing[0].id));
        
        await createAuditLog({
          solarProjectId: input.solarProjectId,
          userId: ctx.user.id,
          action: "update_budget_parameter",
          module: "solar_budget",
          parameterCode: input.parameterCode,
          oldValue: String(existing[0].parameterValue),
          newValue: String(input.parameterValue),
        });
        return { action: "updated" as const };
      } else {
        await db.insert(erpSolarBudgetParameters).values({
          solarProjectId: input.solarProjectId ?? null,
          parameterCode: input.parameterCode,
          parameterName: input.parameterName,
          parameterValue: String(input.parameterValue),
          unit: input.unit,
          description: input.description,
          isGlobal: isGlobal,
          createdAt: now,
          updatedAt: now,
        });
        
        await createAuditLog({
          solarProjectId: input.solarProjectId,
          userId: ctx.user.id,
          action: "create_budget_parameter",
          module: "solar_budget",
          parameterCode: input.parameterCode,
          newValue: String(input.parameterValue),
        });
        return { action: "created" as const };
      }
    }),
});

// ============================================================
// AUDIT LOGS ROUTER
// ============================================================

const auditLogsRouter = router({
  list: protectedProcedure
    .input(z.object({
      solarProjectId: z.number().optional(),
      module: z.string().optional(),
      limit: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;
      let all = await db.select().from(erpSolarAuditLogs).orderBy(desc(erpSolarAuditLogs.createdAt));
      if (input?.solarProjectId) all = all.filter((l: any) => l.solarProjectId === input.solarProjectId);
      if (input?.module) all = all.filter((l: any) => l.module === input.module);
      return (input?.limit ? all.slice(0, input.limit) : all.slice(0, 100));
    }),
});

// ============================================================
// EXPORT COMBINED ROUTER
// ============================================================

export const solarSettingsRouter = router({
  global: globalSettingsRouter,
  site: siteSettingsRouter,
  formulas: formulasRouter,
  runs: calculationRunsRouter,
  budget: budgetParametersRouter,
  auditLogs: auditLogsRouter,
});

// ============================================================
// SEED GLOBAL DEFAULTS
// ============================================================

export async function seedGlobalDefaults(userId?: number) {
  const db = (await getDb())!;
  const now = Date.now();
  const defaults = [
    { code: "PSH_DEFAULT", name: "Heures de pic solaire par défaut", group: "resource_solaire", value: 4.5, unit: "h/j", desc: "Peak Sun Hours par défaut (Côte d'Ivoire)" },
    { code: "SHADING_FACTOR", name: "Facteur ombrage par défaut", group: "resource_solaire", value: 1.0, unit: null, desc: "1 = pas d'ombrage" },
    { code: "SOILING_FACTOR", name: "Facteur salissure", group: "resource_solaire", value: 0.95, unit: null, desc: "Perte due à la poussière" },
    { code: "TEMPERATURE_FACTOR", name: "Facteur température", group: "resource_solaire", value: 0.95, unit: null, desc: "Perte due à la chaleur" },
    { code: "GLOBAL_EFFICIENCY", name: "Rendement global système", group: "rendement", value: 0.80, unit: null, desc: "Rendement global du système solaire" },
    { code: "INVERTER_EFFICIENCY", name: "Rendement onduleur", group: "rendement", value: 0.92, unit: null, desc: "Rendement de conversion onduleur" },
    { code: "BATTERY_EFF_LITHIUM", name: "Rendement batterie lithium", group: "rendement", value: 0.95, unit: null, desc: "Rendement aller-retour batterie lithium" },
    { code: "BATTERY_EFF_LEAD", name: "Rendement batterie plomb", group: "rendement", value: 0.85, unit: null, desc: "Rendement aller-retour batterie plomb" },
    { code: "DOD_LITHIUM", name: "DoD lithium", group: "batteries", value: 0.80, unit: null, desc: "Profondeur de décharge max lithium" },
    { code: "DOD_LEAD", name: "DoD plomb", group: "batteries", value: 0.50, unit: null, desc: "Profondeur de décharge max plomb" },
    { code: "AUTONOMY_DAYS", name: "Autonomie par défaut", group: "batteries", value: 2, unit: "jours", desc: "Nombre de jours d'autonomie cible" },
    { code: "PV_SAFETY_MARGIN", name: "Marge panneaux", group: "panneaux", value: 0.15, unit: "%", desc: "Marge de sécurité sur la puissance PV (15%)" },
    { code: "PANEL_UNIT_POWER", name: "Puissance panneau par défaut", group: "panneaux", value: 550, unit: "Wc", desc: "Puissance unitaire du panneau par défaut" },
    { code: "INVERTER_MARGIN", name: "Marge onduleur", group: "onduleur", value: 0.25, unit: "%", desc: "Marge de sécurité onduleur (25%)" },
    { code: "INVERTER_SURGE_MARGIN", name: "Marge surge", group: "onduleur", value: 0.10, unit: "%", desc: "Marge sur la puissance de pointe (10%)" },
    { code: "INVERTER_SURGE_CAPACITY", name: "Capacité surge relative", group: "onduleur", value: 2.0, unit: null, desc: "Rapport surge/continu par défaut" },
    { code: "VOLTAGE_DROP_DC", name: "Chute tension DC", group: "cables", value: 0.03, unit: "%", desc: "Chute de tension DC admissible (3%)" },
    { code: "VOLTAGE_DROP_AC", name: "Chute tension AC", group: "cables", value: 0.03, unit: "%", desc: "Chute de tension AC admissible (3%)" },
    { code: "COPPER_RESISTIVITY", name: "Résistivité cuivre", group: "cables", value: 0.0175, unit: "Ω·mm²/m", desc: "Résistivité du cuivre à 20°C" },
    { code: "NOMINAL_VOLTAGE", name: "Tension nominale système", group: "systeme", value: 48, unit: "V", desc: "Tension nominale retenue pour le parc" },
    { code: "STRUCTURE_RATE", name: "Taux structure", group: "budget", value: 0.08, unit: "%", desc: "Coût structures en % du coût panneaux" },
    { code: "CABLE_ACCESSORIES_RATE", name: "Taux accessoires câbles", group: "budget", value: 0.10, unit: "%", desc: "Marge accessoires câbles" },
    { code: "ENGINEERING_RATE", name: "Taux ingénierie", group: "budget", value: 0.08, unit: "%", desc: "Coût ingénierie en % du sous-total matériel" },
    { code: "TRANSPORT_RATE", name: "Taux transport", group: "budget", value: 0.05, unit: "%", desc: "Coût transport en % du sous-total matériel" },
    { code: "CONTINGENCY_RATE", name: "Taux contingence", group: "budget", value: 0.05, unit: "%", desc: "Contingence en % du sous-total" },
    { code: "COMMERCIAL_MARGIN_RATE", name: "Taux marge commerciale", group: "budget", value: 0.15, unit: "%", desc: "Marge commerciale" },
    { code: "VAT_RATE", name: "Taux TVA", group: "budget", value: 0.18, unit: "%", desc: "Taux TVA par défaut (18% Côte d'Ivoire)" },
    { code: "INSTALLATION_COST_PER_KWP", name: "Coût installation par kWc", group: "budget", value: 150000, unit: "XOF/kWc", desc: "Coût main d'œuvre installation par kWc installé" },
    { code: "PRICE_PER_WC_PANEL", name: "Prix par Wc panneau", group: "prix_defaut", value: 350, unit: "XOF/Wc", desc: "Prix moyen par Wc de panneau solaire" },
    { code: "PRICE_PER_WH_LITHIUM", name: "Prix par Wh lithium", group: "prix_defaut", value: 250, unit: "XOF/Wh", desc: "Prix moyen par Wh de batterie lithium" },
    { code: "PRICE_PER_AH_LEAD", name: "Prix par Ah plomb", group: "prix_defaut", value: 4500, unit: "XOF/Ah", desc: "Prix moyen par Ah de batterie plomb" },
    { code: "PRICE_PER_W_INVERTER", name: "Prix par W onduleur", group: "prix_defaut", value: 200, unit: "XOF/W", desc: "Prix moyen par W d'onduleur" },
    { code: "PRICE_PER_M_CABLE", name: "Prix par m·mm² câble", group: "prix_defaut", value: 150, unit: "XOF/m·mm²", desc: "Prix moyen par mètre linéaire par mm² de câble" },
  ];

  for (const d of defaults) {
    const existing = await db.select().from(erpSolarGlobalSettings).where(eq(erpSolarGlobalSettings.parameterCode, d.code));
    if (existing.length === 0) {
      await db.insert(erpSolarGlobalSettings).values({
        parameterCode: d.code,
        parameterName: d.name,
        parameterGroup: d.group,
        parameterValue: String(d.value),
        unit: d.unit,
        description: d.desc,
        dataType: "number",
        lastModifiedBy: userId ?? null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
