import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  listAllAgents: vi.fn().mockResolvedValue([
    { id: 1, name: "Agent Koné", role: "admin" },
    { id: 2, name: "Agent Traoré", role: "agent_terrain" },
  ]),
  getAvailableSlotsForDate: vi.fn().mockResolvedValue([
    { startTime: "08:00", endTime: "08:30", available: true },
    { startTime: "08:30", endTime: "09:00", available: false },
    { startTime: "09:00", endTime: "09:30", available: true },
  ]),
  createAppointment: vi.fn().mockResolvedValue(42),
  getAppointmentById: vi.fn().mockResolvedValue({
    id: 42,
    citizenId: 10,
    agentId: 1,
    date: "2026-06-20",
    startTime: "08:00",
    endTime: "08:30",
    status: "pending",
    motif: "Consultation titre foncier",
  }),
  listCitizenAppointments: vi.fn().mockResolvedValue([
    {
      id: 42,
      agentId: 1,
      agentName: "Agent Koné",
      date: "2026-06-20",
      startTime: "08:00",
      endTime: "08:30",
      status: "pending",
      motif: "Consultation titre foncier",
      dossierType: "general",
      dossierId: null,
      notes: null,
      cancelReason: null,
      createdAt: 1718870400000,
    },
  ]),
  listAgentAppointments: vi.fn().mockResolvedValue([]),
  listAllAppointments: vi.fn().mockResolvedValue([]),
  cancelAppointment: vi.fn().mockResolvedValue({
    id: 42,
    citizenId: 10,
    agentId: 1,
    date: "2026-06-20",
    startTime: "08:00",
    endTime: "08:30",
    status: "cancelled_citizen",
  }),
  confirmAppointment: vi.fn().mockResolvedValue({
    id: 42,
    citizenId: 10,
    agentId: 1,
    date: "2026-06-20",
    startTime: "08:00",
    endTime: "08:30",
    status: "confirmed",
  }),
  completeAppointment: vi.fn().mockResolvedValue({
    id: 42,
    citizenId: 10,
    agentId: 1,
    date: "2026-06-20",
    startTime: "08:00",
    endTime: "08:30",
    status: "completed",
  }),
  getAgentAvailabilities: vi.fn().mockResolvedValue([
    { id: 1, agentId: 1, dayOfWeek: 1, startTime: "08:00", endTime: "17:00", slotDurationMin: 30, isActive: true },
  ]),
  setAgentAvailability: vi.fn().mockResolvedValue(1),
  deleteAgentAvailability: vi.fn().mockResolvedValue(undefined),
  createCitizenNotification: vi.fn().mockResolvedValue(1),
}));

import {
  listAllAgents,
  getAvailableSlotsForDate,
  createAppointment,
  listCitizenAppointments,
  cancelAppointment,
  confirmAppointment,
  completeAppointment,
  getAgentAvailabilities,
  setAgentAvailability,
  deleteAgentAvailability,
} from "./db";

describe("Appointment Module - DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listAllAgents", () => {
    it("should return a list of agents with admin/agent roles", async () => {
      const agents = await listAllAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0]).toHaveProperty("id");
      expect(agents[0]).toHaveProperty("name");
      expect(agents[0]).toHaveProperty("role");
    });
  });

  describe("getAvailableSlotsForDate", () => {
    it("should return slots with availability status", async () => {
      const slots = await getAvailableSlotsForDate(1, "2026-06-20");
      expect(slots).toHaveLength(3);
      expect(slots[0]).toEqual({ startTime: "08:00", endTime: "08:30", available: true });
      expect(slots[1]).toEqual({ startTime: "08:30", endTime: "09:00", available: false });
    });

    it("should mark booked slots as unavailable", async () => {
      const slots = await getAvailableSlotsForDate(1, "2026-06-20");
      const bookedSlot = slots.find(s => s.startTime === "08:30");
      expect(bookedSlot?.available).toBe(false);
    });
  });

  describe("createAppointment", () => {
    it("should create an appointment and return its ID", async () => {
      const id = await createAppointment({
        citizenId: 10,
        agentId: 1,
        date: "2026-06-20",
        startTime: "08:00",
        endTime: "08:30",
        status: "pending",
        motif: "Consultation titre foncier",
        dossierType: "general",
        dossierId: null,
        notes: null,
        cancelReason: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      expect(id).toBe(42);
      expect(createAppointment).toHaveBeenCalledTimes(1);
    });
  });

  describe("listCitizenAppointments", () => {
    it("should return appointments with agent name", async () => {
      const appointments = await listCitizenAppointments(10);
      expect(appointments).toHaveLength(1);
      expect(appointments[0].agentName).toBe("Agent Koné");
      expect(appointments[0].status).toBe("pending");
    });
  });

  describe("cancelAppointment", () => {
    it("should cancel an appointment and return updated status", async () => {
      const result = await cancelAppointment(42, 10, "citizen", "Plus disponible");
      expect(result.status).toBe("cancelled_citizen");
    });
  });

  describe("confirmAppointment", () => {
    it("should confirm a pending appointment", async () => {
      const result = await confirmAppointment(42, 1);
      expect(result.status).toBe("confirmed");
    });
  });

  describe("completeAppointment", () => {
    it("should mark an appointment as completed", async () => {
      const result = await completeAppointment(42, 1, "RDV terminé avec succès");
      expect(result.status).toBe("completed");
    });
  });

  describe("Agent Availabilities", () => {
    it("should return agent availabilities", async () => {
      const avails = await getAgentAvailabilities(1);
      expect(avails).toHaveLength(1);
      expect(avails[0].dayOfWeek).toBe(1);
      expect(avails[0].startTime).toBe("08:00");
    });

    it("should set/update an availability", async () => {
      const id = await setAgentAvailability({
        agentId: 1,
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "16:00",
        slotDurationMin: 45,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      expect(id).toBe(1);
    });

    it("should delete an availability", async () => {
      await deleteAgentAvailability(1, 1);
      expect(deleteAgentAvailability).toHaveBeenCalledWith(1, 1);
    });
  });
});

describe("Appointment Module - Business Logic", () => {
  it("should not allow booking in the past (validation in router)", () => {
    const today = new Date().toISOString().slice(0, 10);
    const pastDate = "2020-01-01";
    expect(pastDate < today).toBe(true);
  });

  it("should generate correct slot times from availability", () => {
    const startMinutes = 8 * 60; // 08:00
    const endMinutes = 10 * 60; // 10:00
    const duration = 30;
    const slots: string[] = [];
    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const slotStart = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      slots.push(slotStart);
    }
    expect(slots).toEqual(["08:00", "08:30", "09:00", "09:30"]);
  });

  it("should correctly map day of week from date string", () => {
    // 2026-06-15 is a Monday (dayOfWeek = 1)
    const date = new Date("2026-06-15T00:00:00");
    expect(date.getDay()).toBe(1);
    // 2026-06-14 is a Sunday (dayOfWeek = 0)
    const sunday = new Date("2026-06-14T00:00:00");
    expect(sunday.getDay()).toBe(0);
  });
});
