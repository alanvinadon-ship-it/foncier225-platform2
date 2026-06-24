import { z } from "zod";
import { eq, and, isNull, desc, sql, asc, like, or } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  erpSolarProjects, erpSolarResourceZones, erpSolarTechnicalParameters,
  erpSolarPriceCatalog, erpSolarLoadItems, erpSolarDesignInputs,
  erpSolarSizingResults, erpSolarCableSizing, erpSolarBudgetLines,
  erpSolarScenarios, erpSolarAiRecommendations, erpSolarLoadCatalog,
  erpSolarGlobalSettings, erpSolarSiteSettings, erpSolarCalculationRuns,
} from "../../drizzle/schema";
import {
  calculateLoadBalance, calculateFullSizing, calculateBudget,
  DEFAULT_PRICES, DEFAULT_DESIGN_INPUTS,
  type LoadItem, type DesignInputs, type PriceCatalog, type BatterySizingMode,
} from "./erp-solar-calculation-engine.service";
import {
  generateSolarRecommendations, generateScenarios, solarAiChat,
  suggestMissingLoads, generateTypicalProfile, detectLoadAnomalies,
  type SolarProjectContext,
} from "./erp-solar-ai.service";

// ============================================================
// SOUS-ROUTEURS
// ============================================================

const projectsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().default(50) }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const baseWhere = input.status ? and(isNull(erpSolarProjects.deletedAt), eq(erpSolarProjects.status, input.status)) : isNull(erpSolarProjects.deletedAt);
      const rows = await db.select().from(erpSolarProjects).where(baseWhere).orderBy(desc(erpSolarProjects.createdAt)).limit(input.limit);
      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [project] = await db.select().from(erpSolarProjects).where(eq(erpSolarProjects.id, input.id));
      return project || null;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      clientName: z.string().optional(),
      siteName: z.string().optional(),
      siteLocation: z.string().optional(),
      regionZoneId: z.number().optional(),
      systemType: z.string().default("autonomous"),
      erpProjectId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const code = `SOL-${now.toString(36).toUpperCase()}`;
      const [result] = await db.insert(erpSolarProjects).values({
        projectCode: code,
        name: input.name,
        clientName: input.clientName || null,
        siteName: input.siteName || null,
        siteLocation: input.siteLocation || null,
        regionZoneId: input.regionZoneId || null,
        systemType: input.systemType,
        erpProjectId: input.erpProjectId || null,
        status: "draft",
        currency: "XOF",
        createdBy: ctx.user.openId,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId, projectCode: code };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      clientName: z.string().optional(),
      siteName: z.string().optional(),
      siteLocation: z.string().optional(),
      regionZoneId: z.number().optional(),
      systemType: z.string().optional(),
      status: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      await db.update(erpSolarProjects).set({ ...updates, updatedAt: Date.now() } as any).where(eq(erpSolarProjects.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpSolarProjects).set({ deletedAt: Date.now() }).where(eq(erpSolarProjects.id, input.id));
      return { success: true };
    }),

  dashboard: protectedProcedure.query(async () => {
    const db = (await getDb())!;
    const projects = await db.select().from(erpSolarProjects).where(isNull(erpSolarProjects.deletedAt));
    const totalProjects = projects.length;
    const draftProjects = projects.filter(p => p.status === "draft").length;
    const studyProjects = projects.filter(p => p.status === "study").length;
    const validatedProjects = projects.filter(p => p.status === "validated").length;

    // Calcul totaux
    const sizingResults = await db.select().from(erpSolarSizingResults);
    const totalPvPowerWc = sizingResults.reduce((sum, r) => sum + Number(r.requiredPvPowerWc || 0), 0);
    const totalDailyEnergy = sizingResults.reduce((sum, r) => sum + Number(r.totalDailyEnergyWh || 0), 0);

    const budgetLines = await db.select().from(erpSolarBudgetLines);
    const totalBudget = budgetLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);

    const recommendations = await db.select().from(erpSolarAiRecommendations).where(eq(erpSolarAiRecommendations.severity, "critical"));
    const criticalRecommendations = recommendations.filter(r => r.status === "suggested").length;

    return {
      totalProjects,
      draftProjects,
      studyProjects,
      validatedProjects,
      totalPvPowerWc,
      totalDailyEnergy,
      totalBudget,
      criticalRecommendations,
    };
  }),
});

const loadItemsRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, input.projectId)).orderBy(asc(erpSolarLoadItems.id));
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      equipmentName: z.string().min(1),
      equipmentCategory: z.string().optional(),
      unitPowerW: z.number().min(0),
      quantity: z.number().min(1),
      startupFactor: z.number().min(1).default(1),
      usageHoursPerDay: z.number().min(0).max(24),
      isCriticalLoad: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const totalPowerW = input.unitPowerW * input.quantity;
      const peakPowerW = totalPowerW * input.startupFactor;
      const dailyEnergyWh = totalPowerW * input.usageHoursPerDay;

      const [result] = await db.insert(erpSolarLoadItems).values({
        solarProjectId: input.projectId,
        equipmentName: input.equipmentName,
        equipmentCategory: input.equipmentCategory || null,
        unitPowerW: String(input.unitPowerW),
        quantity: input.quantity,
        totalPowerW: String(totalPowerW),
        startupFactor: String(input.startupFactor),
        peakPowerW: String(peakPowerW),
        usageHoursPerDay: String(input.usageHoursPerDay),
        dailyEnergyWh: String(dailyEnergyWh),
        isCriticalLoad: input.isCriticalLoad,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      equipmentName: z.string().optional(),
      equipmentCategory: z.string().optional(),
      unitPowerW: z.number().optional(),
      quantity: z.number().optional(),
      startupFactor: z.number().optional(),
      usageHoursPerDay: z.number().optional(),
      isCriticalLoad: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      // Recalculate if power/qty/factor/hours changed
      const updateData: any = { ...updates, updatedAt: Date.now() };
      if (updates.unitPowerW !== undefined || updates.quantity !== undefined || updates.startupFactor !== undefined || updates.usageHoursPerDay !== undefined) {
        const [existing] = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.id, id));
        if (existing) {
          const unitP = updates.unitPowerW ?? Number(existing.unitPowerW);
          const qty = updates.quantity ?? existing.quantity;
          const sf = updates.startupFactor ?? Number(existing.startupFactor);
          const hrs = updates.usageHoursPerDay ?? Number(existing.usageHoursPerDay);
          updateData.totalPowerW = String(unitP * qty);
          updateData.peakPowerW = String(unitP * qty * sf);
          updateData.dailyEnergyWh = String(unitP * qty * hrs);
          if (updates.unitPowerW !== undefined) updateData.unitPowerW = String(updates.unitPowerW);
          if (updates.startupFactor !== undefined) updateData.startupFactor = String(updates.startupFactor);
          if (updates.usageHoursPerDay !== undefined) updateData.usageHoursPerDay = String(updates.usageHoursPerDay);
        }
      }
      await db.update(erpSolarLoadItems).set(updateData).where(eq(erpSolarLoadItems.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.delete(erpSolarLoadItems).where(eq(erpSolarLoadItems.id, input.id));
      return { success: true };
    }),

  duplicate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [existing] = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.id, input.id));
      if (!existing) throw new Error("Load item not found");
      const now = Date.now();
      const [result] = await db.insert(erpSolarLoadItems).values({
        ...existing,
        id: undefined as any,
        equipmentName: existing.equipmentName + " (copie)",
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),

  addFromCatalog: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      catalogItemId: z.number(),
      quantity: z.number().min(1).default(1),
      unitPowerW: z.number().optional(),
      usageHoursPerDay: z.number().optional(),
      simultaneityCoeff: z.number().optional(),
      startupFactor: z.number().optional(),
      isCriticalLoad: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const [catalogItem] = await db.select().from(erpSolarLoadCatalog).where(eq(erpSolarLoadCatalog.id, input.catalogItemId));
      if (!catalogItem) throw new Error("Catalog item not found");
      const now = Date.now();
      const unitP = input.unitPowerW ?? Number(catalogItem.defaultPowerW);
      const qty = input.quantity;
      const sf = input.startupFactor ?? Number(catalogItem.startupFactor);
      const hrs = input.usageHoursPerDay ?? Number(catalogItem.defaultHoursPerDay);
      const coeff = input.simultaneityCoeff ?? Number(catalogItem.defaultSimultaneityCoeff);
      const totalPowerW = unitP * qty;
      const peakPowerW = totalPowerW * sf;
      const dailyEnergyWh = unitP * qty * hrs * coeff;
      const [result] = await db.insert(erpSolarLoadItems).values({
        solarProjectId: input.projectId,
        equipmentName: catalogItem.name,
        equipmentCategory: catalogItem.category,
        unitPowerW: String(unitP),
        quantity: qty,
        totalPowerW: String(totalPowerW),
        startupFactor: String(sf),
        peakPowerW: String(peakPowerW),
        usageHoursPerDay: String(hrs),
        dailyEnergyWh: String(dailyEnergyWh),
        isCriticalLoad: input.isCriticalLoad ?? catalogItem.isCriticalDefault ?? false,
        catalogItemId: catalogItem.id,
        domain: catalogItem.domain,
        isCustom: false,
        simultaneityCoeff: String(coeff),
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),

  calculateBalance: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const items = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      const loadItems: LoadItem[] = items.map((i: any) => ({
        equipmentName: i.equipmentName,
        equipmentCategory: i.equipmentCategory || undefined,
        unitPowerW: Number(i.unitPowerW),
        quantity: i.quantity,
        startupFactor: Number(i.startupFactor),
        usageHoursPerDay: Number(i.usageHoursPerDay),
        isCriticalLoad: i.isCriticalLoad || false,
        isNightLoad: i.isNightLoad || false,
        isMotorLoad: i.isMotorLoad || false,
        simultaneityCoeff: i.simultaneityCoeff ? Number(i.simultaneityCoeff) : 1.0,
        priorityLevel: (i.priorityLevel || "important") as LoadItem["priorityLevel"],
      }));
      const result = calculateLoadBalance(loadItems);
      return result;
    }),
});

// ============================================================
// CATALOGUE CHARGES STANDARD
// ============================================================
const loadCatalogRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      domain: z.string().optional(),
      category: z.string().optional(),
      isActive: z.boolean().default(true),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const conditions: any[] = [];
      if (input.isActive) conditions.push(eq(erpSolarLoadCatalog.isActive, true));
      conditions.push(isNull(erpSolarLoadCatalog.deletedAt));
      if (input.domain) conditions.push(eq(erpSolarLoadCatalog.domain, input.domain));
      if (input.category) conditions.push(eq(erpSolarLoadCatalog.category, input.category));
      if (input.search) conditions.push(like(erpSolarLoadCatalog.name, `%${input.search}%`));
      return db.select().from(erpSolarLoadCatalog)
        .where(and(...conditions))
        .orderBy(asc(erpSolarLoadCatalog.domain), asc(erpSolarLoadCatalog.name))
        .limit(input.limit);
    }),

  create: protectedProcedure
    .input(z.object({
      itemCode: z.string().min(1),
      name: z.string().min(1),
      domain: z.string().min(1),
      category: z.string().min(1),
      defaultPowerW: z.number().min(0),
      minPowerW: z.number().optional(),
      maxPowerW: z.number().optional(),
      defaultQuantity: z.number().min(1).default(1),
      defaultHoursPerDay: z.number().min(0).max(24),
      defaultSimultaneityCoeff: z.number().min(0).max(1).default(1),
      startupFactor: z.number().min(1).default(1),
      isCriticalDefault: z.boolean().default(false),
      description: z.string().optional(),
      usageNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const [result] = await db.insert(erpSolarLoadCatalog).values({
        itemCode: input.itemCode,
        name: input.name,
        domain: input.domain,
        category: input.category,
        defaultPowerW: String(input.defaultPowerW),
        minPowerW: input.minPowerW ? String(input.minPowerW) : null,
        maxPowerW: input.maxPowerW ? String(input.maxPowerW) : null,
        defaultQuantity: input.defaultQuantity,
        defaultHoursPerDay: String(input.defaultHoursPerDay),
        defaultSimultaneityCoeff: String(input.defaultSimultaneityCoeff),
        startupFactor: String(input.startupFactor),
        isCriticalDefault: input.isCriticalDefault,
        description: input.description || null,
        usageNotes: input.usageNotes || null,
        isActive: true,
        createdBy: ctx.user?.id || null,
        createdAt: now,
        updatedAt: now,
      });
      return { id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      domain: z.string().optional(),
      category: z.string().optional(),
      defaultPowerW: z.number().optional(),
      minPowerW: z.number().nullable().optional(),
      maxPowerW: z.number().nullable().optional(),
      defaultQuantity: z.number().optional(),
      defaultHoursPerDay: z.number().optional(),
      defaultSimultaneityCoeff: z.number().optional(),
      startupFactor: z.number().optional(),
      isCriticalDefault: z.boolean().optional(),
      description: z.string().nullable().optional(),
      usageNotes: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const { id, ...updates } = input;
      const updateData: any = { updatedAt: Date.now() };
      if (updates.defaultPowerW !== undefined) updateData.defaultPowerW = String(updates.defaultPowerW);
      if (updates.minPowerW !== undefined) updateData.minPowerW = updates.minPowerW ? String(updates.minPowerW) : null;
      if (updates.maxPowerW !== undefined) updateData.maxPowerW = updates.maxPowerW ? String(updates.maxPowerW) : null;
      if (updates.defaultHoursPerDay !== undefined) updateData.defaultHoursPerDay = String(updates.defaultHoursPerDay);
      if (updates.defaultSimultaneityCoeff !== undefined) updateData.defaultSimultaneityCoeff = String(updates.defaultSimultaneityCoeff);
      if (updates.startupFactor !== undefined) updateData.startupFactor = String(updates.startupFactor);
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.domain !== undefined) updateData.domain = updates.domain;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.defaultQuantity !== undefined) updateData.defaultQuantity = updates.defaultQuantity;
      if (updates.isCriticalDefault !== undefined) updateData.isCriticalDefault = updates.isCriticalDefault;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.usageNotes !== undefined) updateData.usageNotes = updates.usageNotes;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      await db.update(erpSolarLoadCatalog).set(updateData).where(eq(erpSolarLoadCatalog.id, id));
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      await db.update(erpSolarLoadCatalog).set({ deletedAt: Date.now() }).where(eq(erpSolarLoadCatalog.id, input.id));
      return { success: true };
    }),
});

