import { serveStatic } from "@hono/bun";
import { Hono } from "hono";
import { app } from "./app";
import { env } from "./env";
import { sharedLetterPage } from "./link-preview";

const website = new Hono()
  .get("/s/:token", async (c) => c.html(await sharedLetterPage(c.req.param("token"))))
  .use(serveStatic({ root: "../web/dist" }))
  .get("*", serveStatic({ path: "../web/dist/index.html" }));

const isApiRequest = (request: Request) => new URL(request.url).pathname.startsWith("/api");

console.log(`🚀 shareNcare -> http://localhost:${env.PORT} (${env.NODE_ENV})`);

if (env.RATE_LIMIT === "off") {
  console.warn("⚠️ Rate limiting is OFF. That is only meant for end-to-end tests.");
}

export default {
  port: env.PORT,
  fetch: (request: Request, server: unknown) => {
    if (env.NODE_ENV === "production" && !isApiRequest(request)) {
      return website.fetch(request, server);
    }
    return app.fetch(request, server);
  },
};
