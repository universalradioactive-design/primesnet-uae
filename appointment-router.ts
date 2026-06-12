import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appointments, properties, users } from "@db/schema";
import { eq, desc, or } from "drizzle-orm";

export const appointmentRouter = createRouter({
  // ── Create appointment ────────────────────────────────────────
  create: authedQuery
    .input(
      z.object({
        propertyId: z.number(),
        sellerId: z.number(),
        appointmentDate: z.string(), // YYYY-MM-DD
        appointmentTime: z.string(), // HH:mm
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const buyerId = ctx.user.id;

      // Verify property exists and get seller
      const prop = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!prop[0]) throw new Error("Property not found");

      const result = await db.insert(appointments).values({
        propertyId: input.propertyId,
        buyerId,
        sellerId: input.sellerId,
        appointmentDate: input.appointmentDate,
        appointmentTime: input.appointmentTime,
        notes: input.notes,
      });

      return { id: Number(result[0].insertId), success: true };
    }),

  // ── Get my appointments (as buyer or seller) ──────────────────
  myAppointments: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const appts = await db
      .select()
      .from(appointments)
      .where(
        or(eq(appointments.buyerId, userId), eq(appointments.sellerId, userId))
      )
      .orderBy(desc(appointments.createdAt));

    const apptsWithDetails = await Promise.all(
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
          property: prop[0] || null,
          buyerName: buyer[0]?.name || "Unknown",
          sellerName: seller[0]?.name || "Unknown",
        };
      })
    );

    return apptsWithDetails;
  }),

  // ── Update appointment status ─────────────────────────────────
  updateStatus: authedQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const existing = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);

      if (!existing[0]) throw new Error("Appointment not found");

      // Only buyer, seller, or admin can update
      if (
        existing[0].buyerId !== ctx.user.id &&
        existing[0].sellerId !== ctx.user.id &&
        ctx.user.role !== "admin"
      ) {
        throw new Error("Unauthorized");
      }

      await db
        .update(appointments)
        .set({ status: input.status })
        .where(eq(appointments.id, input.id));

      return { success: true };
    }),
});

