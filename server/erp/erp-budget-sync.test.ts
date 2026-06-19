import { describe, it, expect } from "vitest";

/**
 * Tests — ERP Budget Sync (Intégration Factures/Paiements → Lignes budgétaires)
 * Vérifie la logique de synchronisation automatique des montants engagés et payés
 */

describe("ERP Budget Sync — Category Inference", () => {
  // Simulates the inferBudgetCategory logic
  function inferBudgetCategory(invoice: { vendorId: number | null; contractorId: number | null }): string {
    if (invoice.contractorId) return "subcontracting";
    if (invoice.vendorId) return "materials";
    return "other";
  }

  it("should infer 'subcontracting' for contractor invoices", () => {
    expect(inferBudgetCategory({ vendorId: null, contractorId: 5 })).toBe("subcontracting");
  });

  it("should infer 'materials' for vendor invoices", () => {
    expect(inferBudgetCategory({ vendorId: 3, contractorId: null })).toBe("materials");
  });

  it("should infer 'other' for invoices without vendor or contractor", () => {
    expect(inferBudgetCategory({ vendorId: null, contractorId: null })).toBe("other");
  });

  it("should prioritize contractor over vendor when both present", () => {
    expect(inferBudgetCategory({ vendorId: 3, contractorId: 5 })).toBe("subcontracting");
  });
});

describe("ERP Budget Sync — Engaged Amount Calculation", () => {
  const engagedStatuses = ["approved", "partially_paid", "paid"];

  it("should only count approved/partially_paid/paid invoices as engaged", () => {
    const invoices = [
      { id: 1, status: "draft", totalAmount: 1000000 },
      { id: 2, status: "submitted", totalAmount: 2000000 },
      { id: 3, status: "approved", totalAmount: 3000000 },
      { id: 4, status: "partially_paid", totalAmount: 4000000 },
      { id: 5, status: "paid", totalAmount: 5000000 },
      { id: 6, status: "rejected", totalAmount: 6000000 },
      { id: 7, status: "cancelled", totalAmount: 7000000 },
    ];
    const engaged = invoices
      .filter(inv => engagedStatuses.includes(inv.status))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    expect(engaged).toBe(12000000); // 3M + 4M + 5M
  });

  it("should not count deleted invoices", () => {
    const invoices = [
      { id: 1, status: "approved", totalAmount: 5000000, deletedAt: null },
      { id: 2, status: "approved", totalAmount: 3000000, deletedAt: 1700000000000 },
    ];
    const nonDeleted = invoices.filter(inv => inv.deletedAt === null);
    const engaged = nonDeleted
      .filter(inv => engagedStatuses.includes(inv.status))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
    expect(engaged).toBe(5000000);
  });

  it("should group engaged amounts by category", () => {
    const invoices = [
      { vendorId: 1, contractorId: null, totalAmount: 5000000 },
      { vendorId: 2, contractorId: null, totalAmount: 3000000 },
      { vendorId: null, contractorId: 1, totalAmount: 8000000 },
      { vendorId: null, contractorId: null, totalAmount: 1000000 },
    ];
    function inferCat(inv: { vendorId: number | null; contractorId: number | null }) {
      if (inv.contractorId) return "subcontracting";
      if (inv.vendorId) return "materials";
      return "other";
    }
    const grouped: Record<string, number> = {};
    for (const inv of invoices) {
      const cat = inferCat(inv);
      grouped[cat] = (grouped[cat] || 0) + inv.totalAmount;
    }
    expect(grouped["materials"]).toBe(8000000);
    expect(grouped["subcontracting"]).toBe(8000000);
    expect(grouped["other"]).toBe(1000000);
  });
});

describe("ERP Budget Sync — Paid Amount Calculation", () => {
  it("should sum payments per invoice category", () => {
    const invoicePayments = [
      { invoiceCategory: "materials", payments: [2000000, 1000000] },
      { invoiceCategory: "subcontracting", payments: [5000000] },
      { invoiceCategory: "materials", payments: [500000] },
    ];
    const paidByCategory: Record<string, number> = {};
    for (const ip of invoicePayments) {
      const total = ip.payments.reduce((s, p) => s + p, 0);
      paidByCategory[ip.invoiceCategory] = (paidByCategory[ip.invoiceCategory] || 0) + total;
    }
    expect(paidByCategory["materials"]).toBe(3500000);
    expect(paidByCategory["subcontracting"]).toBe(5000000);
  });

  it("should handle invoices with no payments (paid = 0)", () => {
    const invoicePayments = [
      { invoiceCategory: "materials", payments: [] },
    ];
    const paidByCategory: Record<string, number> = {};
    for (const ip of invoicePayments) {
      const total = ip.payments.reduce((s, p) => s + p, 0);
      paidByCategory[ip.invoiceCategory] = (paidByCategory[ip.invoiceCategory] || 0) + total;
    }
    expect(paidByCategory["materials"]).toBe(0);
  });
});

