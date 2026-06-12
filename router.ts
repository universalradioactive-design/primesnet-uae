import { authRouter } from "./auth-router";
import { localAuthRouter } from "./local-auth-router";
import { propertyRouter } from "./property-router";
import { messageRouter } from "./message-router";
import { appointmentRouter } from "./appointment-router";
import { adminRouter } from "./admin-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  property: propertyRouter,
  message: messageRouter,
  appointment: appointmentRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
