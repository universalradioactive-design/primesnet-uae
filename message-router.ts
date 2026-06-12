import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { messages, users } from "@db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export const messageRouter = createRouter({
  // ── Send a message ────────────────────────────────────────────
  send: authedQuery
    .input(
      z.object({
        receiverId: z.number(),
        propertyId: z.number().optional(),
        content: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const senderId = ctx.user.id;

      const result = await db.insert(messages).values({
        senderId,
        receiverId: input.receiverId,
        propertyId: input.propertyId,
        content: input.content,
      });

      return { id: Number(result[0].insertId), success: true };
    }),

  // ── Get conversation between two users ────────────────────────
  conversation: authedQuery
    .input(
      z.object({
        otherUserId: z.number(),
        propertyId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const conditions = [
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, input.otherUserId)),
          and(eq(messages.senderId, input.otherUserId), eq(messages.receiverId, userId))
        ),
      ];

      if (input.propertyId) {
        conditions.push(eq(messages.propertyId, input.propertyId));
      }

      const msgs = await db
        .select()
        .from(messages)
        .where(and(...conditions))
        .orderBy(messages.createdAt);

      // Get sender info for each message
      const msgsWithSender = await Promise.all(
        msgs.map(async (msg) => {
          const sender = await db
            .select()
            .from(users)
            .where(eq(users.id, msg.senderId))
            .limit(1);
          return {
            ...msg,
            senderName: sender[0]?.name || "Unknown",
            senderAvatar: sender[0]?.avatar,
          };
        })
      );

      // Mark messages as read
      await db
        .update(messages)
        .set({ isRead: "yes" })
        .where(
          and(
            eq(messages.receiverId, userId),
            eq(messages.senderId, input.otherUserId),
            eq(messages.isRead, "no")
          )
        );

      return msgsWithSender;
    }),

  // ── Get all conversations for current user ────────────────────
  myConversations: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    // Get all unique conversation partners
    const sentMsgs = await db
      .select({ otherId: messages.receiverId })
      .from(messages)
      .where(eq(messages.senderId, userId));

    const receivedMsgs = await db
      .select({ otherId: messages.senderId })
      .from(messages)
      .where(eq(messages.receiverId, userId));

    const partnerIds = Array.from(
      new Set([...sentMsgs.map((m) => m.otherId), ...receivedMsgs.map((m) => m.otherId)])
    );

    const conversations = await Promise.all(
      partnerIds.map(async (partnerId) => {
        const partner = await db
          .select()
          .from(users)
          .where(eq(users.id, partnerId))
          .limit(1);

        const lastMessage = await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, partnerId)),
              and(eq(messages.senderId, partnerId), eq(messages.receiverId, userId))
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        const unreadCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.senderId, partnerId),
              eq(messages.receiverId, userId),
              eq(messages.isRead, "no")
            )
          );

        return {
          partnerId,
          partnerName: partner[0]?.name || "Unknown",
          partnerAvatar: partner[0]?.avatar,
          lastMessage: lastMessage[0] || null,
          unreadCount: unreadCount[0]?.count || 0,
        };
      })
    );

    return conversations.sort((a, b) => {
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
  }),

  // ── Get unread count ──────────────────────────────────────────
  unreadCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, ctx.user.id),
          eq(messages.isRead, "no")
        )
      );
    return result[0]?.count || 0;
  }),
});
