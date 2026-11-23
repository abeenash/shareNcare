import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { SENTRY_PORT, sentryInboxDir } from "../tests/e2e-env";

await mkdir(sentryInboxDir, { recursive: true });

createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");

  if (request.method === "POST") {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk);
    const name = `${Date.now()}-${crypto.randomUUID()}.txt`;
    await writeFile(join(sentryInboxDir, name), Buffer.concat(chunks));
  }
  response.end("{}");
}).listen(SENTRY_PORT, () => console.log(`Fake Sentry is listening on ${SENTRY_PORT}`));
