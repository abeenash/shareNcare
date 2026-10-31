import { useEffect } from "react";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router";

const messages: Record<string, string> = {
  account_not_linked:
    "This email already has a password. Sign in with it, then press the Google button in the top bar to connect.",
  email_does_not_match: "That Google account uses a different email than your shareNcare account.",
  account_already_linked_to_different_user:
    "That Google account already belongs to another shareNcare user.",
  access_denied: "Google sign-in was cancelled.",
};

export const useOAuthErrorToast = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const code = searchParams.get("error");

  useEffect(() => {
    if (!code) return;
    const message = messages[code] ?? "Google sign-in failed. Please try again.";
    toast.error(message, { id: code, duration: 8000 });
    setSearchParams({}, { replace: true });
  }, [code, setSearchParams]);
};
