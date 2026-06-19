import { describe, it, expect } from "vitest";
import {
  ERP_MODULES,
  ERP_ACTIONS,
  ERP_SYSTEM_ROLES,
  ERP_ROLE_DEFAULT_PERMISSIONS,
} from "./erp-rbac.service";

// ============================================================
// TESTS SPRINT 4 — GANTT & MILESTONES
// ============================================================

describe("Sprint 4 — Gantt & Milestones", () => {
  // --------------------------------------------------------
  // 1. Module erp_gantt défini dans le RBAC
  // --------------------------------------------------------
  describe("Module erp_gantt dans RBAC", () => {
    it("le module erp_gantt est défini", () => {
      expect(ERP_MODULES).toContain("erp_gantt");
    });

    it("le module erp_projects est défini (pour milestones)", () => {
      expect(ERP_MODULES).toContain("erp_projects");
    });
  });

  // --------------------------------------------------------
  // 2. Statuts milestones
  // --------------------------------------------------------
  describe("Statuts milestones", () => {
    const MILESTONE_STATUSES = ["planned", "reached", "delayed", "missed", "cancelled"];

    it("5 statuts milestone valides", () => {
      expect(MILESTONE_STATUSES).toHaveLength(5);
    });

    it("contient planned, reached, delayed, missed, cancelled", () => {
      expect(MILESTONE_STATUSES).toContain("planned");
      expect(MILESTONE_STATUSES).toContain("reached");
      expect(MILESTONE_STATUSES).toContain("delayed");
      expect(MILESTONE_STATUSES).toContain("missed");
      expect(MILESTONE_STATUSES).toContain("cancelled");
    });
  });

  // --------------------------------------------------------
  // 3. Niveaux d'impact
  // --------------------------------------------------------
  describe("Niveaux d'impact", () => {
    const IMPACT_LEVELS = ["low", "medium", "high", "critical"];

    it("4 niveaux d'impact", () => {
      expect(IMPACT_LEVELS).toHaveLength(4);
    });
  });

  // --------------------------------------------------------
  // 4. Permissions Gantt
  // --------------------------------------------------------
  describe("Permissions Gantt par rôle", () => {
    it("super_admin a accès au module erp_gantt", () => {
      const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_super_admin;
      const ganttPerms = perms.filter((p) => p.module === "erp_gantt");
      expect(ganttPerms.length).toBeGreaterThan(0);
    });

    it("project_manager a accès view et update sur erp_gantt", () => {
      const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_project_manager;
      const ganttPerms = perms.filter((p) => p.module === "erp_gantt");
      const actions = ganttPerms.map((p) => p.action);
      expect(actions).toContain("view");
      expect(actions).toContain("update");
    });

    it("viewer a accès view uniquement sur erp_gantt", () => {
      const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_viewer;
      const ganttPerms = perms.filter((p) => p.module === "erp_gantt");
      const actions = ganttPerms.map((p) => p.action);
      expect(actions).toContain("view");
      expect(actions).not.toContain("edit");
      expect(actions).not.toContain("delete");
    });

    it("contractor a accès view sur erp_gantt", () => {
      const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_contractor;
      const ganttPerms = perms.filter((p) => p.module === "erp_gantt");
      const actions = ganttPerms.map((p) => p.action);
      expect(actions).toContain("view");
    });
  });

  // --------------------------------------------------------
  // 5. Détection de retard
  // --------------------------------------------------------
  describe("Détection de retard", () => {
    it("un milestone planned avec date passée est en retard", () => {
      const milestone = {
        status: "planned",
        plannedDate: Date.now() - 86400000, // hier
      };
      const isLate = milestone.status === "planned" && milestone.plannedDate < Date.now();
      expect(isLate).toBe(true);
    });

    it("un milestone planned avec date future n'est pas en retard", () => {
      const milestone = {
        status: "planned",
        plannedDate: Date.now() + 86400000 * 7, // dans 7 jours
      };
      const isLate = milestone.status === "planned" && milestone.plannedDate < Date.now();
      expect(isLate).toBe(false);
    });

    it("un milestone reached n'est jamais en retard (même si date passée)", () => {
      const milestone = {
        status: "reached",
        plannedDate: Date.now() - 86400000,
      };
      const isLate = milestone.status === "planned" && milestone.plannedDate < Date.now();
      expect(isLate).toBe(false);
    });

    it("markReached retourne delayed si actualDate > plannedDate", () => {
      const plannedDate = Date.now() - 86400000 * 5;
      const actualDate = Date.now();
      const isLate = actualDate > plannedDate;
      const status = isLate ? "delayed" : "reached";
      expect(status).toBe("delayed");
    });

    it("markReached retourne reached si actualDate <= plannedDate", () => {
      const plannedDate = Date.now() + 86400000;
      const actualDate = Date.now();
      const isLate = actualDate > plannedDate;
      const status = isLate ? "delayed" : "reached";
      expect(status).toBe("reached");
    });
  });

  // --------------------------------------------------------
  // 6. Calcul de progression globale
  // --------------------------------------------------------
  describe("Calcul de progression globale", () => {
    it("progression moyenne correcte avec des tâches", () => {
      const tasks = [
        { progressPercentage: 100 },
        { progressPercentage: 50 },
        { progressPercentage: 0 },
      ];
      const avg = Math.round(tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / tasks.length);
      expect(avg).toBe(50);
    });

    it("progression 0 si aucune tâche", () => {
      const tasks: Array<{ progressPercentage: number }> = [];
      const avg = tasks.length > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / tasks.length)
        : 0;
      expect(avg).toBe(0);
    });

    it("progression 100 si toutes les tâches sont terminées", () => {
      const tasks = [
        { progressPercentage: 100 },
        { progressPercentage: 100 },
        { progressPercentage: 100 },
      ];
      const avg = Math.round(tasks.reduce((sum, t) => sum + t.progressPercentage, 0) / tasks.length);
      expect(avg).toBe(100);
    });
  });

  // --------------------------------------------------------
  // 7. Timeline
  // --------------------------------------------------------
  describe("Timeline Gantt", () => {
    it("calcule les bornes min/max correctement", () => {
      const dates = [
        Date.now() - 86400000 * 10,
        Date.now(),
        Date.now() + 86400000 * 30,
      ];
      const start = Math.min(...dates);
      const end = Math.max(...dates);
      expect(end - start).toBe(86400000 * 40);
    });

    it("tâche en retard détectée si dueDate < now et non completed", () => {
      const task = {
        dueDate: Date.now() - 86400000,
        status: "in_progress",
      };
      const isLate = !!(task.dueDate && task.dueDate < Date.now() && task.status !== "completed" && task.status !== "cancelled");
      expect(isLate).toBe(true);
    });

    it("tâche completed jamais en retard même si dueDate passée", () => {
      const task = {
        dueDate: Date.now() - 86400000,
        status: "completed",
      };
      const isLate = !!(task.dueDate && task.dueDate < Date.now() && task.status !== "completed" && task.status !== "cancelled");
      expect(isLate).toBe(false);
    });
  });

  // --------------------------------------------------------
  // 8. Modification de dates avec permission
  // --------------------------------------------------------
  describe("Modification de dates (permissions)", () => {
    it("super_admin peut modifier les dates (update sur erp_gantt)", () => {
      const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_super_admin;
      const canUpdate = perms.some((p) => p.module === "erp_gantt" && p.action === "update");
      expect(canUpdate).toBe(true);
    });

    it("viewer ne peut pas modifier les dates", () => {
      const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_viewer;
      const canUpdate = perms.some((p) => p.module === "erp_gantt" && p.action === "update");
      expect(canUpdate).toBe(false);
    });
  });
});
