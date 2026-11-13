import { BOARD_CHANGED, BOARD_GONE } from "@sharencare/shared";
import type { WSContext } from "hono/ws";
import { env } from "../env";

/*who is watching each board right now? board id -> the sockets open to it
it lives in this server's memory, so it only knows the people connected to this one running server.  */
const watchers = new Map<string, Set<WSContext>>();

//someone opened a board page. it returns the function to call when they leave
export function watch(boardId: string, socket: WSContext) {
  const sockets = watchers.get(boardId) ?? new Set();
  sockets.add(socket);
  watchers.set(boardId, sockets);

  return () => {
    sockets.delete(socket);
    if (sockets.size === 0) watchers.delete(boardId);
  };
}

//something on the board changed. this tells everyone watching to fetch it again
export function announce(boardId: string) {
  for (const socket of watchers.get(boardId) ?? []) socket.send(BOARD_CHANGED);
}

//the board was deleted or got a new link. Old links must stop hearing about it.
export function closeBoard(boardId: string) {
  for (const socket of watchers.get(boardId) ?? []) {
    socket.close(BOARD_GONE, "This board isn't here");
  }
}

export const watcherCount = (boardId: string) => watchers.get(boardId)?.size ?? 0;

/*a browser always says which site the page came from, in the Origin header 
only pages from our own site may open a live line. A program that is not a browser
can claim any Origin, so this protects people, not the data*/
const ownSite = new URL(env.BETTER_AUTH_URL).origin;
export const fromOwnSite = (origin: string | undefined) =>
  origin === undefined || origin === ownSite;
