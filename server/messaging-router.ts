import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb, createCitizenNotification } from "./db";
import { conversations, messages, users } from "../drizzle/schema";
import { eq, and, desc, sql, isNull, or } from "drizzle-orm";
import { storagePut } from "./storage";

// ─── Citizen Messaging Router ────────────────────────────────────────────────

export const citizenMessagingRouter = router({
  // Create a new conversation
  create: protectedProcedure
    .input(z.object({
      subject: z.string().min(3).max(255),
      content: z.string().min(1).max(5000),
      dossierType: z.enum(["land_title", "urban_acd", "credit", "general"]).default("general"),
      dossierId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [conv] = await db.insert(conversations).values({
        citizenId: ctx.user.id,
        subject: input.subject,
        status: "open",
        dossierType: input.dossierType,
        dossierId: input.dossierId ?? null,
        lastMessageAt: now,
        createdAt: now,
      }).$returningId();

      await db.insert(messages).values({
        conversationId: conv.id,
        senderId: ctx.user.id,
        senderRole: "citizen",
        content: input.content,
        createdAt: now,
      });

      return { conversationId: conv.id };
    }),

  // List citizen's conversations
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = (await getDb())!;

    const convs = await db.select({
      id: conversations.id,
      subject: conversations.subject,
      status: conversations.status,
      dossierType: conversations.dossierType,
      lastMessageAt: conversations.lastMessageAt,
      createdAt: conversations.createdAt,
      agentId: conversations.agentId,
      agentName: users.name,
    })
      .from(conversations)
      .leftJoin(users, eq(conversations.agentId, users.id))
      .where(eq(conversations.citizenId, ctx.user.id))
      .orderBy(desc(conversations.lastMessageAt));

    // Count unread messages for each conversation
    const result = await Promise.all(convs.map(async (conv) => {
      const [unread] = await db.select({
        count: sql<number>`COUNT(*)`,
      }).from(messages)
        .where(and(
          eq(messages.conversationId, conv.id),
          sql`${messages.senderId} != ${ctx.user.id}`,
          isNull(messages.readAt)
        ));

      return {
        ...conv,
        unreadCount: unread?.count ?? 0,
      };
    }));

    return result;
  }),

  // Get messages for a conversation
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = (await getDb())!;

      // Verify ownership
      const [conv] = await db.select().from(conversations)
        .where(and(
          eq(conversations.id, input.conversationId),
          eq(conversations.citizenId, ctx.user.id)
        ));

      if (!conv) throw new Error("Conversation introuvable");

      const msgs = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        senderRole: messages.senderRole,
        content: messages.content,
        attachmentUrl: messages.attachmentUrl,
        attachmentName: messages.attachmentName,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        senderName: users.name,
      })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt);

      return { conversation: conv, messages: msgs };
    }),

  // Send a message
  send: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1).max(5000),
      attachmentUrl: z.string().optional(),
      attachmentName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Verify ownership
      const [conv] = await db.select().from(conversations)
        .where(and(
          eq(conversations.id, input.conversationId),
          eq(conversations.citizenId, ctx.user.id)
        ));

      if (!conv) throw new Error("Conversation introuvable");

      await db.insert(messages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        senderRole: "citizen",
        content: input.content,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentName: input.attachmentName ?? null,
        createdAt: now,
      });

      // Update conversation lastMessageAt
      await db.update(conversations)
        .set({ lastMessageAt: now })
        .where(eq(conversations.id, input.conversationId));

      // Notify agent if assigned
      if (conv.agentId) {
        await createCitizenNotification({
          userId: conv.agentId,
          type: "general",
          title: "Nouveau message",
          message: `Le citoyen a répondu dans la conversation « ${conv.subject} »`,
          createdAt: now,
        });
      }

      return { success: true };
    }),

  // Mark messages as read
  markRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      // Verify ownership
      const [conv] = await db.select().from(conversations)
        .where(and(
          eq(conversations.id, input.conversationId),
          eq(conversations.citizenId, ctx.user.id)
        ));

      if (!conv) throw new Error("Conversation introuvable");

      // Mark all messages from others as read
      await db.update(messages)
        .set({ readAt: now })
        .where(and(
          eq(messages.conversationId, input.conversationId),
          sql`${messages.senderId} != ${ctx.user.id}`,
          isNull(messages.readAt)
        ));

      return { success: true };
    }),

  // Upload attachment
  uploadAttachment: protectedProcedure
    .input(z.object({
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const suffix = Math.random().toString(36).substring(2, 8);
      const key = `messages/${ctx.user.id}/${suffix}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, fileName: input.fileName };
    }),
});

// ─── Admin Messaging Router ─────────────────────────────────────────────────

export const adminMessagingRouter = router({
  // List all conversations (optionally filter by status)
  list: adminProcedure
    .input(z.object({
      status: z.enum(["open", "assigned", "closed"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const conditions = input?.status
        ? [eq(conversations.status, input.status)]
        : [];

      const convs = await db.select({
        id: conversations.id,
        subject: conversations.subject,
        status: conversations.status,
        dossierType: conversations.dossierType,
        citizenId: conversations.citizenId,
        agentId: conversations.agentId,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
      })
        .from(conversations)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(conversations.lastMessageAt));

      // Enrich with citizen name and unread count
      const result = await Promise.all(convs.map(async (conv) => {
        const [citizen] = await db.select({ name: users.name }).from(users)
          .where(eq(users.id, conv.citizenId));

        const [agent] = conv.agentId
          ? await db.select({ name: users.name }).from(users).where(eq(users.id, conv.agentId))
          : [null];

        const [unread] = await db.select({
          count: sql<number>`COUNT(*)`,
        }).from(messages)
          .where(and(
            eq(messages.conversationId, conv.id),
            eq(messages.senderRole, "citizen"),
            isNull(messages.readAt)
          ));

        return {
          ...conv,
          citizenName: citizen?.name ?? "Citoyen",
          agentName: agent?.name ?? null,
          unreadCount: unread?.count ?? 0,
        };
      }));

      return result;
    }),

  // Get messages for a conversation (admin)
  getMessages: adminProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      const db = (await getDb())!;

      const [conv] = await db.select().from(conversations)
        .where(eq(conversations.id, input.conversationId));

      if (!conv) throw new Error("Conversation introuvable");

      const msgs = await db.select({
        id: messages.id,
        senderId: messages.senderId,
        senderRole: messages.senderRole,
        content: messages.content,
        attachmentUrl: messages.attachmentUrl,
        attachmentName: messages.attachmentName,
        readAt: messages.readAt,
        createdAt: messages.createdAt,
        senderName: users.name,
      })
        .from(messages)
        .leftJoin(users, eq(messages.senderId, users.id))
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt);

      // Get citizen info
      const [citizen] = await db.select({ name: users.name, email: users.email })
        .from(users).where(eq(users.id, conv.citizenId));

      return { conversation: conv, messages: msgs, citizen };
    }),

  // Send a message as agent
  send: adminProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string().min(1).max(5000),
      attachmentUrl: z.string().optional(),
      attachmentName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [conv] = await db.select().from(conversations)
        .where(eq(conversations.id, input.conversationId));

      if (!conv) throw new Error("Conversation introuvable");

      await db.insert(messages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        senderRole: "agent",
        content: input.content,
        attachmentUrl: input.attachmentUrl ?? null,
        attachmentName: input.attachmentName ?? null,
        createdAt: now,
      });

      // Update conversation
      await db.update(conversations)
        .set({
          lastMessageAt: now,
          agentId: ctx.user.id,
          status: "assigned",
        })
        .where(eq(conversations.id, input.conversationId));

      // Notify citizen
      await createCitizenNotification({
        userId: conv.citizenId,
        type: "general",
        title: "Réponse de l'agent foncier",
        message: `Vous avez reçu une réponse dans votre conversation « ${conv.subject} »`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Assign conversation to self
  assign: adminProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;

      await db.update(conversations)
        .set({ agentId: ctx.user.id, status: "assigned" })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  // Close conversation
  close: adminProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      const [conv] = await db.select().from(conversations)
        .where(eq(conversations.id, input.conversationId));

      if (!conv) throw new Error("Conversation introuvable");

      await db.update(conversations)
        .set({ status: "closed" })
        .where(eq(conversations.id, input.conversationId));

      // Add system message
      await db.insert(messages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        senderRole: "system",
        content: "Cette conversation a été clôturée par l'agent.",
        createdAt: now,
      });

      // Notify citizen
      await createCitizenNotification({
        userId: conv.citizenId,
        type: "general",
        title: "Conversation clôturée",
        message: `Votre conversation « ${conv.subject} » a été clôturée.`,
        createdAt: now,
      });

      return { success: true };
    }),

  // Mark messages as read (admin)
  markRead: adminProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = (await getDb())!;
      const now = Date.now();

      await db.update(messages)
        .set({ readAt: now })
        .where(and(
          eq(messages.conversationId, input.conversationId),
          eq(messages.senderRole, "citizen"),
          isNull(messages.readAt)
        ));

      return { success: true };
    }),
});
