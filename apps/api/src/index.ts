import { app } from "./app";
import { env } from "./env";

console.log(`🚀 shareNcare API -> http://localhost:${env.PORT}/api(${env.NODE_ENV})`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
