import { describe, it, expect } from "vitest";
import {
  RBAC_MODULES,
  RBAC_ACTIONS,
  SYSTEM_ROLES,
  DEFAULT_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
} from "./rbac.service";

describe("RBAC Service", () => {
  describe("Configuration des modules", () => {
    it("devrait avoir au moins 10 modules définis", () => {
      expect(RBAC_MODULES.length).toBeGreaterThanOrEqual(10);
    });

    it("devrait avoir les modules critiques", () => {
      const modules = [...RBAC_MODULES];
      expect(modules).toContain("titre_foncier");
      expect(modules).toContain("urban_acd");
      expect(modules).toContain("credit");
      expect(modules).toContain("delimitation");
      expect(modules).toContain("payments");
      expect(modules).toContain("appointments");
      expect(modules).toContain("messaging");
      expect(modules).toContain("analytics");
      expect(modules).toContain("interconnexion");
      expect(modules).toContain("users");
      expect(modules).toContain("rbac");
      expect(modules).toContain("parcels");
    });

    it("devrait avoir les 7 actions CRUD+", () => {
      expect(RBAC_ACTIONS).toContain("view");
      expect(RBAC_ACTIONS).toContain("create");
      expect(RBAC_ACTIONS).toContain("edit");
      expect(RBAC_ACTIONS).toContain("delete");
      expect(RBAC_ACTIONS).toContain("approve");
      expect(RBAC_ACTIONS).toContain("export");
      expect(RBAC_ACTIONS).toContain("manage");
    });
  });

  describe("Rôles système", () => {
    it("devrait avoir 6 rôles système", () => {
      expect(SYSTEM_ROLES.length).toBe(6);
    });

    it("devrait avoir le super_admin", () => {
      const superAdmin = SYSTEM_ROLES.find(r => r.name === "super_admin");
      expect(superAdmin).toBeDefined();
      expect(superAdmin!.displayName).toBe("Super Administrateur");
    });

    it("devrait avoir le citoyen", () => {
      const citoyen = SYSTEM_ROLES.find(r => r.name === "citoyen");
      expect(citoyen).toBeDefined();
      expect(citoyen!.displayName).toBe("Citoyen");
    });

    it("devrait avoir l'agent_foncier", () => {
      const agent = SYSTEM_ROLES.find(r => r.name === "agent_foncier");
      expect(agent).toBeDefined();
    });

    it("devrait avoir le banquier", () => {
      const banquier = SYSTEM_ROLES.find(r => r.name === "banquier");
      expect(banquier).toBeDefined();
    });
  });

  describe("Permissions par défaut", () => {
    it("devrait avoir au moins 40 permissions définies", () => {
      expect(DEFAULT_PERMISSIONS.length).toBeGreaterThanOrEqual(40);
    });

    it("chaque permission devrait avoir module, action, displayName, description", () => {
      for (const perm of DEFAULT_PERMISSIONS) {
        expect(perm.module).toBeTruthy();
        expect(perm.action).toBeTruthy();
        expect(perm.displayName).toBeTruthy();
        expect(perm.description).toBeTruthy();
      }
    });

    it("les modules des permissions devraient être valides", () => {
      const validModules = [...RBAC_MODULES];
      for (const perm of DEFAULT_PERMISSIONS) {
        expect(validModules).toContain(perm.module);
      }
    });

    it("les actions des permissions devraient être valides", () => {
      const validActions = [...RBAC_ACTIONS];
      for (const perm of DEFAULT_PERMISSIONS) {
        expect(validActions).toContain(perm.action);
      }
    });
  });

  describe("Mapping rôle → permissions", () => {
    it("super_admin devrait avoir toutes les permissions", () => {
      const superAdminPerms = ROLE_DEFAULT_PERMISSIONS["super_admin"];
      expect(superAdminPerms.length).toBe(DEFAULT_PERMISSIONS.length);
    });

    it("citoyen ne devrait pas avoir de permission rbac.manage", () => {
      const citoyenPerms = ROLE_DEFAULT_PERMISSIONS["citoyen"];
      const hasRbacManage = citoyenPerms.some(p => p.module === "rbac" && p.action === "manage");
      expect(hasRbacManage).toBe(false);
    });

    it("citoyen devrait avoir accès aux paiements", () => {
      const citoyenPerms = ROLE_DEFAULT_PERMISSIONS["citoyen"];
      const hasPayments = citoyenPerms.some(p => p.module === "payments" && p.action === "view");
      expect(hasPayments).toBe(true);
    });

    it("agent_foncier devrait pouvoir approuver les titres fonciers", () => {
      const agentPerms = ROLE_DEFAULT_PERMISSIONS["agent_foncier"];
      const canApprove = agentPerms.some(p => p.module === "titre_foncier" && p.action === "approve");
      expect(canApprove).toBe(true);
    });

    it("banquier devrait avoir accès au crédit mais pas aux titres fonciers", () => {
      const banquierPerms = ROLE_DEFAULT_PERMISSIONS["banquier"];
      const hasCredit = banquierPerms.some(p => p.module === "credit" && p.action === "approve");
      const hasTitre = banquierPerms.some(p => p.module === "titre_foncier");
      expect(hasCredit).toBe(true);
      expect(hasTitre).toBe(false);
    });

    it("agent_terrain ne devrait pas pouvoir approuver", () => {
      const terrainPerms = ROLE_DEFAULT_PERMISSIONS["agent_terrain"];
      const canApprove = terrainPerms.some(p => p.action === "approve");
      expect(canApprove).toBe(false);
    });

    it("chaque rôle devrait avoir au moins une permission", () => {
      for (const [roleName, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
        expect(perms.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Cohérence des données", () => {
    it("tous les rôles dans ROLE_DEFAULT_PERMISSIONS devraient correspondre à un SYSTEM_ROLE", () => {
      const systemRoleNames = SYSTEM_ROLES.map(r => r.name);
      for (const roleName of Object.keys(ROLE_DEFAULT_PERMISSIONS)) {
        expect(systemRoleNames).toContain(roleName);
      }
    });

    it("pas de doublons dans DEFAULT_PERMISSIONS", () => {
      const keys = DEFAULT_PERMISSIONS.map(p => `${p.module}.${p.action}`);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });

    it("pas de doublons dans les permissions par rôle", () => {
      for (const [roleName, perms] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
        const keys = perms.map(p => `${p.module}.${p.action}`);
        const uniqueKeys = new Set(keys);
        expect(uniqueKeys.size).toBe(keys.length);
      }
    });
  });
});
