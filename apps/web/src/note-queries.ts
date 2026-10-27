import type { ApiErrorBody, ApiErrorCode, NoteInput } from "@sharencare/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  detail: (id: string) => ["notes", id] as const,
};

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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });
      const previousNotes = queryClient.getQueryData<Note[]>(noteKeys.all);
      queryClient.setQueryData<Note[]>(noteKeys.all, (notes) => notes?.filter((n) => n.id !== id));
      return { previousNotes };
    },
    onSuccess: () => {
      toast.success("Your note has been deleted");
    },
    onError: (error, _id, onMutateResult) => {
      queryClient.setQueryData(noteKeys.all, onMutateResult?.previousNotes);
      toast.error(error.message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }),
  });
}
