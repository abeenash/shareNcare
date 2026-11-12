import { Navigate, Outlet, useLocation } from "react-router";
import { authClient } from "../auth-client";
import Loader from "./Loader";

const RequireAuth = () => {
  const { data: session, isPending } = authClient.useSession();
  const location = useLocation();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
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
