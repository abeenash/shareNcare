import { Hono } from "hono";
import { env } from "../env";

export const featuresRoute = new Hono().get("/", (c) =>
  c.json({ emailCodes: env.EMAIL_CODES === "on" }),
);
