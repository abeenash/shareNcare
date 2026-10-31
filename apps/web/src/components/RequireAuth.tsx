import { Navigate, Outlet } from "react-router";
import { authClient } from "../auth-client";
import Loader from "./Loader";

const RequireAuth = () => {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex itemc-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  return <Outlet />;
};

export default RequireAuth;
