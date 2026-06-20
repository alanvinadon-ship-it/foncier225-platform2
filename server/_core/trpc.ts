import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { hasPermission } from "../rbac.service";
import { hasErpPermission, hasAnyErpRole } from "../erp/erp-rbac.service";


const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Sanitization is applied via Express middleware (see server/_core/index.ts)
// and the sanitizeInput/sanitizeString helpers are available for manual use.
export { sanitizeInput, sanitizeString } from "./sanitize";

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

export const bankProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'bank') {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux utilisateurs banque" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** Guard pour les agents MCLU (foncier urbain) + admin */
export const mcluProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'agent_mclu' && ctx.user.role !== 'admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux agents MCLU" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** Guard pour les géomètres urbains agréés + admin */
export const geometreProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'geometre_urbain' && ctx.user.role !== 'admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux géomètres urbains" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** Guard pour le conservateur foncier + admin */
export const conservateurProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== 'conservateur' && ctx.user.role !== 'admin')) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé au conservateur foncier" });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * Middleware de contrôle d'accès par permission RBAC.
 * Usage : permissionProcedure("module", "action")
 * Vérifie que l'utilisateur a la permission spécifique via ses rôles.
 * Les admins (role === 'admin') passent toujours (fallback légacy).
 */
export function permissionProcedure(module: string, action: string) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }

      // Fallback légacy : les admins passent toujours
      if (ctx.user.role === 'admin') {
        return next({ ctx: { ...ctx, user: ctx.user } });
      }

      // Vérifier la permission RBAC
      const allowed = await hasPermission(ctx.user.id, module, action);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Accès refusé : permission '${module}.${action}' requise`,
        });
      }

      return next({ ctx: { ...ctx, user: ctx.user } });
    }),
  );
}

// ============================================================
// ERP CONSTRUCTION — MIDDLEWARES
// ============================================================

/**
 * Middleware ERP : vérifie que l'utilisateur a au moins un rôle ERP.
 * Bloque l'accès à tout le périmètre /erp si aucun rôle ERP assigné.
 */
export const erpProtectedProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    // Admin Foncier225 a accès à l'ERP par défaut (super admin implicite)
    if (ctx.user.role === 'admin') {
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    const hasErp = await hasAnyErpRole(ctx.user.id);
    if (!hasErp) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Acc\u00e8s refus\u00e9 : aucun r\u00f4le ERP Construction assign\u00e9",
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);

/**
 * Middleware ERP de contrôle d'accès par permission.
 * Usage : erpPermissionProcedure("erp_projects", "create")
 * Vérifie que l'utilisateur a la permission ERP spécifique via ses rôles ERP.
 * Les admins Foncier225 (role === 'admin') passent toujours.
 */
export function erpPermissionProcedure(module: string, action: string) {
  return t.procedure.use(
    t.middleware(async opts => {
      const { ctx, next } = opts;

      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
      }

      // Admin Foncier225 passe toujours (super admin implicite)
      if (ctx.user.role === 'admin') {
        return next({ ctx: { ...ctx, user: ctx.user } });
      }

      const allowed = await hasErpPermission(ctx.user.id, module, action);
      if (!allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Acc\u00e8s ERP refus\u00e9 : permission '${module}.${action}' requise`,
        });
      }

      return next({ ctx: { ...ctx, user: ctx.user } });
    }),
  );
}
