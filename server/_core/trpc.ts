import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { hasPermission } from "../rbac.service";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

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
