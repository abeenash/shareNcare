import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { authClient } from "../auth-client";
import { useOAuthErrorToast } from "../lib/use-oauth-error-toast";
import GoogleIcon from "./GoogleIcon";

const ConnectGoogle = () => {
  useOAuthErrorToast();

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) throw new Error(result.error.message ?? "Could not load your accounts");
      return result.data;
    },
  });

  const connect = useMutation({
    mutationFn: async () => {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/",
      });
      if (result.error) throw new Error(result.error.message ?? "Could not reach Google");
    },
    onError: (error) => toast.error(error.message),
  });

  const hasGoogle = accounts?.some((account) => account.providerId === "google");
  if (!accounts || hasGoogle) return null;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm justify-start w-full font-normal"
      onClick={() => connect.mutate()}
      disabled={connect.isPending}
    >
      <GoogleIcon />
      {connect.isPending ? "Opening Google..." : "Connect Google"}
    </button>
  );
};

export default ConnectGoogle;