const sizingRouter = router({
  getDesignInputs: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [existing] = await db.select().from(erpSolarDesignInputs).where(eq(erpSolarDesignInputs.solarProjectId, input.projectId));
      return existing || null;
    }),

  saveDesignInputs: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      nominalVoltageV: z.number().default(48),
      batteryTechnology: z.string().default("lithium"),
      autonomyDays: z.number().default(2),
      peakSunHours: z.number(),
      panelUnitPowerWc: z.number().default(550),
      panelToInverterCableLengthM: z.number().default(10),
      batteryToInverterCableLengthM: z.number().default(3),
      globalEfficiency: z.number().default(0.75),
      batteryDischargeRate: z.number().default(0.80),
      voltageDropTarget: z.number().default(0.03),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const now = Date.now();
      const { projectId, ...data } = input;
      const [existing] = await db.select().from(erpSolarDesignInputs).where(eq(erpSolarDesignInputs.solarProjectId, projectId));
      if (existing) {
        await db.update(erpSolarDesignInputs).set({ ...data, updatedAt: now } as any).where(eq(erpSolarDesignInputs.id, existing.id));
      } else {
        await db.insert(erpSolarDesignInputs).values({
          solarProjectId: projectId,
          ...data,
          createdAt: now,
          updatedAt: now,
        } as any);
      }
      return { success: true };
    }),

  calculate: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const startTime = Date.now();

      // Get load items
            const items = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      if (items.length === 0) throw new Error("Aucun équipement dans le bilan de puissance");
      const loadItems: LoadItem[] = items.map((i: any) => ({
        equipmentName: i.equipmentName,
        unitPowerW: Number(i.unitPowerW),
        quantity: i.quantity,
        startupFactor: Number(i.startupFactor),
        usageHoursPerDay: Number(i.usageHoursPerDay),
        isCriticalLoad: i.isCriticalLoad || false,
        isNightLoad: i.isNightLoad || false,
        isMotorLoad: i.isMotorLoad || false,
        simultaneityCoeff: i.simultaneityCoeff ? Number(i.simultaneityCoeff) : 1.0,
        priorityLevel: (i.priorityLevel || "important") as LoadItem["priorityLevel"],
      }));
      const loadBalance = calculateLoadBalance(loadItems);
      // Resolve effective parameters: global settings + site overrides
      const globalSettings = await db.select().from(erpSolarGlobalSettings);
      const siteOverrides = await db.select().from(erpSolarSiteSettings)
        .where(eq(erpSolarSiteSettings.solarProjectId, input.projectId));
      const overrideMap = new Map(siteOverrides.map((o: any) => [o.parameterCode, Number(o.overrideValue)]));
      
      function getParam(code: string, fallback: number): number {
        if (overrideMap.has(code)) return overrideMap.get(code)!;
        const g = globalSettings.find((s: any) => s.parameterCode === code);
        return g ? Number(g.parameterValue) : fallback;
      }

      // Get design inputs from project-specific table or build from global settings
      const [designRow] = await db.select().from(erpSolarDesignInputs).where(eq(erpSolarDesignInputs.solarProjectId, input.projectId));
      const baseDesign = designRow ? {
        nominalVoltageV: designRow.nominalVoltageV,
        batteryTechnology: designRow.batteryTechnology as "lithium" | "plomb",
        autonomyDays: designRow.autonomyDays,
        peakSunHours: Number(designRow.peakSunHours),
        panelUnitPowerWc: designRow.panelUnitPowerWc,
        panelToInverterCableLengthM: Number(designRow.panelToInverterCableLengthM),
        batteryToInverterCableLengthM: Number(designRow.batteryToInverterCableLengthM),
        globalEfficiency: Number(designRow.globalEfficiency),
        batteryDischargeRate: Number(designRow.batteryDischargeRate),
        voltageDropTarget: Number(designRow.voltageDropTarget),
      } : {
        nominalVoltageV: getParam("NOMINAL_VOLTAGE", 48),
        batteryTechnology: "lithium" as const,
        autonomyDays: getParam("AUTONOMY_DAYS", 2),
        peakSunHours: getParam("PSH_DEFAULT", 4.5),
        panelUnitPowerWc: getParam("PANEL_UNIT_POWER", 550),
        panelToInverterCableLengthM: 10,
        batteryToInverterCableLengthM: 3,
        globalEfficiency: getParam("GLOBAL_EFFICIENCY", 0.80),
        batteryDischargeRate: getParam("DOD_LITHIUM", 0.80),
        voltageDropTarget: getParam("VOLTAGE_DROP_DC", 0.03),
      };
      const designInputs: DesignInputs = {
        ...baseDesign,
        batterySizingMode: (designRow?.batterySizingMode as any) || getParam("BATTERY_SIZING_MODE", 0) ? "total_load" : "total_load",
        hybridBackupPercent: designRow?.hybridBackupPercent ? Number(designRow.hybridBackupPercent) : getParam("HYBRID_BACKUP_PERCENT", 0.30),
        pvStringVoltageV: designRow?.pvStringVoltageV || undefined,
        batteryAgeingFactor: designRow?.batteryAgeingFactor ? Number(designRow.batteryAgeingFactor) : getParam("BATTERY_AGEING_FACTOR", 0.80),
        batteryTemperatureFactor: designRow?.batteryTemperatureFactor ? Number(designRow.batteryTemperatureFactor) : getParam("BATTERY_TEMPERATURE_FACTOR", 0.95),
        batteryReserveMarginPercent: designRow?.batteryReserveMarginPercent ? Number(designRow.batteryReserveMarginPercent) : getParam("BATTERY_RESERVE_MARGIN", 0.10),
        powerFactor: designRow?.powerFactor ? Number(designRow.powerFactor) : getParam("POWER_FACTOR", 0.85),
        inverterSurgeMargin: designRow?.inverterSurgeMargin ? Number(designRow.inverterSurgeMargin) : 0.10,
        pvMarginPercent: designRow?.pvMarginPercent ? Number(designRow.pvMarginPercent) : getParam("PV_MARGIN_PERCENT", 0.15),
      };

      // Calculate full sizing
      const sizing = calculateFullSizing(loadBalance, designInputs);
      const now = Date.now();
      const durationMs = now - startTime;

      // Build parameters snapshot for audit trail
      const parametersSnapshot = JSON.stringify({
        designInputs,
        globalSettingsUsed: globalSettings.map((s: any) => ({ code: s.parameterCode, value: Number(s.parameterValue) })),
        siteOverrides: siteOverrides.map((o: any) => ({ code: o.parameterCode, value: Number(o.overrideValue) })),
      });

      // Save calculation run
      await db.insert(erpSolarCalculationRuns).values({
        solarProjectId: input.projectId,
        runType: "sizing",
        parametersSnapshot,
        inputData: JSON.stringify({ loadItems: loadItems.length, totalPowerW: loadBalance.totalNominalPowerW, totalEnergyWh: loadBalance.totalDailyEnergyWh }),
        outputData: JSON.stringify(sizing),
        status: "completed",
        durationMs,
        triggeredBy: ctx.user.id,
        createdAt: now,
      } as any);

      // Save sizing results
      const [existingSizing] = await db.select().from(erpSolarSizingResults).where(eq(erpSolarSizingResults.solarProjectId, input.projectId));
      const sizingData = {
        solarProjectId: input.projectId,
        // Bilan de puissance
        totalNominalPowerW: String(loadBalance.totalNominalPowerW),
        simultaneousPowerW: String(loadBalance.simultaneousPowerW),
        maxStartupPowerW: String(loadBalance.maxStartupPowerW),
        realisticPeakPowerW: String(loadBalance.realisticPeakPowerW),
        totalDailyEnergyWh: String(loadBalance.totalDailyEnergyWh),
        criticalDailyEnergyWh: String(loadBalance.criticalLoadEnergyWh),
        nightDailyEnergyWh: String(loadBalance.nightLoadEnergyWh),
        // PV
        detailedEfficiency: String(sizing.efficiency.detailedEfficiency),
        pvGrossPowerWc: String(sizing.pv.pvGrossPowerWc),
        pvRecommendedPowerWc: String(sizing.pv.pvRecommendedPowerWc),
        requiredPvPowerWc: String(sizing.pv.requiredPvPowerWc),
        panelUnitPowerWc: sizing.pv.panelUnitPowerWc,
        panelsCount: sizing.pv.panelsCount,
        pvInstalledPowerWc: String(sizing.pv.totalInstalledPowerWc),
        pvRealMarginPercent: String(sizing.pv.pvRealMarginPercent),
        // Batterie
        batterySizingMode: sizing.battery.sizingMode,
        batteryReferenceEnergyWh: String(sizing.battery.referenceEnergyWh),
        batteryNominalCapacityWh: String(sizing.battery.nominalCapacityWh),
        batteryRecommendedCapacityWh: String(sizing.battery.recommendedCapacityWh),
        batteryCapacityAh: String(sizing.battery.capacityAh),
        batteryCapacityWh: String(sizing.battery.capacityWh),
        batteryModulesCount: sizing.battery.modulesCount,
        batteryRealAutonomyDays: String(sizing.battery.realAutonomyDays),
        // Onduleur
        inverterMinPowerW: String(sizing.inverter.minPowerW),
        inverterContinuousRecommendedW: String(sizing.inverter.continuousRecommendedW),
        inverterSurgeRequiredW: String(sizing.inverter.surgeRequiredW),
        inverterPowerKva: String(sizing.inverter.powerKva),
        recommendedInverterPowerW: String(sizing.inverter.recommendedPowerW),
        // Pertes câbles
        totalCableLossW: String(sizing.cables.reduce((s, c) => s + c.powerLossW, 0)),
        totalCableLossWhDay: String(sizing.cables.reduce((s, c) => s + c.energyLossWhDay, 0)),
        // Meta
        calculationStatus: "completed",
        updatedAt: now,
      };

      if (existingSizing) {
        await db.update(erpSolarSizingResults).set(sizingData as any).where(eq(erpSolarSizingResults.id, existingSizing.id));
      } else {
        await db.insert(erpSolarSizingResults).values({ ...sizingData, createdAt: now } as any);
      }

      // Save cable sizing
      await db.delete(erpSolarCableSizing).where(eq(erpSolarCableSizing.solarProjectId, input.projectId));
      for (const cable of sizing.cables) {
        await db.insert(erpSolarCableSizing).values({
          solarProjectId: input.projectId,
          cableType: cable.cableType,
          lineName: cable.lineName,
          fromEquipment: cable.fromEquipment,
          toEquipment: cable.toEquipment,
          voltageV: String(cable.voltageV),
          powerW: String(cable.powerW),
          lengthM: String(cable.lengthM),
          currentA: String(cable.currentA),
          theoreticalSectionMm2: String(cable.theoreticalSectionMm2),
          selectedSectionMm2: String(cable.selectedSectionMm2),
          recommendedCommercialSectionMm2: String(cable.recommendedCommercialSectionMm2),
          voltageDropV: String(cable.voltageDropV),
          voltageDropPercent: String(cable.voltageDropPercent),
          resistanceOhm: String(cable.resistanceOhm),
          powerLossW: String(cable.powerLossW),
          energyLossWhDay: String(cable.energyLossWhDay),
          lossPercent: String(cable.lossPercent),
          ampacityLimitA: String(cable.ampacityLimitA),
          ampacityStatus: cable.ampacityStatus,
          protectionRecommendation: cable.protectionRecommendation,
          engineeringStatus: "Draft",
          material: cable.material,
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      // Update project status
      await db.update(erpSolarProjects).set({ status: "study", updatedAt: now }).where(eq(erpSolarProjects.id, input.projectId));

      return { sizing, loadBalance };
    }),

  getResults: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [sizing] = await db.select().from(erpSolarSizingResults).where(eq(erpSolarSizingResults.solarProjectId, input.projectId));
      const cables = await db.select().from(erpSolarCableSizing).where(eq(erpSolarCableSizing.solarProjectId, input.projectId));
      return { sizing: sizing || null, cables };
    }),
});

