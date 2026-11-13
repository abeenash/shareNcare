import {
  BOARD_CHANGED,
  BOARD_GONE,
  type BoardInput,
  type BoardNoteInput,
} from "@sharencare/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { api } from "./api-client";
import { retryDelay } from "./lib/retry-delay";
import { toApiError } from "./note-queries";

type Board = InferResponseType<(typeof api.boards)[":id"]["$get"], 200>;

export const boardKeys = {
  all: ["boards"] as const,
  detail: (id: string) => ["boards", id] as const,
  shared: (token: string) => ["shared-board", token] as const,
};

/* ---------- For the owner ---------- */

export function useBoards() {
  return useQuery({
    queryKey: boardKeys.all,
    queryFn: async () => {
      const res = await api.boards.$get();
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function useBoard(id: string) {
  return useQuery({
    queryKey: boardKeys.detail(id),
    queryFn: async () => {
      const res = await api.boards[":id"].$get({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BoardInput) => {
      const res = await api.boards.$post({ json: input });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.all }),
    onError: (error) => toast.error(error.message),
  });
}

export function useSetBoardOpen(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (open: boolean) => {
      const res = await api.boards[":id"].$patch({ param: { id }, json: { open } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    // Flip the switch on screen right away, and put it back if the server says no.
    onMutate: async (open) => {
      const queryKey = boardKeys.detail(id);
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Board>(queryKey);
      queryClient.setQueryData<Board>(queryKey, (board) =>
        board ? { ...board, closedAt: open ? null : new Date().toISOString() } : board,
      );
      return { previous };
    },
    onSuccess: (_board, open) => {
      toast.success(open ? "The board is taking notes again" : "The board is closed to new notes");
    },
    onError: (error, _open, onMutateResult) => {
      queryClient.setQueryData(boardKeys.detail(id), onMutateResult?.previous);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: boardKeys.all }),
  });
}

export function useNewBoardLink(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.boards[":id"]["new-link"].$post({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => {
      toast.success("New link ready. The old one no longer works.");
      return queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.boards[":id"].$delete({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: (_deleted, id) => {
      toast.success("Board deleted");
      queryClient.removeQueries({ queryKey: boardKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useSetNoteHidden(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ noteId, hidden }: { noteId: string; hidden: boolean }) => {
      const res = await api.boards[":id"].notes[":noteId"].$patch({
        param: { id: boardId, noteId },
        json: { hidden },
      });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteBoardNote(boardId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await api.boards[":id"].notes[":noteId"].$delete({
        param: { id: boardId, noteId },
      });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Note deleted");
      return queryClient.invalidateQueries({ queryKey: boardKeys.all });
    },
    onError: (error) => toast.error(error.message),
  });
}

/* ---------- For guests with the link ---------- */

export function useSharedBoard(token: string) {
  return useQuery({
    queryKey: boardKeys.shared(token),
    queryFn: async () => {
      const res = await api["shared-boards"][":token"].$get({ param: { token } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function usePostBoardNote(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BoardNoteInput) => {
      const res = await api["shared-boards"][":token"].notes.$post({
        param: { token },
        json: input,
      });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardKeys.shared(token) }),
    onError: (error) => toast.error(error.message),
  });
}

export function useDeleteMyNote(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await api["shared-boards"][":token"].notes[":noteId"].$delete({
        param: { token, noteId },
      });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Your note was removed");
      return queryClient.invalidateQueries({ queryKey: boardKeys.shared(token) });
    },
    onError: (error) => toast.error(error.message),
  });
}

export function useReportNote(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await api["shared-boards"][":token"].notes[":noteId"].report.$post({
        param: { token, noteId },
      });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => {
      toast.success("Thank you. The board's owner will take a look.");
      return queryClient.invalidateQueries({ queryKey: boardKeys.shared(token) });
    },
    onError: (error) => toast.error(error.message),
  });
}

/* --------------- Live updates ------------------ */
//since a websocket address starts with ws:// (or wss:// => https' site), so it should resolve to "https://sharencare.onrender.com" -> "wss://sharencare.onrender.com/api/shared-boards/<token>/live
function liveAddress(token: string) {
  const address = new URL(`/api/shared-boards/${token}/live`, window.location.href);
  address.protocol = address.protocol === "https:" ? "wss:" : "ws:";
  return address.href;
}

/*this function keeps a live line (a websocket) open to a board while its page is on screen.
whenever the server says "changed", the board is fetched again, so new notes simply appear. it returns true while the line is open. */
export function useLiveBoard(token: string | undefined) {
  const queryClient = useQueryClient();
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!token) return;

    let socket: WebSocket;
    let failures = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let leaving = false;

    //both pages show this board, (both guest page and owner's page). only the one on screen actually fetches again, the other is just marked old
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: boardKeys.shared(token) });
      queryClient.invalidateQueries({ queryKey: boardKeys.all });
    };

    const connect = () => {
      socket = new WebSocket(liveAddress(token));

      socket.onopen = () => {
        failures = 0;
        setLive(true);
        refresh(); //important! anything that happened while we were not listening
      };

      socket.onmessage = (event) => {
        if (event.data === BOARD_CHANGED) refresh();
      };

      socket.onclose = (event) => {
        if (leaving) return;
        setLive(false);

        //the board was deleted or got a new link. old link will never work.
        if (event.code === BOARD_GONE) {
          refresh();
          return;
        }
        retryTimer = setTimeout(connect, retryDelay(failures));
        failures += 1;
      };
    };
    connect();

    //the page is going away or the token changed. so it is hung up and stopped retrying
    return () => {
      leaving = true;
      clearTimeout(retryTimer);
      socket.close();
      setLive(false);
    };
  }, [token, queryClient]);

  return live;
}
