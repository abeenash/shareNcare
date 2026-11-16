import { MIN_PASSWORD_LENGTH } from "@sharencare/shared";
import { useMutation } from "@tanstack/react-query";
import { type SubmitEvent, useState } from "react";
import { toast } from "react-hot-toast";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { authClient } from "../auth-client";
import AuthCard from "../components/AuthCard";
import CodeField from "../components/CodeField";
import { useFeatures } from "../features-query";
import { authErrorMessage } from "../lib/auth-errors";

const ForgotPasswordPage = () => {
  const location = useLocation();
  const typed = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(typed);
  const [step, setStep] = useState<"email" | "new-password">("email");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const { data: features } = useFeatures();
  const navigate = useNavigate();

  const sendCode = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.requestPasswordReset({ email });
      if (error) throw new Error(authErrorMessage(error));
    },
    onSuccess: () => {
      setCode("");
      setStep("new-password");
    },
    onError: (error) => toast.error(error.message),
  });

  const reset = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.emailOtp.resetPassword({ email, otp: code, password });
      if (error) throw new Error(authErrorMessage(error));
    },
    onSuccess: () => {
      toast.success("Password changed. Sign in with your new one.");
      navigate("/login", { replace: true });
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === "email") sendCode.mutate();
    else reset.mutate();
  };

  if (features && !features.emailCodes) return <Navigate to="/login" replace />;

  return (
    <AuthCard>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {step === "email" ? (
          <>
            <h2 className="text-xl text-center">Forgot your password?</h2>
            <p className="text-center text-base-content/70">
              Type your email and we'll send you a 6-digit code.
            </p>
            <label className="form-control" htmlFor="email">
              <span className="label text-base-content/70">Email</span>
              <input
                id="email"
                type="email"
                className="input input-bordered rounded-xl bg-base-100 w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={sendCode.isPending}>
              {sendCode.isPending ? "Sending..." : "Send code"}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl text-center">Choose a new password</h2>
            {/* The same words whether or not the email has an account, so this page
                can't be used to find out who uses shareNcare. */}
            <p className="text-center text-base-content/70">
              If {email} has an account, a code is on its way.
            </p>
            <CodeField value={code} onChange={setCode} />
            <label className="form-control" htmlFor="new-password">
              <span className="label text-base-content/70">New password</span>
              <input
                id="new-password"
                type="password"
                className="input input-bordered rounded-xl bg-base-100 w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
                aria-describedby="new-password-hint"
                required
              />
            </label>
            <p id="new-password-hint" className="-mt-2 text-sm text-base-content/60">
              At least {MIN_PASSWORD_LENGTH} characters. Every device signed in to your account will
              be signed out.
            </p>
            <button type="submit" className="btn btn-primary" disabled={reset.isPending}>
              {reset.isPending ? "Saving..." : "Save new password"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => sendCode.mutate()}
              disabled={sendCode.isPending}
            >
              Send a new code
            </button>
          </>
        )}

        <Link to="/login" className="text-center text-sm link link-hover text-base-content/70">
          Back to sign in
        </Link>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
