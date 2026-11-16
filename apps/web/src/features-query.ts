import { useQuery } from "@tanstack/react-query";
import { api } from "./api-client";
import { toApiError } from "./note-queries";

export const useFeatures = () =>
  useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const res = await api.features.$get();
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
