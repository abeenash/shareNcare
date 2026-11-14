import {
  BOARD_GONE,
  type LiveMessage,
  type LiveRequest,
  LiveRequestSchema,
  WRITING_FADES_AFTER,
} from "@sharencare/shared";
import type { WSContext } from "hono/ws";
import { env } from "../env";

export type Viewer = { id: string; firstName: string } | null;

type Watcher = {
  socket: WSContext;
  viewer: Viewer;
  writingTimer?: ReturnType<typeof setTimeout>;
};

const boards = new Map<string, Set<Watcher>>();

const watchersOf = (boardId: string) => boards.get(boardId) ?? new Set<Watcher>();

const send = (watcher: Watcher, message: LiveMessage) =>
  watcher.socket.send(JSON.stringify(message));

//to tell everyone on the board how many are here now
function sendHeadCount(boardId: string) {
  const watchers = watchersOf(boardId);
  for (const watcher of watchers) send(watcher, { type: "here", count: watchers.size });
}

//to tell everyone on the board who is typing. Each person hears everyone except themselves, and someone typing in two tabs is still one name
function sendWriters(boardId: string) {
  const watchers = watchersOf(boardId);
  const writers = [...watchers].flatMap((w) => (w.writingTimer && w.viewer ? [w.viewer] : []));
  for (const watcher of watchers) {
    const others = writers.filter((writer) => writer.id !== watcher.viewer?.id);
    const names = [...new Map(others.map((writer) => [writer.id, writer.firstName])).values()];
    send(watcher, { type: "writing", names });
  }
}

//to tell someone opened a board page. it returns what their line can do next: say they are typing and leave
export function watch(boardId: string, socket: WSContext, viewer: Viewer) {
  const watcher: Watcher = { socket, viewer };
  const watchers = boards.get(boardId) ?? new Set();
  watchers.add(watcher);
  boards.set(boardId, watchers);
  sendHeadCount(boardId);
  sendWriters(boardId);

  return {
    writing() {
      if (!viewer) return;
      const wasWriting = watcher.writingTimer !== undefined;
      clearTimeout(watcher.writingTimer);
      watcher.writingTimer = setTimeout(() => {
        watcher.writingTimer = undefined;
        sendWriters(boardId);
      }, WRITING_FADES_AFTER);
      if (!wasWriting) sendWriters(boardId);
    },

    leave() {
      const wasWriting = watcher.writingTimer !== undefined;
      clearTimeout(watcher.writingTimer);
      watchers.delete(watcher);
      if (watchers.size === 0) {
        boards.delete(boardId);
        return;
      }
      sendHeadCount(boardId);
      if (wasWriting) sendWriters(boardId);
    },
  };
}

//user'(s') note is posted, so they are not writing anymore, in any tab
export function doneWriting(boardId: string, userId: string) {
  let anyStopped = false;
  for (const watcher of watchersOf(boardId)) {
    if (watcher.viewer?.id === userId && watcher.writingTimer) {
      clearTimeout(watcher.writingTimer);
      watcher.writingTimer = undefined;
      anyStopped = true;
    }
  }
  if (anyStopped) sendWriters(boardId);
}

//something on the board changed. this tells everyone watching to fetch it again
export function announce(boardId: string) {
  for (const watcher of watchersOf(boardId) ?? []) send(watcher, { type: "changed" });
}

//the board was deleted or got a new link. Old links must stop hearing about it.
export function closeBoard(boardId: string) {
  for (const watcher of watchersOf(boardId) ?? []) {
    watcher.socket.close(BOARD_GONE, "This board isn't here");
  }
}

export const watcherCount = (boardId: string) => watchersOf(boardId).size;

//whatever a browser sends is a stranger's words. Anything that is not exactly a message we know comes back as null and is ignored
export function readLiveRequest(data: unknown): LiveRequest | null {
  if (typeof data !== "string") return null;
  try {
    const parsed = LiveRequestSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/*a browser always says which site the page came from, in the Origin header 
only pages from our own site may open a live line. A program that is not a browser
can claim any Origin, so this protects people, not the data*/
const ownSite = new URL(env.BETTER_AUTH_URL).origin;
export const fromOwnSite = (origin: string | undefined) =>
  origin === undefined || origin === ownSite;
