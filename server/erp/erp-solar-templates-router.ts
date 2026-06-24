import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, like, sql } from "drizzle-orm";
import {
  erpSolarLoadTemplates,
  erpSolarLoadTemplateItems,
  erpSolarLoadTemplateGenerations,
  erpSolarLoadItems,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";

export const erpSolarTemplatesRouter = router({
  // List templates with filters
  list: protectedProcedure
    .input(
      z.object({
        domain: z.string().optional(),
        comfortLevel: z.string().optional(),
        search: z.string().optional(),
        isActive: z.boolean().optional().default(true),
      }).optional()
    )
    .query(async ({ input }) => {
      const filters = input || {};
      const db = (await getDb())!;
      let query = db.select().from(erpSolarLoadTemplates).$dynamic();
      
      const conditions: any[] = [];
      if (filters.isActive !== undefined) {
        conditions.push(eq(erpSolarLoadTemplates.isActive, filters.isActive));
      }
      if (filters.domain) {
        conditions.push(eq(erpSolarLoadTemplates.domain, filters.domain));
      }
      if (filters.comfortLevel) {
        conditions.push(eq(erpSolarLoadTemplates.comfortLevel, filters.comfortLevel));
      }
      if (filters.search) {
        conditions.push(like(erpSolarLoadTemplates.templateName, `%${filters.search}%`));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const templates = await query;
      return templates;
    }),

  // Get template by ID with items
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const [template] = await db
        .select()
        .from(erpSolarLoadTemplates)
        .where(eq(erpSolarLoadTemplates.id, input.id));

      if (!template) throw new Error("Template not found");

      const items = await db
        .select()
        .from(erpSolarLoadTemplateItems)
        .where(eq(erpSolarLoadTemplateItems.templateId, input.id));

      return { ...template, items };
    }),

  // Get domains list with count
  getDomains: protectedProcedure.query(async () => {
      const db = (await getDb())!;
      const result = await db
        .select({
          domain: erpSolarLoadTemplates.domain,
          count: sql<number>`COUNT(*)`.as("count"),
        })
        .from(erpSolarLoadTemplates)
      .where(eq(erpSolarLoadTemplates.isActive, true))
      .groupBy(erpSolarLoadTemplates.domain);

    return result;
  }),

  // Get profiles for a domain
  getProfiles: protectedProcedure
    .input(z.object({ domain: z.string() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const templates = await db
        .select()
        .from(erpSolarLoadTemplates)
        .where(
          and(
            eq(erpSolarLoadTemplates.domain, input.domain),
            eq(erpSolarLoadTemplates.isActive, true)
          )
        );

      return templates;
    }),

  // Generate load balance from template
  generateFromTemplate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        templateId: z.number(),
        mode: z.enum(["replace", "merge"]).default("replace"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      // Get template items
      const templateItems = await db
        .select()
        .from(erpSolarLoadTemplateItems)
        .where(eq(erpSolarLoadTemplateItems.templateId, input.templateId));

      if (templateItems.length === 0) {
        throw new Error("Template has no items");
      }

      const now = Date.now();

      // If replace mode, delete existing loads
      if (input.mode === "replace") {
        await db
          .delete(erpSolarLoadItems)
          .where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      }

      // Insert template items as load items
      let totalPowerW = 0;
      let totalDailyEnergyWh = 0;
      let criticalEnergyWh = 0;

      for (const item of templateItems) {
        const powerW = Number(item.powerW);
        const qty = item.quantity;
        const hours = Number(item.hoursPerDay);
        const simult = Number(item.simultaneityCoefficient);
        const totalItemPowerW = powerW * qty;
        const startupFactor = Number(item.startupFactor) || (item.isMotorLoad ? 3.0 : 1.0);
        const peakPower = totalItemPowerW * startupFactor;
        const energyWh = totalItemPowerW * hours;

        totalPowerW += totalItemPowerW * simult;
        totalDailyEnergyWh += energyWh;
        if (item.isCriticalLoad) criticalEnergyWh += energyWh;

        const priorityStr = item.priorityLevel === "Essential" ? "critical" : item.priorityLevel === "Important" ? "important" : "comfort";

        await db.insert(erpSolarLoadItems).values({
          solarProjectId: input.projectId,
          equipmentName: item.equipmentName,
          equipmentCategory: item.category || null,
          unitPowerW: String(powerW),
          quantity: qty,
          totalPowerW: String(totalItemPowerW),
          startupFactor: String(startupFactor),
          peakPowerW: String(peakPower),
          usageHoursPerDay: String(hours),
          dailyEnergyWh: String(energyWh),
          isCriticalLoad: item.isCriticalLoad ?? false,
          isNightLoad: item.isNightLoad ?? false,
          isMotorLoad: item.isMotorLoad ?? false,
          priorityLevel: priorityStr,
          domain: item.category || null,
          isCustom: false,
          simultaneityCoeff: String(simult),
          createdAt: now,
          updatedAt: now,
        });
      }

      // Record generation
      await db.insert(erpSolarLoadTemplateGenerations).values({
        solarProjectId: input.projectId,
        templateId: input.templateId,
        generatedBy: ctx.user.id,
        generatedAt: now,
        itemsCreatedCount: templateItems.length,
        totalPowerW: String(totalPowerW),
        totalDailyEnergyWh: String(totalDailyEnergyWh),
        criticalEnergyWh: String(criticalEnergyWh),
        mode: input.mode,
        status: "Generated",
        createdAt: now,
      });

      return {
        success: true,
        itemsCreated: templateItems.length,
        totalPowerW,
        totalDailyEnergyWh,
        criticalEnergyWh,
      };
    }),

  // AI Generate load template
  aiGenerate: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        domain: z.string(),
        description: z.string(),
        comfortLevel: z.string().optional().default("Standard"),
        numberOfPersons: z.number().optional(),
        hoursOfService: z.number().optional(),
        budgetTarget: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const systemPrompt = `Tu es un expert en dimensionnement solaire photovoltaïque en Afrique de l'Ouest (Côte d'Ivoire).
Tu dois générer un bilan de puissance réaliste pour un projet solaire.

Règles :
- Puissances en watts réalistes pour le marché africain
- Heures d'utilisation réalistes selon le contexte
- Coefficient de simultanéité entre 0.3 et 1.0
- Facteur de démarrage : 1.0 pour résistif, 1.2 pour ventilateurs, 2.0-3.0 pour moteurs/compresseurs
- Marquer les charges critiques (sécurité, froid, réseau, éclairage essentiel)
- Marquer les charges nocturnes (sécurité, éclairage, froid)
- Marquer les charges moteur (pompes, compresseurs, climatiseurs)
- Priority: Essential, Important, Comfort, Optional

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "items": [
    {
      "name": "string",
      "category": "string",
      "powerW": number,
      "quantity": number,
      "hoursPerDay": number,
      "simultaneityCoefficient": number,
      "startupFactor": number,
      "isCritical": boolean,
      "isNight": boolean,
      "isMotor": boolean,
      "priority": "Essential|Important|Comfort|Optional"
    }
  ],
  "summary": "string",
  "recommendations": ["string"]
}`;

      const userPrompt = `Génère un bilan de puissance pour :
- Domaine : ${input.domain}
- Description : ${input.description}
- Niveau de confort : ${input.comfortLevel}
${input.numberOfPersons ? `- Nombre de personnes : ${input.numberOfPersons}` : ""}
${input.hoursOfService ? `- Heures de service : ${input.hoursOfService}h/jour` : ""}
${input.budgetTarget ? `- Budget cible : ${input.budgetTarget} XOF` : ""}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "load_balance",
            strict: true,
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      category: { type: "string" },
                      powerW: { type: "number" },
                      quantity: { type: "integer" },
                      hoursPerDay: { type: "number" },
                      simultaneityCoefficient: { type: "number" },
                      startupFactor: { type: "number" },
                      isCritical: { type: "boolean" },
                      isNight: { type: "boolean" },
                      isMotor: { type: "boolean" },
                      priority: { type: "string" },
                    },
                    required: ["name", "category", "powerW", "quantity", "hoursPerDay", "simultaneityCoefficient", "startupFactor", "isCritical", "isNight", "isMotor", "priority"],
                    additionalProperties: false,
                  },
                },
                summary: { type: "string" },
                recommendations: { type: "array", items: { type: "string" } },
              },
              required: ["items", "summary", "recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("AI response empty");

      const parsed = JSON.parse(content);
      return {
        items: parsed.items,
        summary: parsed.summary,
        recommendations: parsed.recommendations,
      };
    }),

  // Apply AI generated items to project
  applyAiGenerated: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        mode: z.enum(["replace", "merge"]).default("replace"),
        items: z.array(
          z.object({
            name: z.string(),
            category: z.string(),
            powerW: z.number(),
            quantity: z.number(),
            hoursPerDay: z.number(),
            simultaneityCoefficient: z.number(),
            startupFactor: z.number(),
            isCritical: z.boolean(),
            isNight: z.boolean(),
            isMotor: z.boolean(),
            priority: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      if (input.mode === "replace") {
        await db
          .delete(erpSolarLoadItems)
          .where(eq(erpSolarLoadItems.solarProjectId, input.projectId));
      }

      for (const item of input.items) {
        const hours = item.hoursPerDay;
        const totalPowerW = item.powerW * item.quantity;
        const startupFactor = item.startupFactor || (item.isMotor ? 3.0 : 1.0);
        const peakPower = totalPowerW * startupFactor;
        const energyWh = totalPowerW * hours;
        const priorityStr = item.priority === "Essential" ? "critical" : item.priority === "Important" ? "important" : "comfort";

        await db.insert(erpSolarLoadItems).values({
          solarProjectId: input.projectId,
          equipmentName: item.name,
          equipmentCategory: item.category || null,
          unitPowerW: String(item.powerW),
          quantity: item.quantity,
          totalPowerW: String(totalPowerW),
          startupFactor: String(startupFactor),
          peakPowerW: String(peakPower),
          usageHoursPerDay: String(hours),
          dailyEnergyWh: String(energyWh),
          isCriticalLoad: item.isCritical,
          isNightLoad: item.isNight,
          isMotorLoad: item.isMotor,
          priorityLevel: priorityStr,
          domain: item.category || null,
          isCustom: false,
          simultaneityCoeff: String(item.simultaneityCoefficient),
          createdAt: now,
          updatedAt: now,
        });
      }

      return { success: true, itemsCreated: input.items.length };
    }),

  // Get generation history for a project
  getGenerations: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;
      const generations = await db
        .select()
        .from(erpSolarLoadTemplateGenerations)
        .where(eq(erpSolarLoadTemplateGenerations.solarProjectId, input.projectId));

      return generations;
    }),
});