const budgetRouter = router({
  calculate: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const startTime = Date.now();

      // Get sizing
      const [sizingRow] = await db.select().from(erpSolarSizingResults).where(eq(erpSolarSizingResults.solarProjectId, input.projectId));
      if (!sizingRow || sizingRow.calculationStatus !== "completed") throw new Error("Dimensionnement non calculé");

      const [designRow] = await db.select().from(erpSolarDesignInputs).where(eq(erpSolarDesignInputs.solarProjectId, input.projectId));
      const cables = await db.select().from(erpSolarCableSizing).where(eq(erpSolarCableSizing.solarProjectId, input.projectId));

      // Resolve prices: global settings overrides > catalog > defaults
      const globalSettings = await db.select().from(erpSolarGlobalSettings);
      const siteOverrides = await db.select().from(erpSolarSiteSettings)
        .where(eq(erpSolarSiteSettings.solarProjectId, input.projectId));
      const overrideMap = new Map(siteOverrides.map((o: any) => [o.parameterCode, Number(o.overrideValue)]));
      function getParam(code: string, fallback: number): number {
        if (overrideMap.has(code)) return overrideMap.get(code)!;
        const g = globalSettings.find((s: any) => s.parameterCode === code);
        return g ? Number(g.parameterValue) : fallback;
      }

      // Get prices from catalog or use defaults
      const catalogItems = await db.select().from(erpSolarPriceCatalog).where(eq(erpSolarPriceCatalog.isActive, true));
      const prices: PriceCatalog = { ...DEFAULT_PRICES };
      // Utiliser le premier article trouvé par catégorie (is_default ou premier actif)
      const seen = new Set<string>();
      for (const item of catalogItems) {
        if (item.category === "panneaux_solaires" && !seen.has("panel")) {
          const wcMatch = item.itemName?.match(/(\d+)\s*W/i);
          const panelWc = wcMatch ? parseInt(wcMatch[1]) : 550;
          prices.pricePerWcPanel = Number(item.unitPrice) / panelWc;
          seen.add("panel");
        }
        if (item.category === "batteries_lithium" && !seen.has("lithium")) {
          prices.pricePerUnitLithium = Number(item.unitPrice);
          const capMatch = item.itemName?.match(/(\d+[,.]?\d*)\s*kWh/i);
          if (capMatch) prices.lithiumUnitCapacityWh = parseFloat(capMatch[1].replace(",", ".")) * 1000;
          seen.add("lithium");
        }
        if (item.category === "batteries_plomb" && !seen.has("plomb")) {
          prices.pricePerUnitPlomb = Number(item.unitPrice);
          const capMatch = item.itemName?.match(/(\d+)\s*Ah/i);
          if (capMatch) prices.plombUnitCapacityAh = parseInt(capMatch[1]);
          seen.add("plomb");
        }
        if (item.category === "onduleurs" && !seen.has("inverter")) {
          const kwMatch = item.itemName?.match(/(\d+)\s*kW/i);
          const inverterW = kwMatch ? parseInt(kwMatch[1]) * 1000 : 5000;
          prices.pricePerWInverter = Number(item.unitPrice) / inverterW;
          seen.add("inverter");
        }
        if (item.category === "cables_solaires" && !seen.has("cable")) {
          prices.pricePerMeterCable = Number(item.unitPrice);
          seen.add("cable");
        }
      }
      // Apply global settings overrides for budget percentages
      prices.structuresCoffretsPercent = getParam("STRUCTURES_PERCENT", prices.structuresCoffretsPercent);
      prices.installationTransportPercent = getParam("INSTALLATION_PERCENT", prices.installationTransportPercent);

      const sizing: any = {
        pv: {
          pvGrossPowerWc: Number(sizingRow.pvGrossPowerWc || sizingRow.requiredPvPowerWc),
          pvRecommendedPowerWc: Number(sizingRow.pvRecommendedPowerWc || sizingRow.requiredPvPowerWc),
          requiredPvPowerWc: Number(sizingRow.requiredPvPowerWc),
          panelUnitPowerWc: sizingRow.panelUnitPowerWc || 550,
          panelsCount: sizingRow.panelsCount || 0,
          totalInstalledPowerWc: (sizingRow.panelsCount || 0) * (sizingRow.panelUnitPowerWc || 550),
          pvRealMarginPercent: Number(sizingRow.pvRealMarginPercent || 0.15),
        },
        battery: {
          sizingMode: sizingRow.batterySizingMode || "total_load",
          referenceEnergyWh: Number(sizingRow.batteryReferenceEnergyWh || 0),
          autonomyEnergyWh: Number(sizingRow.batteryCapacityWh || 0),
          nominalCapacityWh: Number(sizingRow.batteryNominalCapacityWh || sizingRow.batteryCapacityWh || 0),
          recommendedCapacityWh: Number(sizingRow.batteryRecommendedCapacityWh || sizingRow.batteryCapacityWh || 0),
          capacityAh: Number(sizingRow.batteryCapacityAh),
          capacityWh: Number(sizingRow.batteryCapacityWh),
          modulesCount: sizingRow.batteryModulesCount || 0,
          realAutonomyDays: Number(sizingRow.batteryRealAutonomyDays || designRow?.autonomyDays || 2),
          technology: designRow?.batteryTechnology || "lithium",
          autonomyDays: designRow?.autonomyDays || 2,
          nominalVoltageV: designRow?.nominalVoltageV || 48,
          dischargeRate: Number(designRow?.batteryDischargeRate || 0.8),
        },
        inverter: {
          simultaneousPowerW: Number(sizingRow.simultaneousPowerW || 0),
          realisticPeakPowerW: Number(sizingRow.realisticPeakPowerW || 0),
          minPowerW: Number(sizingRow.inverterMinPowerW),
          continuousRecommendedW: Number(sizingRow.inverterContinuousRecommendedW || sizingRow.inverterMinPowerW),
          surgeRequiredW: Number(sizingRow.inverterSurgeRequiredW || 0),
          powerKva: Number(sizingRow.inverterPowerKva || 0),
          recommendedPowerW: Number(sizingRow.recommendedInverterPowerW),
          safetyMargin: 1.25,
          coversStartup: true,
          motorAlert: false,
        },
        cables: cables.map(c => ({
          cableType: c.cableType,
          lineName: c.lineName,
          fromEquipment: c.fromEquipment || "",
          toEquipment: c.toEquipment || "",
          voltageV: Number(c.voltageV || 48),
          powerW: Number(c.powerW || 0),
          lengthM: Number(c.lengthM),
          currentA: Number(c.currentA),
          theoreticalSectionMm2: Number(c.theoreticalSectionMm2),
          selectedSectionMm2: Number(c.selectedSectionMm2 || c.recommendedCommercialSectionMm2),
          recommendedCommercialSectionMm2: Number(c.recommendedCommercialSectionMm2),
          voltageDropV: Number(c.voltageDropV || 0),
          voltageDropPercent: Number(c.voltageDropPercent),
          resistanceOhm: Number(c.resistanceOhm || 0),
          powerLossW: Number(c.powerLossW || 0),
          energyLossWhDay: Number(c.energyLossWhDay || 0),
          lossPercent: Number(c.lossPercent || 0),
          ampacityLimitA: Number(c.ampacityLimitA || 0),
          ampacityStatus: c.ampacityStatus || "OK",
          protectionRecommendation: c.protectionRecommendation || "",
          material: c.material,
        })),
        efficiency: {
          detailedEfficiency: Number(sizingRow.detailedEfficiency || 0.75),
          lossBreakdown: {},
        },
        loadBalance: {
          totalNominalPowerW: Number(sizingRow.totalNominalPowerW || 0),
          simultaneousPowerW: Number(sizingRow.simultaneousPowerW || 0),
          totalDailyEnergyWh: Number(sizingRow.totalDailyEnergyWh || 0),
          criticalDailyEnergyWh: Number(sizingRow.criticalDailyEnergyWh || 0),
          nightDailyEnergyWh: Number(sizingRow.nightDailyEnergyWh || 0),
          realisticPeakPowerW: Number(sizingRow.realisticPeakPowerW || 0),
        },
      };

      const budget = calculateBudget(sizing, prices);
      const now = Date.now();

      // Save budget lines
      await db.delete(erpSolarBudgetLines).where(eq(erpSolarBudgetLines.solarProjectId, input.projectId));
      for (const line of budget.lines) {
        await db.insert(erpSolarBudgetLines).values({
          solarProjectId: input.projectId,
          lotNumber: line.lotNumber,
          lotName: line.lotName,
          category: line.category,
          quantity: String(line.quantity),
          unit: line.unit,
          unitPrice: String(line.unitPrice),
          amount: String(line.amount),
          currency: budget.currency,
          calculationMethod: line.calculationMethod,
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      // Save calculation run for budget
      const durationMs = Date.now() - startTime;
      await db.insert(erpSolarCalculationRuns).values({
        solarProjectId: input.projectId,
        runType: "budget",
        parametersSnapshot: JSON.stringify({ prices, catalogItemsCount: catalogItems.length }),
        inputData: JSON.stringify({ sizingRowId: sizingRow.id }),
        outputData: JSON.stringify({ totalInvestment: budget.totalInvestment, lotsCount: budget.lines.length }),
        status: "completed",
        durationMs,
        triggeredBy: ctx.user.id,
        createdAt: Date.now(),
      } as any);

      return budget;
    }),

  getLines: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSolarBudgetLines).where(eq(erpSolarBudgetLines.solarProjectId, input.projectId)).orderBy(asc(erpSolarBudgetLines.lotNumber));
    }),
});

const scenariosRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSolarScenarios).where(eq(erpSolarScenarios.solarProjectId, input.projectId));
    }),

  generate: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;

      const items = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      if (items.length === 0) throw new Error("Aucun équipement dans le bilan de puissance");

      const loadItems: LoadItem[] = items.map((i: any) => ({
        equipmentName: i.equipmentName,
        unitPowerW: Number(i.unitPowerW),
        quantity: i.quantity,
        startupFactor: Number(i.startupFactor),
        usageHoursPerDay: Number(i.usageHoursPerDay),
        isCriticalLoad: i.isCriticalLoad || false,
        isNightLoad: i.isNightLoad || false,
        isMotorLoad: i.isMotorLoad || false,
        simultaneityCoeff: i.simultaneityCoeff ? Number(i.simultaneityCoeff) : 1.0,
        priorityLevel: (i.priorityLevel || "important") as LoadItem["priorityLevel"],
      }));
      const loadBalance = calculateLoadBalance(loadItems);

      const [designRow] = await db.select().from(erpSolarDesignInputs).where(eq(erpSolarDesignInputs.solarProjectId, input.projectId));
      const designInputs: DesignInputs = designRow ? {
        ...DEFAULT_DESIGN_INPUTS,
        nominalVoltageV: designRow.nominalVoltageV,
        batteryTechnology: designRow.batteryTechnology as "lithium" | "plomb",
        autonomyDays: designRow.autonomyDays,
        peakSunHours: Number(designRow.peakSunHours),
        panelUnitPowerWc: designRow.panelUnitPowerWc,
        panelToInverterCableLengthM: Number(designRow.panelToInverterCableLengthM),
        batteryToInverterCableLengthM: Number(designRow.batteryToInverterCableLengthM),
        globalEfficiency: Number(designRow.globalEfficiency),
        batteryDischargeRate: Number(designRow.batteryDischargeRate),
        voltageDropTarget: Number(designRow.voltageDropTarget),
        batterySizingMode: (designRow.batterySizingMode as BatterySizingMode) || "total_load",
        hybridBackupPercent: designRow.hybridBackupPercent ? Number(designRow.hybridBackupPercent) : 0.30,
        pvStringVoltageV: designRow.pvStringVoltageV || undefined,
        batteryAgeingFactor: designRow.batteryAgeingFactor ? Number(designRow.batteryAgeingFactor) : 0.80,
        batteryTemperatureFactor: designRow.batteryTemperatureFactor ? Number(designRow.batteryTemperatureFactor) : 0.95,
        batteryReserveMarginPercent: designRow.batteryReserveMarginPercent ? Number(designRow.batteryReserveMarginPercent) : 0.10,
        powerFactor: designRow.powerFactor ? Number(designRow.powerFactor) : 0.85,
        inverterSurgeMargin: designRow.inverterSurgeMargin ? Number(designRow.inverterSurgeMargin) : 0.10,
        pvMarginPercent: designRow.pvMarginPercent ? Number(designRow.pvMarginPercent) : 0.15,
      } : DEFAULT_DESIGN_INPUTS;

      const scenarios = generateScenarios(loadBalance, designInputs);
      const now = Date.now();

      // Clear existing scenarios
      await db.delete(erpSolarScenarios).where(eq(erpSolarScenarios.solarProjectId, input.projectId));

      // Save new scenarios
      for (const s of scenarios) {
        await db.insert(erpSolarScenarios).values({
          solarProjectId: input.projectId,
          scenarioName: s.scenarioName,
          batteryTechnology: s.batteryTechnology,
          autonomyDays: s.autonomyDays,
          panelPowerWc: s.panelPowerWc,
          peakSunHours: String(s.peakSunHours),
          totalCost: String(s.totalCost),
          panelsCount: s.panelsCount,
          batteryCapacityAh: String(s.batteryCapacityAh),
          inverterPowerW: String(s.inverterPowerW),
          aiScore: String(s.aiScore),
          recommendedByAi: s.recommendedByAi,
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      return scenarios;
    }),
});

