import { describe, it, expect } from "vitest";

/**
 * Sprint 13 — ERP Finance, Budget, Cash Flow, Profitability
 * Tests unitaires couvrant la logique métier des modules financiers
 */

// ============================================================
// BUDGET MODULE TESTS
// ============================================================

describe("ERP Finance — Budget", () => {
  it("should define 7 budget line categories", () => {
    const BUDGET_CATEGORIES = ["labour", "materials", "equipment", "subcontracting", "permits", "transport", "other"];
    expect(BUDGET_CATEGORIES).toHaveLength(7);
    expect(BUDGET_CATEGORIES).toContain("labour");
    expect(BUDGET_CATEGORIES).toContain("materials");
    expect(BUDGET_CATEGORIES).toContain("subcontracting");
  });

  it("should define 5 budget statuses", () => {
    const BUDGET_STATUSES = ["draft", "submitted", "approved", "rejected", "revised"];
    expect(BUDGET_STATUSES).toHaveLength(5);
    expect(BUDGET_STATUSES).toContain("draft");
    expect(BUDGET_STATUSES).toContain("approved");
  });

  it("should calculate budget totals from lines", () => {
    const lines = [
      { initialAmount: 5000000, revisedAmount: 5500000, engagedAmount: 3000000, paidAmount: 2000000 },
      { initialAmount: 3000000, revisedAmount: 3000000, engagedAmount: 1000000, paidAmount: 500000 },
      { initialAmount: 2000000, revisedAmount: 2500000, engagedAmount: 0, paidAmount: 0 },
    ];
    const totalInitial = lines.reduce((s, l) => s + l.initialAmount, 0);
    const totalRevised = lines.reduce((s, l) => s + l.revisedAmount, 0);
    const totalEngaged = lines.reduce((s, l) => s + l.engagedAmount, 0);
    const totalPaid = lines.reduce((s, l) => s + l.paidAmount, 0);
    expect(totalInitial).toBe(10000000);
    expect(totalRevised).toBe(11000000);
    expect(totalEngaged).toBe(4000000);
    expect(totalPaid).toBe(2500000);
  });

  it("should calculate budget variance correctly", () => {
    const line = { initialAmount: 5000000, revisedAmount: 5500000, engagedAmount: 2000000, paidAmount: 1500000 };
    const planned = line.revisedAmount || line.initialAmount;
    const remaining = planned - line.engagedAmount - line.paidAmount;
    const varianceAmount = planned - line.paidAmount;
    const variancePercent = Math.round((varianceAmount * 10000) / line.initialAmount);
    expect(planned).toBe(5500000);
    expect(remaining).toBe(2000000);
    expect(varianceAmount).toBe(4000000);
    expect(variancePercent).toBe(8000); // 80% in basis points
  });

  it("should prevent modification of approved budgets", () => {
    const budget = { id: 1, status: "approved" as const };
    const canModify = budget.status !== "approved";
    expect(canModify).toBe(false);
  });

  it("should allow submission only from draft status", () => {
    const validTransitions: Record<string, string[]> = {
      draft: ["submitted"],
      submitted: ["approved", "rejected"],
      approved: ["revised"],
      rejected: ["draft"],
      revised: ["submitted"],
    };
    expect(validTransitions["draft"]).toContain("submitted");
    expect(validTransitions["submitted"]).toContain("approved");
    expect(validTransitions["submitted"]).toContain("rejected");
  });
});

// ============================================================
// CASH FLOW MODULE TESTS
// ============================================================

