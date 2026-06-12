import { getDb } from "../api/queries/connection";
import { users, properties, propertyImages } from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  const db = getDb();

  console.log("Seeding database...");

  // Check if admin exists
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.unionId, "admin_local"))
    .limit(1);

  if (existingAdmin.length === 0) {
    // Create admin user
    await db.insert(users).values({
      unionId: "admin_local",
      name: "Administrator",
      email: "admin@primenest.ae",
      role: "admin",
      accountType: "seller",
      avatar: "",
    });
    console.log("Admin user created: Administrator / Admin@1732");
  }

  // Check if demo seller exists
  const existingSeller = await db
    .select()
    .from(users)
    .where(eq(users.unionId, "seller_demo"))
    .limit(1);

  let sellerId = 1;
  if (existingSeller.length === 0) {
    const result = await db.insert(users).values({
      unionId: "seller_demo",
      name: "Ahmad Hassan",
      email: "ahmad@primenest.ae",
      role: "user",
      accountType: "seller",
      phone: "+971 50 123 4567",
      bio: "Premium property specialist with 15 years experience in UAE real estate",
    });
    sellerId = Number(result[0].insertId);
    console.log("Demo seller created");
  } else {
    sellerId = existingSeller[0].id;
  }

  // Check if demo buyer exists
  const existingBuyer = await db
    .select()
    .from(users)
    .where(eq(users.unionId, "buyer_demo"))
    .limit(1);

  let buyerId = 1;
  if (existingBuyer.length === 0) {
    const result = await db.insert(users).values({
      unionId: "buyer_demo",
      name: "Sarah Johnson",
      email: "sarah@primenest.ae",
      role: "user",
      accountType: "buyer",
      phone: "+971 55 987 6543",
    });
    buyerId = Number(result[0].insertId);
    console.log("Demo buyer created");
  } else {
    buyerId = existingBuyer[0].id;
  }

  // Check if properties exist
  const existingProps = await db.select().from(properties).limit(1);

  if (existingProps.length === 0) {
    // Insert sample properties
    const sampleProperties = [
      {
        sellerId,
        title: "Luxury Villa in Emirates Hills",
        description: "Stunning 6-bedroom villa with panoramic golf course views, private pool, and smart home automation. This architectural masterpiece offers over 15,000 sq ft of meticulously designed living space featuring Italian marble floors, custom woodwork, and floor-to-ceiling windows throughout.",
        location: "Emirates Hills, Sector E",
        city: "Dubai",
        propertyType: "villa" as const,
        listingType: "sale" as const,
        price: "28500000",
        bedrooms: 6,
        bathrooms: 7,
        area: 15000,
        isPremium: "yes" as const,
        isFeatured: "yes" as const,
        amenities: ["Private Pool", "Smart Home", "Golf View", "Maid Room", "Home Theater", "Wine Cellar", "Elevator"],
      },
      {
        sellerId,
        title: "Downtown Dubai Penthouse",
        description: "Exclusive penthouse in the heart of Downtown with unobstructed Burj Khalifa views. This 4-bedroom residence features double-height ceilings, a private rooftop terrace with plunge pool, and bespoke interiors by a world-renowned design house.",
        location: "Burj Khalifa District",
        city: "Dubai",
        propertyType: "penthouse" as const,
        listingType: "sale" as const,
        price: "42000000",
        bedrooms: 4,
        bathrooms: 5,
        area: 8500,
        isPremium: "yes" as const,
        isFeatured: "yes" as const,
        amenities: ["Burj View", "Private Pool", "Terrace", "Concierge", "Gym Access", "Valet"],
      },
      {
        sellerId,
        title: "Waterfront Apartment in Dubai Marina",
        description: "Elegant 3-bedroom apartment with direct marina views. Recently renovated with premium finishes, open-plan kitchen with Miele appliances, and access to world-class amenities including infinity pool and private beach club.",
        location: "Dubai Marina Walk",
        city: "Dubai",
        propertyType: "apartment" as const,
        listingType: "sale" as const,
        price: "6500000",
        bedrooms: 3,
        bathrooms: 4,
        area: 3200,
        isPremium: "no" as const,
        isFeatured: "yes" as const,
        amenities: ["Marina View", "Pool", "Gym", "Beach Access", "Concierge"],
      },
      {
        sellerId,
        title: "Palm Jumeirah Signature Villa",
        description: "Beachfront signature villa on the iconic Palm Jumeirah frond. This 5-bedroom masterpiece offers 180-degree sea views, a private beach, infinity pool, and direct access to the boardwalk. The epitome of coastal luxury living.",
        location: "Palm Jumeirah, Frond N",
        city: "Dubai",
        propertyType: "villa" as const,
        listingType: "sale" as const,
        price: "55000000",
        bedrooms: 5,
        bathrooms: 6,
        area: 12000,
        isPremium: "yes" as const,
        isFeatured: "yes" as const,
        amenities: ["Private Beach", "Infinity Pool", "Sea View", "Smart Home", "Home Cinema", "Private Gym"],
      },
      {
        sellerId,
        title: "Commercial Office in Business Bay",
        description: "Premium Grade A office space in the heart of Business Bay. Floor-to-ceiling glass facade offering panoramic canal views. Fully fitted with meeting rooms, open plan area, and executive offices. Ideal for multinational headquarters.",
        location: "Business Bay, Bay Square",
        city: "Dubai",
        propertyType: "commercial" as const,
        listingType: "rent" as const,
        price: "1800000",
        bedrooms: 0,
        bathrooms: 4,
        area: 5000,
        isPremium: "no" as const,
        isFeatured: "no" as const,
        amenities: ["Canal View", "Parking", "24/7 Security", "Conference Rooms", "Cafeteria"],
      },
      {
        sellerId,
        title: "Saadiyat Island Beachfront Villa",
        description: "Contemporary beachfront villa on Abu Dhabi's cultural island. This 4-bedroom home features a seamless indoor-outdoor design with sliding glass walls, a courtyard pool, and direct beach access. Minutes from Louvre Abu Dhabi.",
        location: "Saadiyat Beach District",
        city: "Abu Dhabi",
        propertyType: "villa" as const,
        listingType: "sale" as const,
        price: "22000000",
        bedrooms: 4,
        bathrooms: 5,
        area: 9500,
        isPremium: "yes" as const,
        isFeatured: "yes" as const,
        amenities: ["Beach Access", "Pool", "Garden", "Sea View", "Smart Home"],
      },
      {
        sellerId,
        title: "Jumeirah Luxury Duplex",
        description: "Magnificent duplex penthouse in Jumeirah with a stunning double-height living room, custom crystal chandelier, and private art gallery wall. The residence features a spiral staircase, four en-suite bedrooms, and a rooftop terrace.",
        location: "Jumeirah 1",
        city: "Dubai",
        propertyType: "penthouse" as const,
        listingType: "sale" as const,
        price: "18500000",
        bedrooms: 4,
        bathrooms: 5,
        area: 7200,
        isPremium: "yes" as const,
        isFeatured: "no" as const,
        amenities: ["Sea View", "Private Elevator", "Rooftop Terrace", "Home Cinema", "Wine Cellar"],
      },
      {
        sellerId,
        title: "Retail Space in Downtown Dubai",
        description: "Prime retail space on Sheikh Mohammed Bin Rashid Boulevard with high foot traffic and visibility. Suitable for luxury brands, restaurants, or flagship stores. Surrounded by world-class hotels and residences.",
        location: "Mohammed Bin Rashid Blvd",
        city: "Dubai",
        propertyType: "commercial" as const,
        listingType: "rent" as const,
        price: "950000",
        bedrooms: 0,
        bathrooms: 2,
        area: 2800,
        isPremium: "no" as const,
        isFeatured: "no" as const,
        amenities: ["High Footfall", "Parking", "Storage", "24/7 Access"],
      },
    ];

    for (const prop of sampleProperties) {
      const result = await db.insert(properties).values(prop);
      const propId = Number(result[0].insertId);

      // Add images based on property type
      const imageMap: Record<string, string[]> = {
        villa: ["/prop-villa-1.jpg", "/prop-villa-2.jpg"],
        penthouse: ["/prop-penthouse-1.jpg", "/prop-penthouse-2.jpg"],
        apartment: ["/prop-apartment-1.jpg", "/prop-apartment-2.jpg"],
        commercial: ["/prop-commercial-1.jpg", "/prop-commercial-2.jpg"],
      };

      const imgs = imageMap[prop.propertyType] || ["/prop-villa-1.jpg"];
      for (let i = 0; i < imgs.length; i++) {
        await db.insert(propertyImages).values({
          propertyId: propId,
          imageUrl: imgs[i],
          isMain: i === 0 ? "yes" : "no",
        });
      }
    }

    console.log(`${sampleProperties.length} sample properties created`);
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