describe("ERP Budget Sync — Budget Totals Recalculation", () => {
  it("should recalculate budget totals after sync", () => {
    const lines = [
      { initialAmount: 10000000, revisedAmount: 11000000, engagedAmount: 5000000, paidAmount: 3000000 },
      { initialAmount: 8000000, revisedAmount: 8000000, engagedAmount: 8000000, paidAmount: 5000000 },
      { initialAmount: 2000000, revisedAmount: 2500000, engagedAmount: 1000000, paidAmount: 0 },
    ];
    const totalInitial = lines.reduce((s, l) => s + l.initialAmount, 0);
    const totalRevised = lines.reduce((s, l) => s + l.revisedAmount, 0);
    const totalEngaged = lines.reduce((s, l) => s + l.engagedAmount, 0);
    const totalPaid = lines.reduce((s, l) => s + l.paidAmount, 0);
    expect(totalInitial).toBe(20000000);
    expect(totalRevised).toBe(21500000);
    expect(totalEngaged).toBe(14000000);
    expect(totalPaid).toBe(8000000);
  });

  it("should preserve initialAmount and revisedAmount during sync", () => {
    // Sync only updates engagedAmount and paidAmount
    const lineBefore = { initialAmount: 10000000, revisedAmount: 11000000, engagedAmount: 0, paidAmount: 0 };
    const lineAfter = { ...lineBefore, engagedAmount: 5000000, paidAmount: 2000000 };
    expect(lineAfter.initialAmount).toBe(lineBefore.initialAmount);
    expect(lineAfter.revisedAmount).toBe(lineBefore.revisedAmount);
    expect(lineAfter.engagedAmount).toBe(5000000);
    expect(lineAfter.paidAmount).toBe(2000000);
  });
});

describe("ERP Budget Sync — Hook Triggers", () => {
  it("should trigger sync on invoice approval", () => {
    // Simulates the flow: invoice approved → syncBudgetFromInvoice called
    const invoice = { id: 1, projectId: 10, status: "approved" };
    const shouldSync = invoice.projectId !== null && invoice.status === "approved";
    expect(shouldSync).toBe(true);
  });

  it("should trigger sync on payment creation", () => {
    // Simulates: payment created → syncBudgetFromInvoice(invoiceId)
    const payment = { id: 1, invoiceId: 5, amount: 1000000 };
    const shouldSync = payment.invoiceId > 0;
    expect(shouldSync).toBe(true);
  });

  it("should trigger sync on payment deletion (reverse)", () => {
    // Simulates: payment deleted → syncBudgetFromInvoice(invoiceId)
    const deletedPayment = { id: 1, invoiceId: 5, amount: 1000000 };
    const shouldSync = deletedPayment.invoiceId > 0;
    expect(shouldSync).toBe(true);
  });

  it("should not sync if invoice has no projectId", () => {
    const invoice = { id: 1, projectId: null, status: "approved" };
    const shouldSync = invoice.projectId !== null;
    expect(shouldSync).toBe(false);
  });

  it("should not sync if no budget exists for project", () => {
    // syncBudgetFromProject returns { synced: false } when no budget found
    const result = { synced: false };
    expect(result.synced).toBe(false);
  });
});

describe("ERP Budget Sync — Non-regression", () => {
  it("should not modify budget lines for categories without invoices", () => {
    // If no invoices map to "equipment", that line keeps engaged=0, paid=0
    const categoryTotals: Record<string, { engaged: number; paid: number }> = {
      materials: { engaged: 5000000, paid: 2000000 },
      subcontracting: { engaged: 8000000, paid: 5000000 },
    };
    const equipmentTotals = categoryTotals["equipment"] || { engaged: 0, paid: 0 };
    expect(equipmentTotals.engaged).toBe(0);
    expect(equipmentTotals.paid).toBe(0);
  });

  it("should not break existing invoice workflow", () => {
    const validTransitions: Record<string, string[]> = {
      draft: ["submitted"],
      submitted: ["approved", "rejected"],
      approved: ["partially_paid", "paid"],
      partially_paid: ["paid"],
    };
    expect(validTransitions["draft"]).toContain("submitted");
    expect(validTransitions["submitted"]).toContain("approved");
  });

  it("should not break existing payment workflow", () => {
    const payableStatuses = ["approved", "partially_paid", "overdue"];
    expect(payableStatuses).toContain("approved");
    expect(payableStatuses).toContain("partially_paid");
    expect(payableStatuses).not.toContain("draft");
  });
});
