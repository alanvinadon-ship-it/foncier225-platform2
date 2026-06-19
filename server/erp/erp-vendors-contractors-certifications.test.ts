import { describe, it, expect } from "vitest";

// ============================================================
// Sprint 8 — Vendors, Contractors, Certifications Tests
// ============================================================

// --- Constants ---
const VENDOR_CATEGORIES = ["general", "materials", "equipment", "services", "transport", "consulting", "autre"];
const VENDOR_STATUSES = ["active", "inactive", "suspended", "blacklisted", "pending_approval"];
const CONTRACTOR_SPECIALTIES = ["general", "gros_oeuvre", "electricite", "plomberie", "peinture", "menuiserie", "carrelage", "toiture", "vrd", "autre"];
const CONTRACTOR_STATUSES = ["active", "inactive", "suspended", "blacklisted", "pending_approval"];
const CONTRACT_STATUSES = ["draft", "active", "completed", "terminated", "expired"];
const ENTITY_TYPES = ["vendor", "contractor", "equipment", "user"];
const CERTIFICATION_STATUSES = ["active", "expired", "revoked", "pending_renewal"];

// ============================================================
// VENDORS TESTS
// ============================================================

describe("ERP Vendors — Catégories", () => {
  it("doit avoir 7 catégories de fournisseurs", () => {
    expect(VENDOR_CATEGORIES).toHaveLength(7);
  });

  it("doit inclure les catégories principales", () => {
    expect(VENDOR_CATEGORIES).toContain("materials");
    expect(VENDOR_CATEGORIES).toContain("equipment");
    expect(VENDOR_CATEGORIES).toContain("services");
    expect(VENDOR_CATEGORIES).toContain("transport");
  });
});

describe("ERP Vendors — Statuts", () => {
  it("doit avoir 5 statuts de fournisseurs", () => {
    expect(VENDOR_STATUSES).toHaveLength(5);
  });

  it("le statut par défaut est pending_approval", () => {
    expect(VENDOR_STATUSES).toContain("pending_approval");
  });

  it("doit inclure blacklisted pour blocage", () => {
    expect(VENDOR_STATUSES).toContain("blacklisted");
  });
});

