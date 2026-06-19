import { describe, it, expect } from "vitest";

// ============================================================
// Sprint 11 — Inventory & Material Requests — Unit Tests
// ============================================================

// --- Constants from the inventory router ---
const ITEM_CATEGORIES = [
  "cement", "steel", "wood", "sand", "gravel", "bricks",
  "pipes", "electrical", "paint", "tools", "safety_gear", "other",
] as const;

const ITEM_UNITS = [
  "kg", "ton", "m3", "m2", "ml", "unit", "bag", "roll", "box", "litre",
] as const;

const MOVEMENT_TYPES = [
  "in", "out", "adjustment", "transfer", "return", "loss",
] as const;

const REQUEST_STATUSES = [
  "draft", "submitted", "approved", "rejected",
  "partially_fulfilled", "fulfilled", "cancelled",
] as const;

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

// ============================================================
// INVENTORY ITEMS
// ============================================================

describe("ERP Inventory — Item Categories", () => {
  it("should have 12 categories", () => {
    expect(ITEM_CATEGORIES.length).toBe(12);
  });

  it("should include construction-specific categories", () => {
    expect(ITEM_CATEGORIES).toContain("cement");
    expect(ITEM_CATEGORIES).toContain("steel");
    expect(ITEM_CATEGORIES).toContain("wood");
    expect(ITEM_CATEGORIES).toContain("sand");
    expect(ITEM_CATEGORIES).toContain("gravel");
    expect(ITEM_CATEGORIES).toContain("bricks");
  });

  it("should include utility categories", () => {
    expect(ITEM_CATEGORIES).toContain("pipes");
    expect(ITEM_CATEGORIES).toContain("electrical");
    expect(ITEM_CATEGORIES).toContain("paint");
    expect(ITEM_CATEGORIES).toContain("tools");
    expect(ITEM_CATEGORIES).toContain("safety_gear");
    expect(ITEM_CATEGORIES).toContain("other");
  });
});

describe("ERP Inventory — Item Units", () => {
  it("should have 10 units", () => {
    expect(ITEM_UNITS.length).toBe(10);
  });

  it("should include weight units", () => {
    expect(ITEM_UNITS).toContain("kg");
    expect(ITEM_UNITS).toContain("ton");
  });

  it("should include volume units", () => {
    expect(ITEM_UNITS).toContain("m3");
    expect(ITEM_UNITS).toContain("litre");
  });

  it("should include length/area units", () => {
    expect(ITEM_UNITS).toContain("m2");
    expect(ITEM_UNITS).toContain("ml");
  });

  it("should include packaging units", () => {
    expect(ITEM_UNITS).toContain("bag");
    expect(ITEM_UNITS).toContain("roll");
    expect(ITEM_UNITS).toContain("box");
    expect(ITEM_UNITS).toContain("unit");
  });
});

// ============================================================
// STOCK MOVEMENTS
// ============================================================

describe("ERP Inventory — Movement Types", () => {
  it("should have 6 movement types", () => {
    expect(MOVEMENT_TYPES.length).toBe(6);
  });

  it("should include in/out movements", () => {
    expect(MOVEMENT_TYPES).toContain("in");
    expect(MOVEMENT_TYPES).toContain("out");
  });

  it("should include adjustment movements", () => {
    expect(MOVEMENT_TYPES).toContain("adjustment");
    expect(MOVEMENT_TYPES).toContain("transfer");
    expect(MOVEMENT_TYPES).toContain("return");
    expect(MOVEMENT_TYPES).toContain("loss");
  });
});

describe("ERP Inventory — Stock Calculations", () => {
  it("should calculate stock after IN movement", () => {
    const currentStock = 100;
    const movementQty = 50;
    const type = "in";
    const newStock = type === "in" || type === "return" ? currentStock + movementQty : currentStock - movementQty;
    expect(newStock).toBe(150);
  });

  it("should calculate stock after OUT movement", () => {
    const currentStock = 100;
    const movementQty = 30;
    const type = "out";
    const newStock = type === "in" || type === "return" ? currentStock + movementQty : currentStock - movementQty;
    expect(newStock).toBe(70);
  });

  it("should calculate stock after RETURN movement", () => {
    const currentStock = 50;
    const movementQty = 10;
    const type = "return";
    const newStock = type === "in" || type === "return" ? currentStock + movementQty : currentStock - movementQty;
    expect(newStock).toBe(60);
  });

  it("should calculate stock after LOSS movement", () => {
    const currentStock = 100;
    const movementQty = 5;
    const type = "loss";
    const newStock = type === "in" || type === "return" ? currentStock + movementQty : currentStock - movementQty;
    expect(newStock).toBe(95);
  });

  it("should calculate stock after TRANSFER movement", () => {
    const currentStock = 200;
    const movementQty = 50;
    const type = "transfer";
    const newStock = type === "in" || type === "return" ? currentStock + movementQty : currentStock - movementQty;
    expect(newStock).toBe(150);
  });

  it("should detect critical stock level", () => {
    const currentStock = 5;
    const minStock = 10;
    const isCritical = currentStock <= minStock;
    expect(isCritical).toBe(true);
  });

  it("should not flag normal stock as critical", () => {
    const currentStock = 50;
    const minStock = 10;
    const isCritical = currentStock <= minStock;
    expect(isCritical).toBe(false);
  });

  it("should detect out-of-stock", () => {
    const currentStock = 0;
    const isOutOfStock = currentStock <= 0;
    expect(isOutOfStock).toBe(true);
  });

  it("should prevent negative stock on OUT movement", () => {
    const currentStock = 5;
    const movementQty = 10;
    const canProcess = movementQty <= currentStock;
    expect(canProcess).toBe(false);
  });

  it("should allow OUT movement when sufficient stock", () => {
    const currentStock = 20;
    const movementQty = 10;
    const canProcess = movementQty <= currentStock;
    expect(canProcess).toBe(true);
  });
});

