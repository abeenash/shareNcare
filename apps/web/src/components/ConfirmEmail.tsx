import { CODE_MINUTES } from "@sharencare/shared";
import { useMutation } from "@tanstack/react-query";
import { type SubmitEvent, useState } from "react";
import { toast } from "react-hot-toast";
import { authClient } from "../auth-client";
import { authErrorMessage } from "../lib/auth-errors";
import CodeField from "./CodeField";

type ConfirmEmailProps = {
  email: string;
  notice: string;
  onConfirmed: () => void;
  onBack: () => void;
};

const ConfirmEmail = ({ email, notice, onConfirmed, onBack }: ConfirmEmailProps) => {
  const [code, setCode] = useState("");

  const confirm = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.verifyEmail({ email, otp: code });
      if (error) throw new Error(authErrorMessage(error));
    },
    onSuccess: onConfirmed,
    onError: (error) => toast.error(error.message),
  });

  const resend = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      if (error) throw new Error(authErrorMessage(error));
    },
    onSuccess: () => {
      setCode("");
      toast.success("A new code is on its way");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    confirm.mutate();
  };
  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <h2 className="text-xl text-center">Check your email</h2>
      <p className="text-center text-base-content/70">
        {notice} It works for {CODE_MINUTES} minutes.
      </p>

      <CodeField value={code} onChange={setCode} />

      <button type="submit" className="btn btn-primary" disabled={confirm.isPending}>
        {confirm.isPending ? "Checking..." : "Confirm"}
      </button>

      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => resend.mutate()}
        disabled={resend.isPending}
      >
        {resend.isPending ? "Sending..." : "Send a new code"}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        Already have an account? Sign in
      </button>
    </form>
  );
};

export default ConfirmEmail;
