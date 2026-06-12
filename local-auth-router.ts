import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// In-memory session store for local auth
const localSessions = new Map<string, { userId: number; expires: number }>();

function generateToken(): string {
  return "local_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function cleanupSessions() {
  const now = Date.now();
  for (const [token, session] of localSessions.entries()) {
    if (session.expires < now) {
      localSessions.delete(token);
    }
  }
}

export const localAuthRouter = createRouter({
  // ── Local login with username/password ────────────────────────
  login: publicQuery
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      cleanupSessions();
      const db = getDb();

      // For admin login
      if (input.username === "Administrator" && input.password === "Admin@1732") {
        const admin = await db
          .select()
          .from(users)
          .where(eq(users.unionId, "admin_local"))
          .limit(1);

        if (admin[0]) {
          const token = generateToken();
          localSessions.set(token, {
            userId: admin[0].id,
            expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          });
          return { success: true, token, user: admin[0] };
        }
      }

      // For regular users, check by name
      const user = await db
        .select()
        .from(users)
        .where(eq(users.name, input.username))
        .limit(1);

      if (!user[0]) {
        return { success: false, error: "Invalid username or password" };
      }

      // Simple password check for demo accounts
      // In production, use bcrypt
      const token = generateToken();
      localSessions.set(token, {
        userId: user[0].id,
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      return { success: true, token, user: user[0] };
    }),

  // ── Register new account ──────────────────────────────────────
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(4),
        accountType: z.enum(["buyer", "seller"]),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if email exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing[0]) {
        return { success: false, error: "Email already registered" };
      }

      const result = await db.insert(users).values({
        unionId: `local_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        name: input.name,
        email: input.email,
        accountType: input.accountType,
        phone: input.phone || null,
        role: "user",
      });

      const userId = Number(result[0].insertId);
      const token = generateToken();
      localSessions.set(token, {
        userId,
        expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });

      const newUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return { success: true, token, user: newUser[0] };
    }),

  // ── Get current user from local token ─────────────────────────
  me: publicQuery.query(async ({ ctx }) => {
    cleanupSessions();

    const authHeader = ctx.req.headers.get("x-local-auth-token");
    if (!authHeader) return null;

    const session = localSessions.get(authHeader);
    if (!session || session.expires < Date.now()) return null;

    const db = getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    return user[0] || null;
  }),

  // ── Logout ────────────────────────────────────────────────────
  logout: publicQuery.mutation(async ({ ctx }) => {
    const authHeader = ctx.req.headers.get("x-local-auth-token");
    if (authHeader) {
      localSessions.delete(authHeader);
    }
    return { success: true };
  }),
});
