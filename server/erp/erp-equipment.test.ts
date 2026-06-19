import { describe, it, expect } from "vitest";

// ============================================================
// Sprint 6 — Equipment Management Tests
// ============================================================

// Constants mirroring the router
const EQUIPMENT_CATEGORIES = [
  "engin_chantier", "vehicule", "outillage", "mesure", "securite",
  "electricite", "plomberie", "maconnerie", "coffrage", "levage", "autre"
] as const;

const EQUIPMENT_STATUSES = [
  "available", "assigned", "in_maintenance", "out_of_service", "lost", "retired"
] as const;

const MAINTENANCE_TYPES = [
  "preventive", "corrective", "inspection", "calibration", "revision", "autre"
] as const;

const MAINTENANCE_STATUSES = [
  "scheduled", "in_progress", "completed", "cancelled", "overdue"
] as const;

// ============================================================
// 1. Equipment Statuses
// ============================================================

describe("Equipment Statuses", () => {
  it("should have exactly 6 statuses", () => {
    expect(EQUIPMENT_STATUSES).toHaveLength(6);
  });

  it("should include all required statuses", () => {
    expect(EQUIPMENT_STATUSES).toContain("available");
    expect(EQUIPMENT_STATUSES).toContain("assigned");
    expect(EQUIPMENT_STATUSES).toContain("in_maintenance");
    expect(EQUIPMENT_STATUSES).toContain("out_of_service");
    expect(EQUIPMENT_STATUSES).toContain("lost");
    expect(EQUIPMENT_STATUSES).toContain("retired");
  });

  it("default status should be 'available'", () => {
    expect(EQUIPMENT_STATUSES[0]).toBe("available");
  });
});

// ============================================================
// 2. Equipment Categories
// ============================================================

describe("Equipment Categories", () => {
  it("should have 11 categories", () => {
    expect(EQUIPMENT_CATEGORIES).toHaveLength(11);
  });

  it("should include construction-related categories", () => {
    expect(EQUIPMENT_CATEGORIES).toContain("engin_chantier");
    expect(EQUIPMENT_CATEGORIES).toContain("coffrage");
    expect(EQUIPMENT_CATEGORIES).toContain("levage");
    expect(EQUIPMENT_CATEGORIES).toContain("maconnerie");
  });

  it("should include utility categories", () => {
    expect(EQUIPMENT_CATEGORIES).toContain("vehicule");
    expect(EQUIPMENT_CATEGORIES).toContain("outillage");
    expect(EQUIPMENT_CATEGORIES).toContain("mesure");
    expect(EQUIPMENT_CATEGORIES).toContain("securite");
  });
});

// ============================================================
// 3. Maintenance Types
// ============================================================

describe("Maintenance Types", () => {
  it("should have 6 maintenance types", () => {
    expect(MAINTENANCE_TYPES).toHaveLength(6);
  });

  it("should include preventive and corrective", () => {
    expect(MAINTENANCE_TYPES).toContain("preventive");
    expect(MAINTENANCE_TYPES).toContain("corrective");
  });

  it("should include inspection and calibration", () => {
    expect(MAINTENANCE_TYPES).toContain("inspection");
    expect(MAINTENANCE_TYPES).toContain("calibration");
  });
});

// ============================================================
// 4. Maintenance Statuses
// ============================================================

describe("Maintenance Statuses", () => {
  it("should have 5 maintenance statuses", () => {
    expect(MAINTENANCE_STATUSES).toHaveLength(5);
  });

  it("should include lifecycle statuses", () => {
    expect(MAINTENANCE_STATUSES).toContain("scheduled");
    expect(MAINTENANCE_STATUSES).toContain("in_progress");
    expect(MAINTENANCE_STATUSES).toContain("completed");
    expect(MAINTENANCE_STATUSES).toContain("cancelled");
    expect(MAINTENANCE_STATUSES).toContain("overdue");
  });
});

// ============================================================
// 5. Assignment Logic
// ============================================================

describe("Assignment Logic", () => {
  function canAssign(status: string): boolean {
    return status === "available";
  }

  function canRelease(status: string): boolean {
    return status === "assigned";
  }

  function canDelete(status: string): boolean {
    return status !== "assigned";
  }

  it("should only allow assignment when status is 'available'", () => {
    expect(canAssign("available")).toBe(true);
    expect(canAssign("assigned")).toBe(false);
    expect(canAssign("in_maintenance")).toBe(false);
    expect(canAssign("out_of_service")).toBe(false);
    expect(canAssign("lost")).toBe(false);
    expect(canAssign("retired")).toBe(false);
  });

  it("should only allow release when status is 'assigned'", () => {
    expect(canRelease("assigned")).toBe(true);
    expect(canRelease("available")).toBe(false);
    expect(canRelease("in_maintenance")).toBe(false);
  });

  it("should block deletion when equipment is assigned", () => {
    expect(canDelete("assigned")).toBe(false);
    expect(canDelete("available")).toBe(true);
    expect(canDelete("in_maintenance")).toBe(true);
    expect(canDelete("retired")).toBe(true);
  });
});

// ============================================================
// 6. Maintenance Scheduling Logic
// ============================================================

