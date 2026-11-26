import { Navigate, Outlet, useLocation } from "react-router";
import { authClient } from "../auth-client";
import Loader from "./Loader";
import WakingUp from "./WakingUp";

const RequireAuth = () => {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <Loader />
        <WakingUp />
      </div>
    );
  }

  if (!session) {
    const next = location.pathname === "/" ? "" : `?next=${encodeURIComponent(location.pathname)}`;
    return <Navigate to={`/login${next}`} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