const aiRouter = router({
  generateRecommendations: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const context = await buildProjectContext(db, input.projectId);
      if (!context) throw new Error("Projet non trouvé ou dimensionnement non calculé");

      const recommendations = await generateSolarRecommendations(context);
      const now = Date.now();

      // Save recommendations
      await db.delete(erpSolarAiRecommendations).where(eq(erpSolarAiRecommendations.solarProjectId, input.projectId));
      for (const rec of recommendations) {
        await db.insert(erpSolarAiRecommendations).values({
          solarProjectId: input.projectId,
          recommendationType: rec.recommendationType,
          title: rec.title,
          description: rec.description,
          severity: rec.severity,
          confidenceScore: String(rec.confidenceScore),
          expectedImpact: rec.expectedImpact,
          status: "suggested",
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      return recommendations;
    }),

  getRecommendations: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      return db.select().from(erpSolarAiRecommendations).where(eq(erpSolarAiRecommendations.solarProjectId, input.projectId)).orderBy(desc(erpSolarAiRecommendations.createdAt));
    }),

  chat: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      question: z.string().min(1),
      history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).default([]),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const context = await buildProjectContext(db, input.projectId);
      if (!context) throw new Error("Projet non trouvé ou dimensionnement non calculé");

      const answer = await solarAiChat(input.question, context, input.history);
      return { answer };
    }),

  validateRecommendation: protectedProcedure
    .input(z.object({ id: z.number(), action: z.enum(["validate", "reject"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = (await getDb())!;
      const status = input.action === "validate" ? "validated" : "rejected";
      await db.update(erpSolarAiRecommendations).set({
        status,
        validatedBy: ctx.user.openId,
        validatedAt: Date.now(),
        updatedAt: Date.now(),
      }).where(eq(erpSolarAiRecommendations.id, input.id));
      return { success: true };
    }),

  suggestLoads: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      projectType: z.string().default("residential"),
      siteDescription: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = (await getDb())!;
      const loads = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      const existingLoads = loads.map(l => ({
        name: l.equipmentName,
        powerW: Number(l.unitPowerW),
        category: l.equipmentCategory || "other",
      }));
      const suggestions = await suggestMissingLoads(input.projectType, existingLoads, input.siteDescription);
      return suggestions;
    }),

  typicalProfile: protectedProcedure
    .input(z.object({ profileType: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const profile = await generateTypicalProfile(input.profileType);
      return profile;
    }),

  detectAnomalies: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const loads = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      const loadData = loads.map(l => ({
        equipmentName: l.equipmentName,
        unitPowerW: Number(l.unitPowerW),
        quantity: l.quantity,
        usageHoursPerDay: Number(l.usageHoursPerDay),
        startupFactor: Number(l.startupFactor),
        equipmentCategory: l.equipmentCategory || undefined,
      }));
      return detectLoadAnomalies(loadData);
    }),
});

