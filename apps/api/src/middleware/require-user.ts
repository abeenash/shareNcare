import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { auth } from "../auth";

export type AuthUser = typeof auth.$Infer.Session.user;

export const requireUser = createMiddleware<{ Variables: { user: AuthUser } }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    throw new HTTPException(401, { message: "Please sign in first" });
  }
  c.set("user", session.user);
  await next();
});
