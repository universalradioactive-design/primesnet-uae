import { z } from "zod";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users, properties, messages, appointments, propertyImages } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const adminRouter = createRouter({
  // ── Dashboard stats ───────────────────────────────────────────
  stats: adminQuery.query(async () => {
    const db = getDb();

    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const [propertyCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(properties);

    const [messageCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages);

    const [appointmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments);

    const [buyerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountType, "buyer"));

    const [sellerCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.accountType, "seller"));

    const [totalValue] = await db
      .select({ total: sql<string>`sum(${properties.price})` })
      .from(properties)
      .where(eq(properties.status, "active"));

    return {
      totalUsers: userCount?.count || 0,
      totalProperties: propertyCount?.count || 0,
      totalMessages: messageCount?.count || 0,
      totalAppointments: appointmentCount?.count || 0,
      totalBuyers: buyerCount?.count || 0,
      totalSellers: sellerCount?.count || 0,
      totalValue: totalValue?.total || "0",
    };
  }),

  // ── All users ─────────────────────────────────────────────────
  users: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  // ── Update user role ──────────────────────────────────────────
  updateUserRole: adminQuery
    .input(
      z.object({
        id: z.number(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.id));
      return { success: true };
    }),

  // ── All properties ────────────────────────────────────────────
  properties: adminQuery.query(async () => {
    const db = getDb();
    const props = await db
      .select()
      .from(properties)
      .orderBy(desc(properties.createdAt));

    const propsWithDetails = await Promise.all(
      props.map(async (prop) => {
        const images = await db
          .select()
          .from(propertyImages)
          .where(eq(propertyImages.propertyId, prop.id));

        const seller = await db
          .select()
          .from(users)
          .where(eq(users.id, prop.sellerId))
          .limit(1);

        return {
          ...prop,
          images,
          sellerName: seller[0]?.name || "Unknown",
          sellerEmail: seller[0]?.email,
        };
      })
    );

    return propsWithDetails;
  }),

  // ── Delete property (admin override) ──────────────────────────
  deleteProperty: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .delete(propertyImages)
        .where(eq(propertyImages.propertyId, input.id));
      await db
        .delete(properties)
        .where(eq(properties.id, input.id));
      return { success: true };
    }),

  // ── All appointments ──────────────────────────────────────────
  appointments: adminQuery.query(async () => {
    const db = getDb();
    const appts = await db
      .select()
      .from(appointments)
      .orderBy(desc(appointments.createdAt));

    return Promise.all(
      appts.map(async (appt) => {
        const prop = await db
          .select()
          .from(properties)
          .where(eq(properties.id, appt.propertyId))
          .limit(1);

        const buyer = await db
          .select()
          .from(users)
          .where(eq(users.id, appt.buyerId))
          .limit(1);

        const seller = await db
          .select()
          .from(users)
          .where(eq(users.id, appt.sellerId))
          .limit(1);

        return {
          ...appt,
          propertyTitle: prop[0]?.title || "Unknown",
          buyerName: buyer[0]?.name || "Unknown",
          sellerName: seller[0]?.name || "Unknown",
        };
      })
    );
  }),

  // ── All messages ──────────────────────────────────────────────
  messages: adminQuery.query(async () => {
    const db = getDb();
    const msgs = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(200);

    return Promise.all(
      msgs.map(async (msg) => {
        const sender = await db
          .select()
          .from(users)
          .where(eq(users.id, msg.senderId))
          .limit(1);

        const receiver = await db
          .select()
          .from(users)
          .where(eq(users.id, msg.receiverId))
          .limit(1);

        return {
          ...msg,
          senderName: sender[0]?.name || "Unknown",
          receiverName: receiver[0]?.name || "Unknown",
        };
      })
    );
  }),
});
