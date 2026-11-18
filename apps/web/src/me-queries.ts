import { useMutation } from "@tanstack/react-query";
import { api } from "./api-client";
import { toApiError } from "./note-queries";

export const useMarkTourSeen = () =>
  useMutation({
    mutationFn: async () => {
      const res = await api.me["tour-seen"].$post();
      if (!res.ok) throw await toApiError(res);
    },
  });
