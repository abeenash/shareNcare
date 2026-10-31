import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate } from "react-router";
import { authClient } from "../auth-client";

type Mode = "sign-in" | "sign-up";

const AuthPage = () => {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit.mutate();
  };

  if (session) return <Navigate to="/" replace />;

  const isSignUp = mode === "sign-up";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-mono tracking-wide">
      <div className="card bg-gray-950 w-full max-w-md">
        <form className="card-body gap-4" onSubmit={handleSubmit}>
          <h1 className="text-3xl font-bold text-primary text-center">ShareNCare</h1>
          <h2 className="text-xl text-center">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>

          {isSignUp && (
            <label className="form-control" htmlFor="name">
              <span className="label text-white font-light">Name</span>
              <input
                id="name"
                className="input input-bordered rounded-xl bg-gray-900 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}

          <label className="form-control" htmlFor="email">
            <span className="label text-white font-light">Email</span>
            <input
              id="email"
              type="email"
              className="input input-bordered rounded-xl bg-gray-900 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="form-control" htmlFor="password">
            <span className="label text-white font-light">Password</span>
            <input
              id="password"
              type="password"
              className="input input-bordered rounded-xl bg-gray-900 w-full"
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
