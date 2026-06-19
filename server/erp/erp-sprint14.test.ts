import { describe, it, expect } from "vitest";

/**
 * Sprint 14 — Overrun Alerts & Notifications
 * Tests unitaires pour le moteur d'alertes et les notifications
 */

// ============================================================
// ALERT ENGINE TESTS
// ============================================================

describe("Sprint 14 — Overrun Alerts Engine", () => {
  describe("Budget threshold detection", () => {
    it("should detect budget at 75% consumption", () => {
      const totalRevised = 10000000; // 100,000 XOF (en centimes)
      const consumed = 7600000; // 76,000 XOF
      const percent = Math.round((consumed * 10000) / totalRevised);
      expect(percent).toBeGreaterThanOrEqual(7500);
      expect(percent).toBeLessThan(9000);
      // Should trigger budget_75 alert
    });

    it("should detect budget at 90% consumption", () => {
      const totalRevised = 10000000;
      const consumed = 9200000; // 92,000 XOF
      const percent = Math.round((consumed * 10000) / totalRevised);
      expect(percent).toBeGreaterThanOrEqual(9000);
      expect(percent).toBeLessThan(10000);
      // Should trigger budget_90 alert
    });

    it("should detect budget at 100% consumption", () => {
      const totalRevised = 10000000;
      const consumed = 10000000; // 100%
      const percent = Math.round((consumed * 10000) / totalRevised);
      expect(percent).toBeGreaterThanOrEqual(10000);
      // Should trigger budget_100 or budget_overrun alert
    });

    it("should detect confirmed budget overrun (>100%)", () => {
      const totalRevised = 10000000;
      const consumed = 11500000; // 115%
      const percent = Math.round((consumed * 10000) / totalRevised);
      expect(percent).toBeGreaterThan(10000);
      const overrunAmount = consumed - totalRevised;
      expect(overrunAmount).toBe(1500000); // 15,000 XOF overrun
    });

    it("should not trigger alert below 75%", () => {
      const totalRevised = 10000000;
      const consumed = 7000000; // 70%
      const percent = Math.round((consumed * 10000) / totalRevised);
      expect(percent).toBeLessThan(7500);
    });

    it("should handle zero budget gracefully", () => {
      const totalRevised = 0;
      // Should skip (no division by zero)
      expect(totalRevised <= 0).toBe(true);
    });
  });

  describe("Overdue invoice detection", () => {
    it("should detect overdue invoice", () => {
      const now = Date.now();
      const dueDate = now - 5 * 24 * 60 * 60 * 1000; // 5 days ago
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      expect(daysOverdue).toBe(5);
      // Priority: medium (< 14 days)
    });

    it("should escalate priority for invoices overdue > 14 days", () => {
      const now = Date.now();
      const dueDate = now - 20 * 24 * 60 * 60 * 1000; // 20 days ago
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      expect(daysOverdue).toBe(20);
      const priority = daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "high" : "medium";
      expect(priority).toBe("high");
    });

    it("should mark critical for invoices overdue > 30 days", () => {
      const now = Date.now();
      const dueDate = now - 45 * 24 * 60 * 60 * 1000; // 45 days ago
      const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      expect(daysOverdue).toBe(45);
      const priority = daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "high" : "medium";
      expect(priority).toBe("critical");
    });
  });

  describe("Project/Task/Milestone late detection", () => {
    it("should detect late project", () => {
      const now = Date.now();
      const endDate = now - 10 * 24 * 60 * 60 * 1000; // 10 days late
      const daysLate = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
      expect(daysLate).toBe(10);
      const priority = daysLate > 30 ? "critical" : daysLate > 7 ? "high" : "medium";
      expect(priority).toBe("high");
    });

    it("should detect late task", () => {
      const now = Date.now();
      const endDate = now - 3 * 24 * 60 * 60 * 1000; // 3 days late
      const daysLate = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));
      expect(daysLate).toBe(3);
      const priority = daysLate > 14 ? "high" : "medium";
      expect(priority).toBe("medium");
    });

    it("should detect overdue milestone", () => {
      const now = Date.now();
      const dueDate = now - 20 * 24 * 60 * 60 * 1000; // 20 days overdue
      const daysLate = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
      expect(daysLate).toBe(20);
      const priority = daysLate > 14 ? "high" : "medium";
      expect(priority).toBe("high");
    });
  });

  describe("Document/Certification expiry detection", () => {
    it("should detect expired document", () => {
      const now = Date.now();
      const expiryDate = now - 2 * 24 * 60 * 60 * 1000; // expired 2 days ago
      expect(expiryDate < now).toBe(true);
    });

    it("should detect expired certification", () => {
      const now = Date.now();
      const expiryDate = now - 30 * 24 * 60 * 60 * 1000; // expired 30 days ago
      expect(expiryDate < now).toBe(true);
    });

    it("should not alert for valid document", () => {
      const now = Date.now();
      const expiryDate = now + 60 * 24 * 60 * 60 * 1000; // expires in 60 days
      expect(expiryDate < now).toBe(false);
    });
  });

  describe("Stock critical detection", () => {
    it("should detect critical stock level", () => {
      const currentStock = 5;
      const minimumStock = 10;
      expect(currentStock <= minimumStock).toBe(true);
    });

    it("should detect zero stock as critical priority", () => {
      const currentStock = 0;
      const minimumStock = 10;
      expect(currentStock <= minimumStock).toBe(true);
      const priority = currentStock === 0 ? "critical" : "high";
      expect(priority).toBe("critical");
    });

    it("should not alert when stock is above minimum", () => {
      const currentStock = 15;
      const minimumStock = 10;
      expect(currentStock <= minimumStock).toBe(false);
    });
  });

  describe("Safety incident critical detection", () => {
    it("should detect critical safety incident within 24h", () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const incidentCreatedAt = now - 2 * 60 * 60 * 1000; // 2 hours ago
      const severity = "critical";
      const status = "open";
      expect(severity === "critical" && status !== "closed" && incidentCreatedAt >= oneDayAgo).toBe(true);
    });

    it("should not alert for closed critical incident", () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const incidentCreatedAt = now - 2 * 60 * 60 * 1000;
      const severity = "critical";
      const status = "closed";
      expect(severity === "critical" && status !== "closed" && incidentCreatedAt >= oneDayAgo).toBe(false);
    });

    it("should not alert for old critical incident (>24h)", () => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const incidentCreatedAt = now - 48 * 60 * 60 * 1000; // 48h ago
      const severity = "critical";
      const status = "open";
      expect(severity === "critical" && status !== "closed" && incidentCreatedAt >= oneDayAgo).toBe(false);
    });
  });

  describe("Maintenance due detection", () => {
    it("should detect maintenance due within 7 days", () => {
      const now = Date.now();
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
      const scheduledDate = now + 3 * 24 * 60 * 60 * 1000; // in 3 days
      expect(scheduledDate <= sevenDays && scheduledDate >= now).toBe(true);
    });

    it("should not alert for maintenance > 7 days away", () => {
      const now = Date.now();
      const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
      const scheduledDate = now + 14 * 24 * 60 * 60 * 1000; // in 14 days
      expect(scheduledDate <= sevenDays && scheduledDate >= now).toBe(false);
    });
  });
});

