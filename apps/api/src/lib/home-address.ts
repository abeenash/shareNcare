import { env } from "../env";

const home = new URL(env.BETTER_AUTH_URL);

export function redirectHome(request: Request): Response | null {
  const url = new URL(request.url);

  if (url.host === home.host) return null;
  if (url.pathname === "/api/health") return null;

  return Response.redirect(`${home.origin}${url.pathname}${url.search}`, 308);
}
