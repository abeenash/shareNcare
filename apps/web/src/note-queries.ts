import type { ApiErrorBody, ApiErrorCode, NoteInput } from "@sharencare/shared";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { api, type Note } from "./api-client";

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode | undefined;

  constructor(status: number, body: ApiErrorBody | undefined) {
    super(body?.error.message ?? `Request failed with status ${status}`);
    this.status = status;
    this.code = body?.error.code;
  }
}

async function toApiError(res: { status: number; json: () => Promise<unknown> }) {
  const body = (await res.json().catch(() => undefined)) as ApiErrorBody | undefined;
  return new ApiError(res.status, body);
}

export const noteKeys = {
  all: ["notes"] as const,
  trash: ["notes", "trash"] as const,
  detail: (id: string) => ["notes", id] as const,
};

const byPinnedThenNewest = (a: Note, b: Note) =>
  Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt);

async function removeFromList(queryClient: QueryClient, queryKey: readonly string[], id: string) {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<Note[]>(queryKey);
  queryClient.setQueryData<Note[]>(queryKey, (list) => list?.filter((n) => n.id !== id));
  return { queryKey, previous };
}

const byNewestInTrash = (a: Note, b: Note) => (b.deletedAt ?? "").localeCompare(a.deletedAt ?? "");

type NoteListKey = typeof noteKeys.all | typeof noteKeys.trash;
type Snapshot = [NoteListKey, Note[] | undefined][];

async function moveBetweenLists(
  queryClient: QueryClient,
  move: {
    id: string;
    from: NoteListKey;
    to: NoteListKey;
    update: (note: Note) => Note;
    sort: (a: Note, b: Note) => number;
  },
) {
  await queryClient.cancelQueries({ queryKey: noteKeys.all });

  const snapshot: Snapshot = [
    [move.from, queryClient.getQueryData<Note[]>(move.from)],
    [move.to, queryClient.getQueryData<Note[]>(move.to)],
  ];
  const note = snapshot[0]?.[1]?.find((n) => n.id === move.id);

  queryClient.setQueryData<Note[]>(move.from, (list) => list?.filter((n) => n.id !== move.id));
  if (note) {
    queryClient.setQueryData<Note[]>(move.to, (list) =>
      list ? [move.update(note), ...list].toSorted(move.sort) : list,
    );
  }
  return { snapshot };
}

function restoreSnapshot(queryClient: QueryClient, snapshot: Snapshot) {
  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function useNotes() {
  return useQuery({
    queryKey: noteKeys.all,
    queryFn: async () => {
      const res = await api.notes.$get();
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function useTrash() {
  return useQuery({
    queryKey: noteKeys.trash,
    queryFn: async () => {
      const res = await api.notes.trash.$get();
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: async () => {
      const res = await api.notes[":id"].$get({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NoteInput) => {
      const res = await api.notes.$post({ json: input });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useUpdateNote(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NoteInput) => {
      const res = await api.notes[":id"].$put({ param: { id }, json: input });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: (updatedNote) => {
      queryClient.setQueryData(noteKeys.detail(id), updatedNote);
      queryClient.setQueryData<Note[]>(noteKeys.all, (notes) =>
        notes?.map((n) => (n.id === updatedNote.id ? updatedNote : n)),
      );
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.notes[":id"].$delete({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onMutate: (id) =>
      moveBetweenLists(queryClient, {
        id,
        from: noteKeys.all,
        to: noteKeys.trash,
        update: (note) => ({ ...note, deletedAt: new Date().toISOString() }),
        sort: byNewestInTrash,
      }),

    onSuccess: () => {
      toast.success("Note moved to trash");
    },
    onError: (error, _id, onMutateResult) => {
      if (onMutateResult) restoreSnapshot(queryClient, onMutateResult.snapshot);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useTogglePin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const res = await api.notes[":id"].pin.$patch({ param: { id }, json: { pinned } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onMutate: async ({ id, pinned }) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previous = queryClient.getQueryData<Note[]>(noteKeys.all);
      queryClient.setQueryData<Note[]>(noteKeys.all, (notes) =>
        notes?.map((n) => (n.id === id ? { ...n, pinned } : n)).toSorted(byPinnedThenNewest),
      );
      return { previous };
    },
    onError: (error, _variables, onMutateResult) => {
      queryClient.setQueryData(noteKeys.all, onMutateResult?.previous);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function useRestoreNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.notes[":id"].restore.$post({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onMutate: (id) =>
      moveBetweenLists(queryClient, {
        id,
        from: noteKeys.trash,
        to: noteKeys.all,
        update: (note) => ({ ...note, deletedAt: null }),
        sort: byPinnedThenNewest,
      }),
    onSuccess: () => {
      toast.success("Your note has been restored");
    },
    onError: (error, _id, onMutateResult) => {
      if (onMutateResult) restoreSnapshot(queryClient, onMutateResult.snapshot);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}

export function usePurgeNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.notes[":id"].permanent.$delete({ param: { id } });
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onMutate: (id) => removeFromList(queryClient, noteKeys.trash, id),
    onSuccess: () => {
      toast.success("Note deleted forever");
    },
    onError: (error, _id, onMutateResult) => {
      if (onMutateResult) {
        queryClient.setQueryData(onMutateResult.queryKey, onMutateResult.previous);
      }
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.trash }),
  });
}