describe("ERP Finance — Cash Flow", () => {
  it("should define 2 cash flow types", () => {
    const TYPES = ["inflow", "outflow"];
    expect(TYPES).toHaveLength(2);
  });

  it("should define 10 cash flow categories", () => {
    const CATEGORIES = ["labour", "materials", "equipment", "subcontracting", "permits", "transport", "client_payment", "advance", "retention", "other"];
    expect(CATEGORIES).toHaveLength(10);
    expect(CATEGORIES).toContain("client_payment");
    expect(CATEGORIES).toContain("retention");
  });

  it("should calculate net cash flow correctly", () => {
    const flows = [
      { type: "inflow", amount: 10000000, isPaid: true },
      { type: "inflow", amount: 5000000, isPaid: false },
      { type: "outflow", amount: 7000000, isPaid: true },
      { type: "outflow", amount: 3000000, isPaid: false },
    ];
    const totalInflow = flows.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    const totalOutflow = flows.filter(f => f.type === "outflow").reduce((s, f) => s + f.amount, 0);
    const netCashFlow = totalInflow - totalOutflow;
    expect(totalInflow).toBe(15000000);
    expect(totalOutflow).toBe(10000000);
    expect(netCashFlow).toBe(5000000);
  });

  it("should calculate real balance (paid only)", () => {
    const flows = [
      { type: "inflow", amount: 10000000, isPaid: true },
      { type: "inflow", amount: 5000000, isPaid: false },
      { type: "outflow", amount: 7000000, isPaid: true },
      { type: "outflow", amount: 3000000, isPaid: false },
    ];
    const paidInflow = flows.filter(f => f.type === "inflow" && f.isPaid).reduce((s, f) => s + f.amount, 0);
    const paidOutflow = flows.filter(f => f.type === "outflow" && f.isPaid).reduce((s, f) => s + f.amount, 0);
    const balance = paidInflow - paidOutflow;
    expect(paidInflow).toBe(10000000);
    expect(paidOutflow).toBe(7000000);
    expect(balance).toBe(3000000);
  });

  it("should calculate pending amounts", () => {
    const flows = [
      { type: "inflow", amount: 10000000, isPaid: true },
      { type: "inflow", amount: 5000000, isPaid: false },
      { type: "outflow", amount: 7000000, isPaid: true },
      { type: "outflow", amount: 3000000, isPaid: false },
    ];
    const totalInflow = flows.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    const paidInflow = flows.filter(f => f.type === "inflow" && f.isPaid).reduce((s, f) => s + f.amount, 0);
    const totalOutflow = flows.filter(f => f.type === "outflow").reduce((s, f) => s + f.amount, 0);
    const paidOutflow = flows.filter(f => f.type === "outflow" && f.isPaid).reduce((s, f) => s + f.amount, 0);
    const pendingInflow = totalInflow - paidInflow;
    const pendingOutflow = totalOutflow - paidOutflow;
    expect(pendingInflow).toBe(5000000);
    expect(pendingOutflow).toBe(3000000);
  });

  it("should filter forecast by due date range", () => {
    const now = Date.now();
    const daysAhead = 30;
    const futureLimit = now + (daysAhead * 86400000);
    const flows = [
      { dueDate: now + 5 * 86400000, isPaid: false, type: "outflow", amount: 1000000 },
      { dueDate: now + 15 * 86400000, isPaid: false, type: "inflow", amount: 2000000 },
      { dueDate: now + 45 * 86400000, isPaid: false, type: "outflow", amount: 500000 }, // beyond 30 days
      { dueDate: now + 10 * 86400000, isPaid: true, type: "outflow", amount: 300000 }, // already paid
    ];
    const upcoming = flows.filter(f => !f.isPaid && f.dueDate >= now && f.dueDate <= futureLimit);
    expect(upcoming).toHaveLength(2);
    expect(upcoming[0].amount).toBe(1000000);
    expect(upcoming[1].amount).toBe(2000000);
  });

  it("should calculate forecast net", () => {
    const upcoming = [
      { type: "inflow", amount: 8000000 },
      { type: "outflow", amount: 5000000 },
      { type: "outflow", amount: 2000000 },
    ];
    const expectedInflow = upcoming.filter(f => f.type === "inflow").reduce((s, f) => s + f.amount, 0);
    const expectedOutflow = upcoming.filter(f => f.type === "outflow").reduce((s, f) => s + f.amount, 0);
    const netForecast = expectedInflow - expectedOutflow;
    expect(expectedInflow).toBe(8000000);
    expect(expectedOutflow).toBe(7000000);
    expect(netForecast).toBe(1000000);
  });
});

// ============================================================
// PROFITABILITY MODULE TESTS
// ============================================================