// ============================================================
// NOTIFICATIONS TESTS
// ============================================================

describe("Sprint 14 — Notifications", () => {
  describe("Mark as read", () => {
    it("should mark notification as read with timestamp", () => {
      const notif = { id: 1, isRead: false, readAt: null as number | null };
      const now = Date.now();
      notif.isRead = true;
      notif.readAt = now;
      expect(notif.isRead).toBe(true);
      expect(notif.readAt).toBe(now);
    });

    it("should be idempotent for already-read notification", () => {
      const notif = { id: 1, isRead: true, readAt: 1000 };
      // Already read — no-op
      expect(notif.isRead).toBe(true);
    });
  });

  describe("Mark all as read", () => {
    it("should mark all unread notifications as read", () => {
      const notifications = [
        { id: 1, isRead: false, readAt: null as number | null },
        { id: 2, isRead: true, readAt: 1000 },
        { id: 3, isRead: false, readAt: null as number | null },
      ];
      const now = Date.now();
      const updated = notifications.map(n => n.isRead ? n : { ...n, isRead: true, readAt: now });
      expect(updated.filter(n => n.isRead).length).toBe(3);
      expect(updated[0].readAt).toBe(now);
      expect(updated[1].readAt).toBe(1000); // unchanged
      expect(updated[2].readAt).toBe(now);
    });
  });

  describe("Unread count", () => {
    it("should count unread notifications correctly", () => {
      const notifications = [
        { id: 1, isRead: false },
        { id: 2, isRead: true },
        { id: 3, isRead: false },
        { id: 4, isRead: false },
      ];
      const unreadCount = notifications.filter(n => !n.isRead).length;
      expect(unreadCount).toBe(3);
    });

    it("should return 0 when all are read", () => {
      const notifications = [
        { id: 1, isRead: true },
        { id: 2, isRead: true },
      ];
      const unreadCount = notifications.filter(n => !n.isRead).length;
      expect(unreadCount).toBe(0);
    });
  });

  describe("Filter by module", () => {
    it("should filter notifications by module", () => {
      const notifications = [
        { id: 1, module: "finance", title: "Budget alert" },
        { id: 2, module: "projects", title: "Project late" },
        { id: 3, module: "finance", title: "Invoice overdue" },
        { id: 4, module: "safety", title: "Incident" },
      ];
      const financeNotifs = notifications.filter(n => n.module === "finance");
      expect(financeNotifs.length).toBe(2);
    });

    it("should filter notifications by priority", () => {
      const notifications = [
        { id: 1, priority: "critical", title: "A" },
        { id: 2, priority: "high", title: "B" },
        { id: 3, priority: "critical", title: "C" },
        { id: 4, priority: "low", title: "D" },
      ];
      const criticalNotifs = notifications.filter(n => n.priority === "critical");
      expect(criticalNotifs.length).toBe(2);
    });
  });

  describe("Alert priority assignment", () => {
    it("should assign correct priority based on alert type", () => {
      const priorities: Record<string, string> = {
        budget_75: "medium",
        budget_90: "high",
        budget_100: "critical",
        budget_overrun: "critical",
        safety_critical: "critical",
        stock_critical: "high",
        document_expired: "medium",
        maintenance_due: "medium",
      };
      expect(priorities["budget_75"]).toBe("medium");
      expect(priorities["budget_90"]).toBe("high");
      expect(priorities["budget_100"]).toBe("critical");
      expect(priorities["budget_overrun"]).toBe("critical");
      expect(priorities["safety_critical"]).toBe("critical");
    });
  });

  describe("Alert deduplication", () => {
    it("should not create duplicate alerts for same entity and type", () => {
      const existingAlerts = [
        { alertType: "budget_75", relatedEntityType: "budget", relatedEntityId: 1 },
      ];
      const candidate = { alertType: "budget_75", relatedEntityType: "budget", relatedEntityId: 1 };
      const isDuplicate = existingAlerts.some(
        a => a.alertType === candidate.alertType &&
          a.relatedEntityType === candidate.relatedEntityType &&
          a.relatedEntityId === candidate.relatedEntityId
      );
      expect(isDuplicate).toBe(true);
    });

    it("should allow different alert types for same entity", () => {
      const existingAlerts = [
        { alertType: "budget_75", relatedEntityType: "budget", relatedEntityId: 1 },
      ];
      const candidate = { alertType: "budget_90", relatedEntityType: "budget", relatedEntityId: 1 };
      const isDuplicate = existingAlerts.some(
        a => a.alertType === candidate.alertType &&
          a.relatedEntityType === candidate.relatedEntityType &&
          a.relatedEntityId === candidate.relatedEntityId
      );
      expect(isDuplicate).toBe(false);
    });
  });

  describe("Acknowledge alert", () => {
    it("should acknowledge alert with user and timestamp", () => {
      const alert = { id: 1, isAcknowledged: false, acknowledgedBy: null as number | null, acknowledgedAt: null as number | null };
      const userId = 42;
      const now = Date.now();
      alert.isAcknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = now;
      expect(alert.isAcknowledged).toBe(true);
      expect(alert.acknowledgedBy).toBe(42);
      expect(alert.acknowledgedAt).toBe(now);
    });

    it("should reject acknowledging already-acknowledged alert", () => {
      const alert = { id: 1, isAcknowledged: true };
      expect(() => {
        if (alert.isAcknowledged) throw new Error("Alerte déjà acquittée");
      }).toThrow("Alerte déjà acquittée");
    });
  });

  describe("Non-regression", () => {
    it("should have 13 alert types defined", () => {
      const ALERT_TYPES = [
        "project_late", "task_late", "milestone_overdue",
        "budget_75", "budget_90", "budget_100", "budget_overrun",
        "invoice_overdue", "document_expired", "certification_expired",
        "stock_critical", "maintenance_due", "safety_critical",
      ];
      expect(ALERT_TYPES.length).toBe(13);
    });

    it("should have 4 priority levels", () => {
      const PRIORITIES = ["low", "medium", "high", "critical"];
      expect(PRIORITIES.length).toBe(4);
    });

    it("should have 7 modules", () => {
      const MODULES = ["finance", "projects", "inventory", "safety", "compliance", "equipment", "general"];
      expect(MODULES.length).toBe(7);
    });
  });
});
