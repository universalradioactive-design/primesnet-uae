import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { properties, propertyImages, users } from "@db/schema";
import { eq, and, desc, like, sql } from "drizzle-orm";

export const propertyRouter = createRouter({
  // ── List properties with filters ──────────────────────────────
  list: publicQuery
    .input(
      z.object({
        city: z.string().optional(),
        propertyType: z.string().optional(),
        listingType: z.string().optional(),
        minPrice: z.number().optional(),
        maxPrice: z.number().optional(),
        search: z.string().optional(),
        sellerId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.city) conditions.push(like(properties.city, `%${input.city}%`));
      if (input?.propertyType) conditions.push(eq(properties.propertyType, input.propertyType as any));
      if (input?.listingType) conditions.push(eq(properties.listingType, input.listingType as any));
      if (input?.sellerId) conditions.push(eq(properties.sellerId, input.sellerId));
      if (input?.search) {
        conditions.push(
          sql`${properties.title} LIKE ${`%${input.search}%`} OR ${properties.location} LIKE ${`%${input.search}%`}`
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const props = await db
        .select()
        .from(properties)
        .where(where)
        .orderBy(desc(properties.createdAt));

      // Fetch images for each property
      const propsWithImages = await Promise.all(
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
            seller: seller[0] || null,
          };
        })
      );

      return propsWithImages;
    }),

  // ── Get single property ──────────────────────────────────────
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const prop = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.id))
        .limit(1);

      if (!prop[0]) return null;

      const images = await db
        .select()
        .from(propertyImages)
        .where(eq(propertyImages.propertyId, input.id));

      const seller = await db
        .select()
        .from(users)
        .where(eq(users.id, prop[0].sellerId))
        .limit(1);

      return { ...prop[0], images, seller: seller[0] || null };
    }),

  // ── Create property ──────────────────────────────────────────
  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        location: z.string().min(1),
        city: z.string().min(1),
        propertyType: z.enum(["villa", "apartment", "penthouse", "commercial", "townhouse", "land"]),
        listingType: z.enum(["sale", "rent"]).default("sale"),
        price: z.number().positive(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        area: z.number().optional(),
        amenities: z.array(z.string()).optional(),
        images: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const sellerId = ctx.user.id;

      const result = await db.insert(properties).values({
        sellerId,
        title: input.title,
        description: input.description,
        location: input.location,
        city: input.city,
        propertyType: input.propertyType,
        listingType: input.listingType,
        price: input.price.toString(),
        bedrooms: input.bedrooms,
        bathrooms: input.bathrooms,
        area: input.area,
        amenities: input.amenities || [],
      });

      const propertyId = Number(result[0].insertId);

      // Insert images
      if (input.images && input.images.length > 0) {
        for (let i = 0; i < input.images.length; i++) {
          await db.insert(propertyImages).values({
            propertyId,
            imageUrl: input.images[i],
            isMain: i === 0 ? "yes" : "no",
          });
        }
      }

      return { id: propertyId, success: true };
    }),

  // ── Update property ──────────────────────────────────────────
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        city: z.string().optional(),
        propertyType: z.enum(["villa", "apartment", "penthouse", "commercial", "townhouse", "land"]).optional(),
        listingType: z.enum(["sale", "rent"]).optional(),
        price: z.number().positive().optional(),
        bedrooms: z.number().optional(),
        bathrooms: z.number().optional(),
        area: z.number().optional(),
        status: z.enum(["active", "sold", "rented", "inactive"]).optional(),
        amenities: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;

      // Verify ownership
      const existing = await db
        .select()
        .from(properties)
        .where(eq(properties.id, id))
        .limit(1);

      if (!existing[0]) throw new Error("Property not found");
      if (existing[0].sellerId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const updateData: any = { ...data };
      if (data.price) updateData.price = data.price.toString();

      await db
        .update(properties)
        .set(updateData)
        .where(eq(properties.id, id));

      return { success: true };
    }),

  // ── Delete property ──────────────────────────────────────────
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const existing = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.id))
        .limit(1);

      if (!existing[0]) throw new Error("Property not found");
      if (existing[0].sellerId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      // Delete images first
      await db
        .delete(propertyImages)
        .where(eq(propertyImages.propertyId, input.id));

      await db
        .delete(properties)
        .where(eq(properties.id, input.id));

      return { success: true };
    }),

  // ── Add property images ──────────────────────────────────────
  addImages: authedQuery
    .input(
      z.object({
        propertyId: z.number(),
        images: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      const existing = await db
        .select()
        .from(properties)
        .where(eq(properties.id, input.propertyId))
        .limit(1);

      if (!existing[0]) throw new Error("Property not found");
      if (existing[0].sellerId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized");
      }

      for (const imageUrl of input.images) {
        await db.insert(propertyImages).values({
          propertyId: input.propertyId,
          imageUrl,
          isMain: "no",
        });
      }

      return { success: true };
    }),
});