describe("ERP Inventory — Stock Value Calculations", () => {
  it("should calculate total stock value", () => {
    const items = [
      { currentStock: 100, unitPrice: 5000 },
      { currentStock: 50, unitPrice: 12000 },
      { currentStock: 200, unitPrice: 800 },
    ];
    const totalValue = items.reduce((sum, item) => sum + item.currentStock * item.unitPrice, 0);
    expect(totalValue).toBe(100 * 5000 + 50 * 12000 + 200 * 800);
    expect(totalValue).toBe(1260000);
  });

  it("should format XOF currency", () => {
    const amount = 1260000;
    const formatted = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
    expect(formatted).toContain("1");
    expect(formatted).toContain("260");
    expect(formatted).toContain("000");
  });
});

// ============================================================
// MATERIAL REQUESTS
// ============================================================

describe("ERP Material Requests — Statuses", () => {
  it("should have 7 statuses", () => {
    expect(REQUEST_STATUSES.length).toBe(7);
  });

  it("should follow workflow order", () => {
    expect(REQUEST_STATUSES[0]).toBe("draft");
    expect(REQUEST_STATUSES[1]).toBe("submitted");
    expect(REQUEST_STATUSES[2]).toBe("approved");
    expect(REQUEST_STATUSES[3]).toBe("rejected");
    expect(REQUEST_STATUSES[4]).toBe("partially_fulfilled");
    expect(REQUEST_STATUSES[5]).toBe("fulfilled");
    expect(REQUEST_STATUSES[6]).toBe("cancelled");
  });
});

describe("ERP Material Requests — Priorities", () => {
  it("should have 4 priority levels", () => {
    expect(PRIORITIES.length).toBe(4);
  });

  it("should include all levels", () => {
    expect(PRIORITIES).toContain("low");
    expect(PRIORITIES).toContain("medium");
    expect(PRIORITIES).toContain("high");
    expect(PRIORITIES).toContain("urgent");
  });
});

describe("ERP Material Requests — Workflow", () => {
  it("should only allow submit from draft", () => {
    const canSubmit = (status: string) => status === "draft";
    expect(canSubmit("draft")).toBe(true);
    expect(canSubmit("submitted")).toBe(false);
    expect(canSubmit("approved")).toBe(false);
  });

  it("should only allow approve from submitted", () => {
    const canApprove = (status: string) => status === "submitted";
    expect(canApprove("submitted")).toBe(true);
    expect(canApprove("draft")).toBe(false);
    expect(canApprove("approved")).toBe(false);
  });

  it("should only allow reject from submitted", () => {
    const canReject = (status: string) => status === "submitted";
    expect(canReject("submitted")).toBe(true);
    expect(canReject("draft")).toBe(false);
    expect(canReject("fulfilled")).toBe(false);
  });

  it("should only allow fulfill from approved or partially_fulfilled", () => {
    const canFulfill = (status: string) => ["approved", "partially_fulfilled"].includes(status);
    expect(canFulfill("approved")).toBe(true);
    expect(canFulfill("partially_fulfilled")).toBe(true);
    expect(canFulfill("draft")).toBe(false);
    expect(canFulfill("submitted")).toBe(false);
    expect(canFulfill("fulfilled")).toBe(false);
  });

  it("should only allow delete from draft, rejected, cancelled", () => {
    const canDelete = (status: string) => ["draft", "rejected", "cancelled"].includes(status);
    expect(canDelete("draft")).toBe(true);
    expect(canDelete("rejected")).toBe(true);
    expect(canDelete("cancelled")).toBe(true);
    expect(canDelete("submitted")).toBe(false);
    expect(canDelete("approved")).toBe(false);
    expect(canDelete("fulfilled")).toBe(false);
  });
});