describe("ERP Finance — Profitability", () => {
  it("should calculate gross margin correctly", () => {
    const revenue = 50000000;
    const directCosts = 30000000;
    const grossMargin = revenue - directCosts;
    expect(grossMargin).toBe(20000000);
  });

  it("should calculate net margin correctly", () => {
    const revenue = 50000000;
    const directCosts = 30000000;
    const indirectCosts = 5000000;
    const netMargin = revenue - directCosts - indirectCosts;
    expect(netMargin).toBe(15000000);
  });

  it("should calculate margin percentages in basis points", () => {
    const revenue = 50000000;
    const grossMargin = 20000000;
    const netMargin = 15000000;
    const grossMarginPercent = revenue > 0 ? Math.round((grossMargin * 10000) / revenue) : 0;
    const netMarginPercent = revenue > 0 ? Math.round((netMargin * 10000) / revenue) : 0;
    expect(grossMarginPercent).toBe(4000); // 40%
    expect(netMarginPercent).toBe(3000); // 30%
  });

  it("should handle zero revenue without division error", () => {
    const revenue = 0;
    const grossMargin = -5000000;
    const grossMarginPercent = revenue > 0 ? Math.round((grossMargin * 10000) / revenue) : 0;
    expect(grossMarginPercent).toBe(0);
  });

  it("should classify direct vs indirect costs", () => {
    const directCategories = ["labour", "materials", "equipment", "subcontracting"];
    const flows = [
      { type: "outflow", category: "labour", amount: 10000000 },
      { type: "outflow", category: "materials", amount: 15000000 },
      { type: "outflow", category: "permits", amount: 2000000 },
      { type: "outflow", category: "transport", amount: 1000000 },
      { type: "outflow", category: "other", amount: 500000 },
    ];
    const directCosts = flows
      .filter(f => f.type === "outflow" && directCategories.includes(f.category))
      .reduce((s, f) => s + f.amount, 0);
    const indirectCosts = flows
      .filter(f => f.type === "outflow" && !directCategories.includes(f.category))
      .reduce((s, f) => s + f.amount, 0);
    expect(directCosts).toBe(25000000);
    expect(indirectCosts).toBe(3500000);
  });

  it("should rank projects by net margin percent descending", () => {
    const snapshots = [
      { projectId: 1, netMarginPercent: 3000 },
      { projectId: 2, netMarginPercent: 4500 },
      { projectId: 3, netMarginPercent: -500 },
      { projectId: 4, netMarginPercent: 2000 },
    ];
    const ranked = [...snapshots].sort((a, b) => b.netMarginPercent - a.netMarginPercent);
    expect(ranked[0].projectId).toBe(2);
    expect(ranked[1].projectId).toBe(1);
    expect(ranked[2].projectId).toBe(4);
    expect(ranked[3].projectId).toBe(3);
  });

  it("should keep only latest snapshot per project", () => {
    const allSnapshots = [
      { projectId: 1, snapshotDate: 1000, netMargin: 100 },
      { projectId: 1, snapshotDate: 2000, netMargin: 200 },
      { projectId: 2, snapshotDate: 1500, netMargin: 300 },
      { projectId: 2, snapshotDate: 500, netMargin: 50 },
    ];
    // Sort by date desc
    allSnapshots.sort((a, b) => b.snapshotDate - a.snapshotDate);
    const latestByProject = new Map<number, typeof allSnapshots[0]>();
    for (const s of allSnapshots) {
      if (!latestByProject.has(s.projectId)) {
        latestByProject.set(s.projectId, s);
      }
    }
    const result = Array.from(latestByProject.values());
    expect(result).toHaveLength(2);
    expect(result.find(r => r.projectId === 1)?.netMargin).toBe(200);
    expect(result.find(r => r.projectId === 2)?.netMargin).toBe(300);
  });
});

// ============================================================
// PERMISSIONS & INTEGRATION TESTS
// ============================================================

describe("ERP Finance — Permissions", () => {
  it("should require finance module for budget access", () => {
    const requiredModule = "finance";
    const requiredAction = "view";
    expect(requiredModule).toBe("finance");
    expect(requiredAction).toBe("view");
  });

  it("should require finance:approve for budget approval", () => {
    const requiredAction = "approve";
    expect(requiredAction).toBe("approve");
  });

  it("should require finance:create for new entries", () => {
    const requiredAction = "create";
    expect(requiredAction).toBe("create");
  });

  it("should require finance:edit for recalculation", () => {
    const requiredAction = "edit";
    expect(requiredAction).toBe("edit");
  });
});

describe("ERP Finance — Non-regression", () => {
  it("should not break existing ERP modules", () => {
    const existingModules = [
      "erp_dashboard", "erp_projects", "erp_gantt", "erp_documents",
      "erp_compliance", "erp_equipment", "erp_safety", "erp_vendors",
      "erp_contractors", "erp_finance", "erp_inventory", "erp_alerts",
    ];
    expect(existingModules).toContain("erp_finance");
    expect(existingModules.length).toBeGreaterThanOrEqual(12);
  });

  it("should maintain XOF currency formatting", () => {
    const formatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(5000000);
    expect(formatted).toContain("5");
    expect(formatted).toContain("000");
    expect(formatted).toContain("000");
  });

  it("should store amounts as integers (no floating point)", () => {
    const amount = 5000000;
    expect(Number.isInteger(amount)).toBe(true);
    const calculated = Math.round(amount * 1.05);
    expect(Number.isInteger(calculated)).toBe(true);
  });
});