const settingsRouter = router({
  zones: router({
    list: protectedProcedure.query(async () => {
      const db = (await getDb())!;
      return db.select().from(erpSolarResourceZones).where(eq(erpSolarResourceZones.isActive, true)).orderBy(asc(erpSolarResourceZones.zoneName));
    }),
    create: protectedProcedure
      .input(z.object({ zoneName: z.string(), country: z.string().optional(), region: z.string().optional(), city: z.string().optional(), peakSunHours: z.number(), source: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        const now = Date.now();
        const [result] = await db.insert(erpSolarResourceZones).values({ ...input, peakSunHours: String(input.peakSunHours), isActive: true, createdAt: now, updatedAt: now } as any);
        return { id: result.insertId };
      }),
  }),
  parameters: router({
    list: protectedProcedure.query(async () => {
      const db = (await getDb())!;
      return db.select().from(erpSolarTechnicalParameters).where(eq(erpSolarTechnicalParameters.isActive, true));
    }),
    upsert: protectedProcedure
      .input(z.object({ parameterCode: z.string(), parameterName: z.string(), parameterValue: z.number(), unit: z.string().optional(), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        const now = Date.now();
        const [existing] = await db.select().from(erpSolarTechnicalParameters).where(eq(erpSolarTechnicalParameters.parameterCode, input.parameterCode));
        if (existing) {
          await db.update(erpSolarTechnicalParameters).set({ parameterValue: String(input.parameterValue), parameterName: input.parameterName, unit: input.unit, description: input.description, updatedAt: now } as any).where(eq(erpSolarTechnicalParameters.id, existing.id));
          return { id: existing.id };
        }
        const [result] = await db.insert(erpSolarTechnicalParameters).values({ ...input, parameterValue: String(input.parameterValue), isActive: true, createdAt: now, updatedAt: now } as any);
        return { id: result.insertId };
      }),
  }),
  priceCatalog: router({
    list: protectedProcedure.query(async () => {
      const db = (await getDb())!;
      return db.select().from(erpSolarPriceCatalog).where(eq(erpSolarPriceCatalog.isActive, true)).orderBy(asc(erpSolarPriceCatalog.category));
    }),
    create: protectedProcedure
      .input(z.object({
        itemCode: z.string(),
        itemName: z.string(),
        category: z.string(),
        unit: z.string(),
        unitPrice: z.number(),
        brand: z.string().optional(),
        model: z.string().optional(),
        qualityLevel: z.string().optional(),
        recommendedUsage: z.string().optional(),
        supplierId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        const now = Date.now();
        // Check for duplicate
        const [existing] = await db.select().from(erpSolarPriceCatalog).where(eq(erpSolarPriceCatalog.itemCode, input.itemCode));
        if (existing) {
          // Update existing item
          await db.update(erpSolarPriceCatalog).set({
            itemName: input.itemName,
            category: input.category,
            unit: input.unit,
            unitPrice: String(input.unitPrice),
            brand: input.brand || null,
            model: input.model || null,
            qualityLevel: input.qualityLevel || null,
            recommendedUsage: input.recommendedUsage || null,
            isActive: true,
            updatedAt: now,
          } as any).where(eq(erpSolarPriceCatalog.id, existing.id));
          return { id: existing.id, updated: true };
        }
        const [result] = await db.insert(erpSolarPriceCatalog).values({
          ...input,
          unitPrice: String(input.unitPrice),
          brand: input.brand || null,
          model: input.model || null,
          qualityLevel: input.qualityLevel || null,
          recommendedUsage: input.recommendedUsage || null,
          currency: "XOF",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        } as any);
        return { id: result.insertId, updated: false };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        unitPrice: z.number().optional(),
        itemName: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        brand: z.string().nullable().optional(),
        model: z.string().nullable().optional(),
        qualityLevel: z.string().nullable().optional(),
        recommendedUsage: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = (await getDb())!;
        const { id, ...updates } = input;
        const data: any = { ...updates, updatedAt: Date.now() };
        if (updates.unitPrice !== undefined) data.unitPrice = String(updates.unitPrice);
        await db.update(erpSolarPriceCatalog).set(data).where(eq(erpSolarPriceCatalog.id, id));
        return { success: true };
      }),
  }),
});

// ============================================================
// HELPER: Build project context for AI
// ============================================================

async function buildProjectContext(db: any, projectId: number): Promise<SolarProjectContext | null> {
  const [project] = await db.select().from(erpSolarProjects).where(eq(erpSolarProjects.id, projectId));
  if (!project) return null;

  const items = await db.select().from(erpSolarLoadItems).where(eq(erpSolarLoadItems.solarProjectId, projectId));
  if (items.length === 0) return null;

  const loadItems: LoadItem[] = items.map((i: any) => ({
    equipmentName: i.equipmentName,
    unitPowerW: Number(i.unitPowerW),
    quantity: i.quantity,
    startupFactor: Number(i.startupFactor),
    usageHoursPerDay: Number(i.usageHoursPerDay),
    isCriticalLoad: i.isCriticalLoad || false,
    isNightLoad: i.isNightLoad || false,
    isMotorLoad: i.isMotorLoad || false,
    simultaneityCoeff: i.simultaneityCoeff ? Number(i.simultaneityCoeff) : 1.0,
    priorityLevel: (i.priorityLevel || "important") as LoadItem["priorityLevel"],
  }));
  const loadBalance = calculateLoadBalance(loadItems);

  const [designRow] = await db.select().from(erpSolarDesignInputs).where(eq(erpSolarDesignInputs.solarProjectId, projectId));
  const designInputs: DesignInputs = designRow ? {
    ...DEFAULT_DESIGN_INPUTS,
    nominalVoltageV: designRow.nominalVoltageV,
    batteryTechnology: designRow.batteryTechnology as "lithium" | "plomb",
    autonomyDays: designRow.autonomyDays,
    peakSunHours: Number(designRow.peakSunHours),
    panelUnitPowerWc: designRow.panelUnitPowerWc,
    panelToInverterCableLengthM: Number(designRow.panelToInverterCableLengthM),
    batteryToInverterCableLengthM: Number(designRow.batteryToInverterCableLengthM),
    globalEfficiency: Number(designRow.globalEfficiency),
    batteryDischargeRate: Number(designRow.batteryDischargeRate),
    voltageDropTarget: Number(designRow.voltageDropTarget),
    batterySizingMode: (designRow.batterySizingMode as BatterySizingMode) || "total_load",
    hybridBackupPercent: designRow.hybridBackupPercent ? Number(designRow.hybridBackupPercent) : 0.30,
    pvStringVoltageV: designRow.pvStringVoltageV || undefined,
    batteryAgeingFactor: designRow.batteryAgeingFactor ? Number(designRow.batteryAgeingFactor) : 0.80,
    batteryTemperatureFactor: designRow.batteryTemperatureFactor ? Number(designRow.batteryTemperatureFactor) : 0.95,
    batteryReserveMarginPercent: designRow.batteryReserveMarginPercent ? Number(designRow.batteryReserveMarginPercent) : 0.10,
    powerFactor: designRow.powerFactor ? Number(designRow.powerFactor) : 0.85,
    inverterSurgeMargin: designRow.inverterSurgeMargin ? Number(designRow.inverterSurgeMargin) : 0.10,
    pvMarginPercent: designRow.pvMarginPercent ? Number(designRow.pvMarginPercent) : 0.15,
  } : DEFAULT_DESIGN_INPUTS;

  const sizing = calculateFullSizing(loadBalance, designInputs);
  const budget = calculateBudget(sizing, DEFAULT_PRICES);

  // Load catalog for AI context
  const catalogRows = await db.select().from(erpSolarPriceCatalog).where(eq(erpSolarPriceCatalog.isActive, true));
  const catalog = catalogRows.map((c: any) => ({
    itemCode: c.itemCode,
    itemName: c.itemName,
    category: c.category,
    unit: c.unit,
    unitPrice: Number(c.unitPrice),
    brand: c.brand,
    model: c.model,
    qualityLevel: c.qualityLevel,
    recommendedUsage: c.recommendedUsage,
  }));

  return {
    projectName: project.name,
    siteName: project.siteName || undefined,
    loadBalance,
    designInputs,
    sizing,
    budget,
    catalog,
  };
}

// ============================================================
// EXPORT ROUTEUR PRINCIPAL
// ============================================================

export const solarRouter = router({
  projects: projectsRouter,
  loadItems: loadItemsRouter,
  loadCatalog: loadCatalogRouter,
  sizing: sizingRouter,
  budget: budgetRouter,
  scenarios: scenariosRouter,
  ai: aiRouter,
  settings: settingsRouter,
});