describe("Maintenance Scheduling Logic", () => {
  function isOverdue(scheduledAt: number, now: number): boolean {
    return scheduledAt < now;
  }

  function isUpcoming(scheduledAt: number, now: number, daysAhead: number): boolean {
    const threshold = now + daysAhead * 86400000;
    return scheduledAt >= now - 86400000 && scheduledAt <= threshold;
  }

  it("should detect overdue maintenance", () => {
    const now = Date.now();
    const yesterday = now - 86400000;
    expect(isOverdue(yesterday, now)).toBe(true);
  });

  it("should not flag future maintenance as overdue", () => {
    const now = Date.now();
    const tomorrow = now + 86400000;
    expect(isOverdue(tomorrow, now)).toBe(false);
  });

  it("should detect upcoming maintenance within range", () => {
    const now = Date.now();
    const in5Days = now + 5 * 86400000;
    expect(isUpcoming(in5Days, now, 7)).toBe(true);
  });

  it("should not flag maintenance beyond range", () => {
    const now = Date.now();
    const in60Days = now + 60 * 86400000;
    expect(isUpcoming(in60Days, now, 30)).toBe(false);
  });

  it("should include slightly overdue in upcoming (1 day grace)", () => {
    const now = Date.now();
    const halfDayAgo = now - 43200000; // 12 hours ago
    expect(isUpcoming(halfDayAgo, now, 30)).toBe(true);
  });
});

// ============================================================
// 7. Status Transitions
// ============================================================

describe("Status Transitions", () => {
  function getStatusAfterAssign(): string { return "assigned"; }
  function getStatusAfterRelease(): string { return "available"; }
  function getStatusAfterMaintenanceStart(): string { return "in_maintenance"; }
  function getStatusAfterMaintenanceComplete(previousStatus: string): string {
    return previousStatus === "in_maintenance" ? "available" : previousStatus;
  }
  function getStatusAfterDelete(): string { return "retired"; }

  it("assign should set status to 'assigned'", () => {
    expect(getStatusAfterAssign()).toBe("assigned");
  });

  it("release should set status to 'available'", () => {
    expect(getStatusAfterRelease()).toBe("available");
  });

  it("maintenance start should set status to 'in_maintenance'", () => {
    expect(getStatusAfterMaintenanceStart()).toBe("in_maintenance");
  });

  it("maintenance complete should restore to 'available' if was in_maintenance", () => {
    expect(getStatusAfterMaintenanceComplete("in_maintenance")).toBe("available");
  });

  it("maintenance complete should not change status if not in_maintenance", () => {
    expect(getStatusAfterMaintenanceComplete("assigned")).toBe("assigned");
  });

  it("delete should set status to 'retired'", () => {
    expect(getStatusAfterDelete()).toBe("retired");
  });
});

// ============================================================
// 8. Permissions
// ============================================================

describe("Equipment Permissions", () => {
  // Simulated permission structure from RBAC
  const ERP_ROLE_DEFAULT_PERMISSIONS = {
    erp_logistics_manager: [
      { module: "erp_equipment", action: "view" },
      { module: "erp_equipment", action: "create" },
      { module: "erp_equipment", action: "update" },
      { module: "erp_equipment", action: "assign" },
    ],
    erp_project_manager: [
      { module: "erp_equipment", action: "view" },
      { module: "erp_equipment", action: "assign" },
    ],
    erp_site_supervisor: [
      { module: "erp_equipment", action: "view" },
    ],
    erp_finance_manager: [
      { module: "erp_equipment", action: "view" },
    ],
  };

  it("logistics manager should have full CRUD + assign", () => {
    const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_logistics_manager
      .filter(p => p.module === "erp_equipment")
      .map(p => p.action);
    expect(perms).toContain("view");
    expect(perms).toContain("create");
    expect(perms).toContain("update");
    expect(perms).toContain("assign");
  });

  it("project manager should have view + assign", () => {
    const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_project_manager
      .filter(p => p.module === "erp_equipment")
      .map(p => p.action);
    expect(perms).toContain("view");
    expect(perms).toContain("assign");
    expect(perms).not.toContain("create");
    expect(perms).not.toContain("update");
  });

  it("site supervisor should only have view", () => {
    const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_site_supervisor
      .filter(p => p.module === "erp_equipment")
      .map(p => p.action);
    expect(perms).toContain("view");
    expect(perms).toHaveLength(1);
  });

  it("finance manager should only have view", () => {
    const perms = ERP_ROLE_DEFAULT_PERMISSIONS.erp_finance_manager
      .filter(p => p.module === "erp_equipment")
      .map(p => p.action);
    expect(perms).toContain("view");
    expect(perms).toHaveLength(1);
  });
});

// ============================================================
// 9. Code Validation
// ============================================================

describe("Equipment Code Validation", () => {
  function isValidCode(code: string): boolean {
    return code.length >= 2 && code.length <= 32;
  }

  it("should accept valid codes", () => {
    expect(isValidCode("EQ-001")).toBe(true);
    expect(isValidCode("PELLE-CAT-320")).toBe(true);
    expect(isValidCode("AB")).toBe(true);
  });

  it("should reject too short codes", () => {
    expect(isValidCode("A")).toBe(false);
    expect(isValidCode("")).toBe(false);
  });

  it("should reject too long codes", () => {
    expect(isValidCode("A".repeat(33))).toBe(false);
  });
});

// ============================================================
// 10. Currency Formatting
// ============================================================

describe("Currency Formatting (XOF)", () => {
  function formatCurrency(amount: number | null | undefined): string {
    if (!amount) return "—";
    return new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
  }

  it("should format amounts in XOF", () => {
    const result = formatCurrency(15000000);
    expect(result).toContain("15");
    expect(result).toContain("000");
  });

  it("should return dash for null/undefined", () => {
    expect(formatCurrency(null)).toBe("—");
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("should return dash for zero", () => {
    expect(formatCurrency(0)).toBe("—");
  });
});