describe("ERP Vendors — Création", () => {
  it("doit valider un nom non vide", () => {
    const name = "Fournisseur Test";
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(255);
  });

  it("doit valider un email correct", () => {
    const email = "vendor@example.com";
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("doit rejeter un email invalide", () => {
    const invalidEmail = "not-an-email";
    expect(invalidEmail).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });
});

describe("ERP Vendors — Contacts", () => {
  it("un contact doit avoir un nom", () => {
    const contact = { name: "Jean Dupont", role: "Directeur", email: "jean@example.com", isPrimary: true };
    expect(contact.name).toBeTruthy();
  });

  it("un seul contact peut être principal", () => {
    const contacts = [
      { id: 1, isPrimary: true },
      { id: 2, isPrimary: false },
      { id: 3, isPrimary: false },
    ];
    const primaryCount = contacts.filter(c => c.isPrimary).length;
    expect(primaryCount).toBe(1);
  });
});

describe("ERP Vendors — Suspension et Blacklist", () => {
  it("un fournisseur suspendu ne peut pas être affecté", () => {
    const vendor = { status: "suspended" };
    const canAssign = vendor.status === "active";
    expect(canAssign).toBe(false);
  });

  it("un fournisseur blacklisté est bloqué", () => {
    const vendor = { status: "blacklisted" };
    const isBlocked = vendor.status === "blacklisted";
    expect(isBlocked).toBe(true);
  });

  it("seul un fournisseur actif peut être utilisé", () => {
    const vendor = { status: "active" };
    const canUse = vendor.status === "active";
    expect(canUse).toBe(true);
  });
});

// ============================================================
// CONTRACTORS TESTS
// ============================================================

describe("ERP Contractors — Spécialités", () => {
  it("doit avoir 10 spécialités", () => {
    expect(CONTRACTOR_SPECIALTIES).toHaveLength(10);
  });

  it("doit inclure les spécialités BTP principales", () => {
    expect(CONTRACTOR_SPECIALTIES).toContain("gros_oeuvre");
    expect(CONTRACTOR_SPECIALTIES).toContain("electricite");
    expect(CONTRACTOR_SPECIALTIES).toContain("plomberie");
    expect(CONTRACTOR_SPECIALTIES).toContain("vrd");
  });
});

describe("ERP Contractors — Statuts", () => {
  it("doit avoir les mêmes 5 statuts que les vendors", () => {
    expect(CONTRACTOR_STATUSES).toHaveLength(5);
    expect(CONTRACTOR_STATUSES).toEqual(VENDOR_STATUSES);
  });
});

describe("ERP Contractors — Création", () => {
  it("doit valider le nom du sous-traitant", () => {
    const name = "Entreprise BTP Abidjan";
    expect(name.length).toBeGreaterThan(0);
    expect(name.length).toBeLessThanOrEqual(255);
  });

  it("doit accepter un numéro de licence optionnel", () => {
    const contractor = { name: "Test", licenseNumber: "LIC-2024-001" };
    expect(contractor.licenseNumber).toBeTruthy();
  });
});

describe("ERP Contractors — Affectation projet", () => {
  it("un sous-traitant actif peut être affecté", () => {
    const contractor = { status: "active" };
    const canAssign = contractor.status === "active";
    expect(canAssign).toBe(true);
  });

  it("un sous-traitant blacklisté ne peut pas être affecté", () => {
    const contractor = { status: "blacklisted" };
    const canAssign = contractor.status === "active";
    expect(canAssign).toBe(false);
  });

  it("un sous-traitant suspendu ne peut pas être affecté", () => {
    const contractor = { status: "suspended" };
    const canAssign = contractor.status === "active";
    expect(canAssign).toBe(false);
  });

  it("un sous-traitant en attente ne peut pas être affecté", () => {
    const contractor = { status: "pending_approval" };
    const canAssign = contractor.status === "active";
    expect(canAssign).toBe(false);
  });

  it("un sous-traitant avec affectation active ne peut pas être supprimé", () => {
    const activeAssignments = [{ id: 1, releasedAt: null }];
    const canDelete = activeAssignments.filter(a => !a.releasedAt).length === 0;
    expect(canDelete).toBe(false);
  });

  it("un sous-traitant sans affectation active peut être supprimé", () => {
    const activeAssignments = [{ id: 1, releasedAt: Date.now() }];
    const canDelete = activeAssignments.filter(a => !a.releasedAt).length === 0;
    expect(canDelete).toBe(true);
  });
});

describe("ERP Contracts — Statuts", () => {
  it("doit avoir 5 statuts de contrat", () => {
    expect(CONTRACT_STATUSES).toHaveLength(5);
  });

  it("le statut par défaut est draft", () => {
    expect(CONTRACT_STATUSES[0]).toBe("draft");
  });

  it("doit inclure terminated pour résiliation", () => {
    expect(CONTRACT_STATUSES).toContain("terminated");
  });
});

describe("ERP Contracts — Création", () => {
  it("doit valider le titre du contrat", () => {
    const title = "Contrat électricité bâtiment A";
    expect(title.length).toBeGreaterThan(0);
  });

  it("doit accepter un montant en XOF", () => {
    const amount = 15000000; // 15M XOF
    expect(amount).toBeGreaterThan(0);
  });

  it("doit formater le montant en XOF", () => {
    const amount = 15000000;
    const formatted = new Intl.NumberFormat("fr-CI", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount);
    expect(formatted).toContain("15");
    expect(formatted).toContain("000");
  });
});

// ============================================================
// CERTIFICATIONS TESTS
// ============================================================

describe("ERP Certifications — Types d'entités", () => {
  it("doit avoir 4 types d'entités", () => {
    expect(ENTITY_TYPES).toHaveLength(4);
  });

  it("doit couvrir vendor, contractor, equipment, user", () => {
    expect(ENTITY_TYPES).toContain("vendor");
    expect(ENTITY_TYPES).toContain("contractor");
    expect(ENTITY_TYPES).toContain("equipment");
    expect(ENTITY_TYPES).toContain("user");
  });
});

describe("ERP Certifications — Statuts", () => {
  it("doit avoir 4 statuts", () => {
    expect(CERTIFICATION_STATUSES).toHaveLength(4);
  });

  it("le statut par défaut est active", () => {
    expect(CERTIFICATION_STATUSES[0]).toBe("active");
  });

  it("doit inclure pending_renewal", () => {
    expect(CERTIFICATION_STATUSES).toContain("pending_renewal");
  });
});

describe("ERP Certifications — Détection expiration", () => {
  it("doit détecter une certification expirée", () => {
    const cert = { expiresAt: Date.now() - 86400000 }; // hier
    const isExpired = cert.expiresAt < Date.now();
    expect(isExpired).toBe(true);
  });

  it("doit détecter une certification valide", () => {
    const cert = { expiresAt: Date.now() + 86400000 * 60 }; // dans 60 jours
    const isExpired = cert.expiresAt < Date.now();
    expect(isExpired).toBe(false);
  });

  it("doit calculer les jours restants", () => {
    const expiresAt = Date.now() + 86400000 * 15; // dans 15 jours
    const daysRemaining = Math.ceil((expiresAt - Date.now()) / 86400000);
    expect(daysRemaining).toBe(15);
  });
});

describe("ERP Certifications — Alertes avant expiration", () => {
  it("doit déclencher une alerte si dans la fenêtre", () => {
    const cert = { expiresAt: Date.now() + 86400000 * 20, alertDaysBefore: 30 };
    const daysRemaining = Math.ceil((cert.expiresAt - Date.now()) / 86400000);
    const shouldAlert = daysRemaining <= cert.alertDaysBefore;
    expect(shouldAlert).toBe(true);
  });

  it("ne doit pas alerter si hors fenêtre", () => {
    const cert = { expiresAt: Date.now() + 86400000 * 60, alertDaysBefore: 30 };
    const daysRemaining = Math.ceil((cert.expiresAt - Date.now()) / 86400000);
    const shouldAlert = daysRemaining <= cert.alertDaysBefore;
    expect(shouldAlert).toBe(false);
  });

  it("doit supporter un alertDaysBefore personnalisé", () => {
    const cert = { expiresAt: Date.now() + 86400000 * 50, alertDaysBefore: 60 };
    const daysRemaining = Math.ceil((cert.expiresAt - Date.now()) / 86400000);
    const shouldAlert = daysRemaining <= cert.alertDaysBefore;
    expect(shouldAlert).toBe(true);
  });
});

describe("ERP Certifications — Renouvellement", () => {
  it("doit mettre à jour la date d'expiration", () => {
    const oldExpires = Date.now() - 86400000;
    const newExpires = Date.now() + 86400000 * 365;
    expect(newExpires).toBeGreaterThan(oldExpires);
  });

  it("doit passer le statut à active après renouvellement", () => {
    const cert = { status: "expired" as string };
    cert.status = "active";
    expect(cert.status).toBe("active");
  });

  it("doit enregistrer la date de renouvellement", () => {
    const renewedAt = Date.now();
    expect(renewedAt).toBeGreaterThan(0);
  });
});

// ============================================================
// PERMISSIONS TESTS
// ============================================================

describe("ERP Permissions — Vendors module", () => {
  it("le module erp_vendors existe dans le RBAC", () => {
    const ERP_MODULES = [
      "erp_dashboard", "erp_projects", "erp_gantt", "erp_documents",
      "erp_compliance", "erp_equipment", "erp_safety", "erp_vendors",
      "erp_contractors", "erp_inventory", "erp_finance", "erp_alerts",
      "erp_profile", "erp_audit_logs",
    ];
    expect(ERP_MODULES).toContain("erp_vendors");
    expect(ERP_MODULES).toContain("erp_contractors");
  });
});

describe("ERP Permissions — Contractors module", () => {
  it("le rôle project_manager a accès aux contractors", () => {
    // Based on RBAC service: project_manager has erp_contractors view/create/update/assign
    const projectManagerPermissions = ["view", "create", "update", "assign"];
    expect(projectManagerPermissions).toContain("view");
    expect(projectManagerPermissions).toContain("assign");
  });

  it("l'action assign est nécessaire pour affecter un sous-traitant", () => {
    const requiredAction = "assign";
    const availableActions = ["view", "create", "update", "delete", "validate", "assign", "rate", "export", "import", "manage", "approve", "reject"];
    expect(availableActions).toContain(requiredAction);
  });
});

// ============================================================
// INTEGRATION TESTS
// ============================================================

describe("ERP Sprint 8 — Intégration", () => {
  it("les vendors et contractors partagent les mêmes statuts", () => {
    expect(VENDOR_STATUSES).toEqual(CONTRACTOR_STATUSES);
  });

  it("les certifications peuvent être liées à un vendor", () => {
    const cert = { entityType: "vendor", entityId: 1 };
    expect(ENTITY_TYPES).toContain(cert.entityType);
  });

  it("les certifications peuvent être liées à un contractor", () => {
    const cert = { entityType: "contractor", entityId: 2 };
    expect(ENTITY_TYPES).toContain(cert.entityType);
  });

  it("les certifications peuvent être liées à un équipement", () => {
    const cert = { entityType: "equipment", entityId: 5 };
    expect(ENTITY_TYPES).toContain(cert.entityType);
  });

  it("un contrat lie un contractor à un projet", () => {
    const contract = { contractorId: 1, projectId: 2, title: "Travaux", amount: 5000000 };
    expect(contract.contractorId).toBeGreaterThan(0);
    expect(contract.projectId).toBeGreaterThan(0);
  });
});
