import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  decimal,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ─────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  accountType: mysqlEnum("accountType", ["buyer", "seller"]).default("buyer").notNull(),
  phone: varchar("phone", { length: 50 }),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Properties ────────────────────────────────────────────────────
export const properties = mysqlTable("properties", {
  id: serial("id").primaryKey(),
  sellerId: bigint("sellerId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  location: varchar("location", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  propertyType: mysqlEnum("propertyType", [
    "villa",
    "apartment",
    "penthouse",
    "commercial",
    "townhouse",
    "land",
  ]).notNull(),
  listingType: mysqlEnum("listingType", ["sale", "rent"]).default("sale").notNull(),
  price: decimal("price", { precision: 15, scale: 2 }).notNull(),
  bedrooms: int("bedrooms"),
  bathrooms: int("bathrooms"),
  area: int("area"), // sqft
  isPremium: mysqlEnum("isPremium", ["yes", "no"]).default("no").notNull(),
  isFeatured: mysqlEnum("isFeatured", ["yes", "no"]).default("no").notNull(),
  status: mysqlEnum("status", ["active", "sold", "rented", "inactive"]).default("active").notNull(),
  amenities: json("amenities").$type<string[]>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// ─── Property Images ───────────────────────────────────────────────
export const propertyImages = mysqlTable("propertyImages", {
  id: serial("id").primaryKey(),
  propertyId: bigint("propertyId", { mode: "number", unsigned: true }).notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }).notNull(),
  isMain: mysqlEnum("isMain", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PropertyImage = typeof propertyImages.$inferSelect;
export type InsertPropertyImage = typeof propertyImages.$inferInsert;

// ─── Messages ──────────────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  senderId: bigint("senderId", { mode: "number", unsigned: true }).notNull(),
  receiverId: bigint("receiverId", { mode: "number", unsigned: true }).notNull(),
  propertyId: bigint("propertyId", { mode: "number", unsigned: true }),
  content: text("content").notNull(),
  isRead: mysqlEnum("isRead", ["yes", "no"]).default("no").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

// ─── Appointments ──────────────────────────────────────────────────
export const appointments = mysqlTable("appointments", {
  id: serial("id").primaryKey(),
  propertyId: bigint("propertyId", { mode: "number", unsigned: true }).notNull(),
  buyerId: bigint("buyerId", { mode: "number", unsigned: true }).notNull(),
  sellerId: bigint("sellerId", { mode: "number", unsigned: true }).notNull(),
  appointmentDate: varchar("appointmentDate", { length: 50 }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 20 }).notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
