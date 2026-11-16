import { MIN_PASSWORD_LENGTH } from "@sharencare/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type SubmitEvent, useState } from "react";
import toast from "react-hot-toast";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { authClient } from "../auth-client";
import AuthCard from "../components/AuthCard";
import ConfirmEmail from "../components/ConfirmEmail";
import GoogleIcon from "../components/GoogleIcon";
import { useFeatures } from "../features-query";
import { authErrorMessage } from "../lib/auth-errors";
import { safeNext } from "../lib/safe-next";
import { useOAuthErrorToast } from "../lib/use-oauth-error-toast";

type Mode = "sign-in" | "sign-up" | "confirm";

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { data: session } = authClient.useSession();
  const { data: features } = useFeatures();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  useOAuthErrorToast();

  const enter = () => {
    queryClient.clear();
    navigate(next);
  };

  const submit = useMutation({
    mutationFn: async (): Promise<"in" | "confirm"> => {
      if (mode === "sign-up") {
        const { data, error } = await authClient.signUp.email({ name, email, password });
        if (error) throw new Error(authErrorMessage(error));
        return data.token ? "in" : "confirm";
      }
      const { error } = await authClient.signIn.email({ email, password });
      if (error?.code === "EMAIL_NOT_VERIFIED") return "confirm";
      if (error) throw new Error(authErrorMessage(error));
      return "in";
    },
    onSuccess: (result) => {
      if (result === "in") return enter();
      setNotice(
        mode === "sign-up"
          ? `We sent a 6-digit code to ${email}.`
          : `Your email isn't confirmed yet. We just sent a new code to ${email}.`,
      );
      setMode("confirm");
    },
    onError: (error) => toast.error(error.message),
  });

  const google = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
        errorCallbackURL: "/login",
      });
      if (result.error) throw new Error(result.error.message ?? "Could not reach Google");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit.mutate();
  };

  if (mode === "confirm") {
    return (
      <AuthCard>
        <ConfirmEmail
          email={email}
          notice={notice}
          onConfirmed={enter}
          onBack={() => setMode("sign-in")}
        />
      </AuthCard>
    );
  }

  if (session) return <Navigate to={next} replace />;

  const isSignUp = mode === "sign-up";

  return (
    <AuthCard>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <h2 className="text-xl text-center">{isSignUp ? "Create your account" : "Welcome back"}</h2>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => google.mutate()}
          disabled={google.isPending}
        >
          <GoogleIcon />
          {google.isPending ? "Opening Google..." : "Continue with Google"}
        </button>
        <div className="divider text-base-content/50 text-sm">or use your email</div>
        {isSignUp && (
          <label className="form-control" htmlFor="name">
            <span className="label text-base-content/70">Name</span>
            <input
              id="name"
              className="input input-bordered rounded-xl bg-base-100 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        )}

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

        <label className="form-control" htmlFor="password">
          <span className="label text-base-content/70">Password</span>
          <input
            id="password"
            type="password"
            className="input input-bordered rounded-xl bg-base-100 w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            // Only new passwords must be long. Older accounts may still have a shorter one.
            minLength={isSignUp ? MIN_PASSWORD_LENGTH : undefined}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            aria-describedby={isSignUp ? "password-hint" : undefined}
            required
          />
        </label>
        {isSignUp && (
          <p id="password-hint" className="-mt-2 text-sm text-base-content/60">
            At least {MIN_PASSWORD_LENGTH} characters. A short sentence is easy to remember.
          </p>
        )}

        {!isSignUp && features?.emailCodes && (
          <Link
            to="/forgot-password"
            state={{ email }}
            className="-mt-2 self-end text-sm link link-hover text-base-content/70"
          >
            Forgot password?
          </Link>
        )}

        <button type="submit" className="btn btn-primary" disabled={submit.isPending}>
          {submit.isPending ? "Please wait..." : isSignUp ? "Sign up" : "Sign in"}
        </button>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMode(isSignUp ? "sign-in" : "sign-up")}
        >
          {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>

        <Link to="/privacy" className="text-center text-xs text-base-content/50 hover:underline">
          Privacy policy
        </Link>
      </form>
    </AuthCard>
  );
};

export default AuthPage;
