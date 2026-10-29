import { serveStatic } from "@hono/bun";
import { Hono } from "hono";
import { app } from "./app";
import { env } from "./env";

const website = new Hono()
  .use(serveStatic({ root: "../web/dist" }))
  .get("*", serveStatic({ path: "../web/dist/index.html" }));

const isApiRequest = (request: Request) => new URL(request.url).pathname.startsWith("/api");

console.log(`🚀 shareNcare -> http://localhost:${env.PORT} (${env.NODE_ENV})`);

export default {
  port: env.PORT,
  fetch: (request: Request, server: unknown) => {
    if (env.NODE_ENV === "production" && !isApiRequest(request)) {
      return website.fetch(request, server);
    }
    return app.fetch(request, server);
  },
};
