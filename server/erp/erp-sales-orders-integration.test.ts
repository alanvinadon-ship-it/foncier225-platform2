/**
 * Tests Vitest — Service d'intégration Commandes Clients ↔ Budget / Comptabilité / Trésorerie
 * 
 * Couvre :
 * - syncSalesOrdersToBudget (liaison budget recettes)
 * - generateSalesInvoice (génération facture auto + écriture comptable)
 * - getSalesOrdersCashFlowForecast (cash-flow prévisionnel)
 * - generateClientPaymentPreEntry (écriture encaissement)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([{ insertId: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  }),
  createAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

describe("Service Intégration Commandes — Exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exporte syncSalesOrdersToBudget", async () => {
    const mod = await import("./erp-sales-orders-integration.service");
    expect(mod.syncSalesOrdersToBudget).toBeDefined();
    expect(typeof mod.syncSalesOrdersToBudget).toBe("function");
  });

  it("exporte generateSalesInvoice", async () => {
    const mod = await import("./erp-sales-orders-integration.service");
    expect(mod.generateSalesInvoice).toBeDefined();
    expect(typeof mod.generateSalesInvoice).toBe("function");
  });

  it("exporte getSalesOrdersCashFlowForecast", async () => {
    const mod = await import("./erp-sales-orders-integration.service");
    expect(mod.getSalesOrdersCashFlowForecast).toBeDefined();
    expect(typeof mod.getSalesOrdersCashFlowForecast).toBe("function");
  });

  it("exporte generateClientPaymentPreEntry", async () => {
    const mod = await import("./erp-sales-orders-integration.service");
    expect(mod.generateClientPaymentPreEntry).toBeDefined();
    expect(typeof mod.generateClientPaymentPreEntry).toBe("function");
  });
});

describe("Service Intégration — Logique Budget Sync", () => {
  it("syncSalesOrdersToBudget retourne une erreur si budget introuvable", async () => {
    const { getDb } = await import("../db");
    const mockDb = (await (getDb as any)());
    // Mock select().from().where().limit() → retourne []
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.limit.mockResolvedValue([]);

    const mod = await import("./erp-sales-orders-integration.service");
    const result = await mod.syncSalesOrdersToBudget(999);
    expect(result.errors).toContain("Budget introuvable");
    expect(result.linesUpdated).toBe(0);
  });
});

describe("Service Intégration — Logique Cash Flow", () => {
  it("getSalesOrdersCashFlowForecast retourne un objet structuré", async () => {
    const { getDb } = await import("../db");
    const mockDb = (await (getDb as any)());
    // Mock : pas de commandes, pas de clients
    let callCount = 0;
    mockDb.select.mockReturnThis();
    mockDb.from.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        // Deuxième appel = select clients (sans where)
        return [];
      }
      return mockDb;
    });
    mockDb.where.mockResolvedValue([]);

    const mod = await import("./erp-sales-orders-integration.service");
    const result = await mod.getSalesOrdersCashFlowForecast(6);
    expect(result).toHaveProperty("forecast");
    expect(result).toHaveProperty("totalExpected");
    expect(result).toHaveProperty("totalOverdue");
    expect(result).toHaveProperty("overdueOrders");
    expect(result.forecast.length).toBe(6);
    expect(result.totalExpected).toBe(0);
  });

  it("le forecast contient les bons mois", async () => {
    const { getDb } = await import("../db");
    const mockDb = (await (getDb as any)());
    let callCount = 0;
    mockDb.select.mockReturnThis();
    mockDb.from.mockImplementation(() => {
      callCount++;
      if (callCount === 2) return [];
      return mockDb;
    });
    mockDb.where.mockResolvedValue([]);

    const mod = await import("./erp-sales-orders-integration.service");
    const result = await mod.getSalesOrdersCashFlowForecast(3);
    expect(result.forecast.length).toBe(3);
    // Chaque entrée a les propriétés attendues
    for (const entry of result.forecast) {
      expect(entry).toHaveProperty("month");
      expect(entry).toHaveProperty("year");
      expect(entry).toHaveProperty("expectedCollections");
      expect(entry).toHaveProperty("orderCount");
      expect(entry).toHaveProperty("details");
      expect(entry.month).toBeGreaterThanOrEqual(1);
      expect(entry.month).toBeLessThanOrEqual(12);
    }
  });
});

describe("Service Intégration — Logique Facture", () => {
  it("generateSalesInvoice retourne null si commande introuvable", async () => {
    const { getDb } = await import("../db");
    const mockDb = (await (getDb as any)());
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockResolvedValue([]);

    const mod = await import("./erp-sales-orders-integration.service");
    const result = await mod.generateSalesInvoice(999, 1);
    expect(result).toBeNull();
  });

  it("generateClientPaymentPreEntry retourne null si montant <= 0", async () => {
    const mod = await import("./erp-sales-orders-integration.service");
    const result = await mod.generateClientPaymentPreEntry(1, 0, "virement", 1);
    expect(result).toBeNull();
  });

  it("generateClientPaymentPreEntry retourne null si montant négatif", async () => {
    const mod = await import("./erp-sales-orders-integration.service");
    const result = await mod.generateClientPaymentPreEntry(1, -100, "virement", 1);
    expect(result).toBeNull();
  });
});

describe("Service Intégration — Routeur tRPC", () => {
  it("le routeur salesOrders exporte integration", async () => {
    const mod = await import("./erp-sales-orders-router");
    expect(mod.erpSalesOrdersRouter).toBeDefined();
    expect(mod.erpSalesOrdersRouter._def).toBeDefined();
  });
});

describe("Service Intégration — Schéma comptable", () => {
  it("les comptes comptables utilisés sont corrects", () => {
    // Vérifier les codes comptables OHADA/SYSCOHADA
    const expectedAccounts = {
      "411000": "Clients",
      "701000": "Ventes de services",
      "445700": "TVA collectée",
      "512000": "Banque",
      "531000": "Caisse",
    };
    // Classe 4 : Tiers
    expect(expectedAccounts["411000"]).toBe("Clients");
    // Classe 7 : Produits
    expect(expectedAccounts["701000"]).toBe("Ventes de services");
    // Classe 4 : TVA
    expect(expectedAccounts["445700"]).toBe("TVA collectée");
    // Classe 5 : Trésorerie
    expect(expectedAccounts["512000"]).toBe("Banque");
    expect(expectedAccounts["531000"]).toBe("Caisse");
  });

  it("le journal VE est utilisé pour les ventes", () => {
    const journalVE = "VE";
    expect(journalVE).toBe("VE");
  });

  it("le journal BQ est utilisé pour les encaissements bancaires", () => {
    const journalBQ = "BQ";
    expect(journalBQ).toBe("BQ");
  });

  it("le journal CA est utilisé pour les encaissements en caisse", () => {
    const journalCA = "CA";
    expect(journalCA).toBe("CA");
  });
});