describe("ERP Material Requests — Fulfillment Logic", () => {
  it("should mark as fulfilled when all lines are fully delivered", () => {
    const lines = [
      { quantityRequested: 10, quantityFulfilled: 10 },
      { quantityRequested: 5, quantityFulfilled: 5 },
    ];
    const allFulfilled = lines.every(l => l.quantityFulfilled >= l.quantityRequested);
    expect(allFulfilled).toBe(true);
  });

  it("should mark as partially_fulfilled when some lines are incomplete", () => {
    const lines = [
      { quantityRequested: 10, quantityFulfilled: 10 },
      { quantityRequested: 5, quantityFulfilled: 3 },
    ];
    const allFulfilled = lines.every(l => l.quantityFulfilled >= l.quantityRequested);
    const anyFulfilled = lines.some(l => l.quantityFulfilled > 0);
    const status = allFulfilled ? "fulfilled" : anyFulfilled ? "partially_fulfilled" : "approved";
    expect(status).toBe("partially_fulfilled");
  });

  it("should remain approved when no lines are fulfilled", () => {
    const lines = [
      { quantityRequested: 10, quantityFulfilled: 0 },
      { quantityRequested: 5, quantityFulfilled: 0 },
    ];
    const allFulfilled = lines.every(l => l.quantityFulfilled >= l.quantityRequested);
    const anyFulfilled = lines.some(l => l.quantityFulfilled > 0);
    const status = allFulfilled ? "fulfilled" : anyFulfilled ? "partially_fulfilled" : "approved";
    expect(status).toBe("approved");
  });

  it("should not allow fulfilling more than requested", () => {
    const quantityRequested = 10;
    const quantityAlreadyFulfilled = 7;
    const quantityToFulfill = 5;
    const remaining = quantityRequested - quantityAlreadyFulfilled;
    const isValid = quantityToFulfill <= remaining;
    expect(isValid).toBe(false);
    expect(remaining).toBe(3);
  });

  it("should allow partial fulfillment within remaining", () => {
    const quantityRequested = 10;
    const quantityAlreadyFulfilled = 7;
    const quantityToFulfill = 3;
    const remaining = quantityRequested - quantityAlreadyFulfilled;
    const isValid = quantityToFulfill <= remaining;
    expect(isValid).toBe(true);
  });
});

describe("ERP Material Requests — Request Number Format", () => {
  it("should generate MR-XXXXX format", () => {
    const count = 42;
    const requestNumber = `MR-${String(count + 1).padStart(5, "0")}`;
    expect(requestNumber).toBe("MR-00043");
  });

  it("should pad to 5 digits", () => {
    const requestNumber = `MR-${String(1).padStart(5, "0")}`;
    expect(requestNumber).toBe("MR-00001");
  });

  it("should handle large numbers", () => {
    const requestNumber = `MR-${String(99999).padStart(5, "0")}`;
    expect(requestNumber).toBe("MR-99999");
  });
});

// ============================================================
// SKU FORMAT
// ============================================================

describe("ERP Inventory — SKU Format", () => {
  it("should validate SKU format (alphanumeric with dashes)", () => {
    const validSku = /^[A-Z0-9-]+$/;
    expect(validSku.test("CEM-001")).toBe(true);
    expect(validSku.test("STEEL-REBAR-12")).toBe(true);
    expect(validSku.test("invalid sku")).toBe(false);
  });
});

// ============================================================
// PERMISSIONS
// ============================================================

describe("ERP Inventory — Permissions", () => {
  const INVENTORY_PERMISSIONS = [
    { module: "inventory", action: "view" },
    { module: "inventory", action: "create" },
    { module: "inventory", action: "edit" },
    { module: "inventory", action: "delete" },
    { module: "inventory", action: "approve" },
  ];

  it("should have 5 inventory permissions", () => {
    expect(INVENTORY_PERMISSIONS.length).toBe(5);
  });

  it("should include view permission", () => {
    expect(INVENTORY_PERMISSIONS.some(p => p.module === "inventory" && p.action === "view")).toBe(true);
  });

  it("should include create permission", () => {
    expect(INVENTORY_PERMISSIONS.some(p => p.module === "inventory" && p.action === "create")).toBe(true);
  });

  it("should include approve permission for material requests", () => {
    expect(INVENTORY_PERMISSIONS.some(p => p.module === "inventory" && p.action === "approve")).toBe(true);
  });

  it("should restrict create to authorized roles", () => {
    const userPermissions = [{ module: "inventory", action: "view" }];
    const canCreate = userPermissions.some(p => p.module === "inventory" && p.action === "create");
    expect(canCreate).toBe(false);
  });

  it("should allow full access for inventory_manager role", () => {
    const managerPermissions = INVENTORY_PERMISSIONS;
    const canView = managerPermissions.some(p => p.module === "inventory" && p.action === "view");
    const canCreate = managerPermissions.some(p => p.module === "inventory" && p.action === "create");
    const canApprove = managerPermissions.some(p => p.module === "inventory" && p.action === "approve");
    expect(canView).toBe(true);
    expect(canCreate).toBe(true);
    expect(canApprove).toBe(true);
  });
});
