import type { AiQuota, HelpMeWriteInput } from "@sharencare/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api-client";
import { comeBackAt } from "./lib/come-back";
import { toApiError } from "./note-queries";

export class AiLimitError extends Error {
  backAt: Date | null;

  constructor(message: string, backAt: Date | null) {
    super(message);
    this.backAt = backAt;
  }
}

export const aiKeys = {
  quota: ["ai", "quota"] as const,
};

export function useAiQuota() {
  return useQuery({
    queryKey: aiKeys.quota,
    queryFn: async () => {
      const res = await api.ai.quota.$get();
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
  });
}

export function useHelpMeWrite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: HelpMeWriteInput) => {
      const res = await api.ai["help-me-write"].$post({ json: input });
      if (res.status === 429) {
        const { message } = await toApiError(res);
        throw new AiLimitError(message, comeBackAt(res.headers.get("retry-after")));
      }
      if (!res.ok) throw await toApiError(res);
      return res.json();
    },
    onSuccess: (answer) => {
      queryClient.setQueryData<AiQuota>(aiKeys.quota, (old) =>
        old ? { ...old, remaining: answer.remaining } : old,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: aiKeys.quota }),
  });
}
