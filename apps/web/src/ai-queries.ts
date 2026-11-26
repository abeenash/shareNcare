import type { HelpMeWriteInput } from "@sharencare/shared";
import { useMutation } from "@tanstack/react-query";
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

export function useHelpMeWrite() {
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
  });
}
