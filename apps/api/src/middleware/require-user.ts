import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { endTime, startTime, type TimingVariables } from "hono/timing";
import { auth } from "../auth";

export type AuthUser = typeof auth.$Infer.Session.user;

type RequireUserEnv = { Variables: { user: AuthUser } & TimingVariables };

export const requireUser = createMiddleware<RequireUserEnv>(async (c, next) => {
  startTime(c, "session", "Session lookup");
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  endTime(c, "session");

  if (!session) {
    throw new HTTPException(401, { message: "Please sign in first" });
  }
  c.set("user", session.user);
  await next();
});
