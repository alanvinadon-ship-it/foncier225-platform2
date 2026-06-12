import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "./_core/trpc";
import { protectedProcedure } from "./_core/trpc";
import {
  getAgentAvailabilities,
  setAgentAvailability,
  deleteAgentAvailability,
  listAllAgents,
  getAvailableSlotsForDate,
  createAppointment,
  getAppointmentById,
  listCitizenAppointments,
  listAgentAppointments,
  listAllAppointments,
  cancelAppointment,
  confirmAppointment,
  completeAppointment,
} from "./db";
import { createCitizenNotification } from "./db";

// ─── Citizen Appointment Router ─────────────────────────────────────────

export const citizenAppointmentRouter = router({
  // Liste des agents disponibles
  listAgents: protectedProcedure.query(async () => {
    return listAllAgents();
  }),

  // Créneaux disponibles pour un agent à une date donnée
  availableSlots: protectedProcedure
    .input(z.object({
      agentId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format date: YYYY-MM-DD"),
    }))
    .query(async ({ input }) => {
      return getAvailableSlotsForDate(input.agentId, input.date);
    }),

  // Réserver un rendez-vous
  book: protectedProcedure
    .input(z.object({
      agentId: z.number().int().positive(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      motif: z.string().min(3, "Le motif doit contenir au moins 3 caractères"),
      dossierType: z.enum(["land_title", "urban_acd", "credit", "general"]).default("general"),
      dossierId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Vérifier que la date est dans le futur
      const today = new Date().toISOString().slice(0, 10);
      if (input.date < today) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Impossible de réserver dans le passé" });
      }
      const now = Date.now();
      const id = await createAppointment({
        citizenId: ctx.user.id,
        agentId: input.agentId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "pending",
        motif: input.motif,
        dossierType: input.dossierType,
        dossierId: input.dossierId ?? null,
        notes: input.notes ?? null,
        cancelReason: null,
        createdAt: now,
        updatedAt: now,
      });
      // Notification citoyen
      await createCitizenNotification({
        userId: ctx.user.id,
        type: "general",
        title: "Rendez-vous demandé",
        message: `Votre demande de rendez-vous du ${input.date} à ${input.startTime} a été enregistrée. Vous recevrez une confirmation.`,
        relatedModule: "general",
        relatedEntityId: id,
        isRead: false,
        createdAt: now,
      });
      return { id, success: true };
    }),

  // Annuler un rendez-vous
  cancel: protectedProcedure
    .input(z.object({
      appointmentId: z.number().int().positive(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await cancelAppointment(input.appointmentId, ctx.user.id, "citizen", input.reason);
      return { success: true, appointment: result };
    }),

  // Mes rendez-vous
  list: protectedProcedure.query(async ({ ctx }) => {
    return listCitizenAppointments(ctx.user.id);
  }),

  // Lister les dossiers actifs du citoyen (pour liaison au rendez-vous)
  listMyDossiers: protectedProcedure.query(async ({ ctx }) => {
    const { listMyActiveDossiers } = await import("./db");
    return listMyActiveDossiers(ctx.user.id);
  }),
});

// ─── Admin Appointment Router ─────────────────────────────────────────

export const adminAppointmentRouter = router({
  // Gérer les disponibilités de l'agent connecté
  getMyAvailabilities: protectedProcedure.query(async ({ ctx }) => {
    return getAgentAvailabilities(ctx.user.id);
  }),

  setAvailability: protectedProcedure
    .input(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      slotDurationMin: z.number().int().min(10).max(120).default(30),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const now = Date.now();
      const id = await setAgentAvailability({
        agentId: ctx.user.id,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMin: input.slotDurationMin,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
      });
      return { id, success: true };
    }),

  deleteAvailability: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      await deleteAgentAvailability(input.id, ctx.user.id);
      return { success: true };
    }),

  // Voir les rendez-vous de l'agent connecté
  myAppointments: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return listAgentAppointments(ctx.user.id, input?.dateFrom, input?.dateTo);
    }),

  // Voir tous les rendez-vous (admin global)
  listAll: protectedProcedure
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      return listAllAppointments(input?.dateFrom, input?.dateTo, input?.status);
    }),

  // Confirmer un rendez-vous
  confirm: protectedProcedure
    .input(z.object({ appointmentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const result = await confirmAppointment(input.appointmentId, ctx.user.id);
      // Notification citoyen
      await createCitizenNotification({
        userId: result.citizenId,
        type: "general",
        title: "Rendez-vous confirmé",
        message: `Votre rendez-vous du ${result.date} à ${result.startTime} a été confirmé par l'agent.`,
        relatedModule: "general",
        relatedEntityId: result.id,
        isRead: false,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  // Annuler un rendez-vous (par l'agent)
  cancel: protectedProcedure
    .input(z.object({
      appointmentId: z.number().int().positive(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await cancelAppointment(input.appointmentId, ctx.user.id, "agent", input.reason);
      // Notification citoyen
      await createCitizenNotification({
        userId: result.citizenId,
        type: "general",
        title: "Rendez-vous annulé",
        message: `Votre rendez-vous du ${result.date} à ${result.startTime} a été annulé par l'agent.${input.reason ? ` Motif : ${input.reason}` : ""}`,
        relatedModule: "general",
        relatedEntityId: result.id,
        isRead: false,
        createdAt: Date.now(),
      });
      return { success: true };
    }),

  // Marquer un rendez-vous comme terminé
  complete: protectedProcedure
    .input(z.object({
      appointmentId: z.number().int().positive(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await completeAppointment(input.appointmentId, ctx.user.id, input.notes);
      return { success: true };
    }),
});
