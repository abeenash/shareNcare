import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router";
import { authClient } from "../auth-client";
import GoogleIcon from "../components/GoogleIcon";
import { useOAuthErrorToast } from "../lib/use-oauth-error-toast";

type Mode = "sign-in" | "sign-up";

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  useOAuthErrorToast();

  const submit = useMutation({
    mutationFn: async () => {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({ name, email, password })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        throw new Error(result.error.message ?? "Something went wrong");
      }
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/");
    },
    onError: (error) => toast.error(error.message),
  });

  const google = useMutation({
    mutationFn: async () => {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login",
      });
      if (result.error) throw new Error(result.error.message ?? "Could not reach Google");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit.mutate();
  };

  if (session) return <Navigate to="/" replace />;

  const isSignUp = mode === "sign-up";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card bg-base-200 w-full max-w-md">
        <form className="card-body gap-4" onSubmit={handleSubmit}>
          <h1 className="text-center font-serif text-4xl italic tracking-tight">
            ShareN<span className="text-primary">Care</span>
          </h1>
          <h2 className="text-xl text-center">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>
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
              minLength={8}
              required
            />
          </label>

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
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
