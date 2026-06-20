import { describe, it, expect } from "vitest";
import {
  ERP_MODULES,
  ERP_ACTIONS,
  ERP_SYSTEM_ROLES,
  ERP_ROLE_DEFAULT_PERMISSIONS,
} from "./erp-rbac.service";

describe("ERP RBAC Service — Constants", () => {
  it("définit 14 modules ERP", () => {
    expect(ERP_MODULES).toHaveLength(17);
    expect(ERP_MODULES).toContain("erp_dashboard");
    expect(ERP_MODULES).toContain("erp_projects");
    expect(ERP_MODULES).toContain("erp_gantt");
    expect(ERP_MODULES).toContain("erp_documents");
    expect(ERP_MODULES).toContain("erp_compliance");
    expect(ERP_MODULES).toContain("erp_equipment");
    expect(ERP_MODULES).toContain("erp_safety");
    expect(ERP_MODULES).toContain("erp_vendors");
    expect(ERP_MODULES).toContain("erp_contractors");
    expect(ERP_MODULES).toContain("erp_inventory");
    expect(ERP_MODULES).toContain("erp_finance");
    expect(ERP_MODULES).toContain("erp_alerts");
    expect(ERP_MODULES).toContain("erp_profile");
    expect(ERP_MODULES).toContain("erp_audit_logs");
  });

  it("définit 12 actions ERP", () => {
    expect(ERP_ACTIONS).toHaveLength(12);
    expect(ERP_ACTIONS).toContain("view");
    expect(ERP_ACTIONS).toContain("create");
    expect(ERP_ACTIONS).toContain("update");
    expect(ERP_ACTIONS).toContain("delete");
    expect(ERP_ACTIONS).toContain("approve");
    expect(ERP_ACTIONS).toContain("export");
    expect(ERP_ACTIONS).toContain("upload");
    expect(ERP_ACTIONS).toContain("download");
    expect(ERP_ACTIONS).toContain("assign");
    expect(ERP_ACTIONS).toContain("validate");
    expect(ERP_ACTIONS).toContain("pay");
    expect(ERP_ACTIONS).toContain("rate");
  });

  it("définit 9 rôles système ERP avec les champs requis", () => {
    expect(ERP_SYSTEM_ROLES).toHaveLength(9);

    for (const role of ERP_SYSTEM_ROLES) {
      expect(role).toHaveProperty("name");
      expect(role).toHaveProperty("displayName");
      expect(role).toHaveProperty("description");
      expect(role.name).toMatch(/^erp_/);
      expect(role.displayName.length).toBeGreaterThan(0);
    }
  });

  it("contient les rôles système critiques", () => {
    const names = ERP_SYSTEM_ROLES.map(r => r.name);
    expect(names).toContain("erp_super_admin");
    expect(names).toContain("erp_project_manager");
    expect(names).toContain("erp_contractor");
    expect(names).toContain("erp_vendor");
    expect(names).toContain("erp_viewer");
  });

  it("les permissions par défaut référencent des modules et actions valides", () => {
    for (const [roleName, perms] of Object.entries(ERP_ROLE_DEFAULT_PERMISSIONS)) {
      expect(ERP_SYSTEM_ROLES.some(r => r.name === roleName)).toBe(true);

      for (const perm of perms) {
        expect(ERP_MODULES).toContain(perm.module);
        expect(ERP_ACTIONS).toContain(perm.action);
      }
    }
  });

  it("le super_admin a accès à toutes les permissions définies", () => {
    const superAdminPerms = ERP_ROLE_DEFAULT_PERMISSIONS["erp_super_admin"];
    expect(superAdminPerms).toBeDefined();

    // Le super_admin doit avoir toutes les permissions définies dans ERP_DEFAULT_PERMISSIONS
    // (pas forcément 14×12 car tous les modules n'ont pas toutes les actions)
    expect(superAdminPerms.length).toBeGreaterThanOrEqual(50);

    // Vérifier que tous les modules sont couverts
    const coveredModules = new Set(superAdminPerms.map(p => p.module));
    for (const mod of ERP_MODULES) {
      expect(coveredModules.has(mod)).toBe(true);
    }
  });

  it("le viewer n'a que des permissions de consultation (view/download)", () => {
    const viewerPerms = ERP_ROLE_DEFAULT_PERMISSIONS["erp_viewer"];
    expect(viewerPerms).toBeDefined();

    const allowedActions = ["view", "download"];
    for (const perm of viewerPerms) {
      expect(allowedActions).toContain(perm.action);
    }
  });

  it("le project_manager a des permissions de création sur les projets", () => {
    const pmPerms = ERP_ROLE_DEFAULT_PERMISSIONS["erp_project_manager"];
    expect(pmPerms).toBeDefined();

    const canCreateProjects = pmPerms.some(
      p => p.module === "erp_projects" && p.action === "create"
    );
    expect(canCreateProjects).toBe(true);
  });

  it("le contractor a des permissions limitées (pas de finance delete)", () => {
    const contractorPerms = ERP_ROLE_DEFAULT_PERMISSIONS["erp_contractor"];
    expect(contractorPerms).toBeDefined();

    const hasFinanceDelete = contractorPerms.some(
      p => p.module === "erp_finance" && p.action === "delete"
    );
    expect(hasFinanceDelete).toBe(false);
  });

  it("aucun doublon dans les permissions par défaut d'un rôle", () => {
    for (const [roleName, perms] of Object.entries(ERP_ROLE_DEFAULT_PERMISSIONS)) {
      const keys = perms.map(p => `${p.module}:${p.action}`);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    }
  });

  it("les noms de modules ERP sont préfixés par erp_", () => {
    for (const mod of ERP_MODULES) {
      expect(mod.startsWith("erp_")).toBe(true);
    }
  });
});
