import { MenuIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { authClient } from "../auth-client";
import { useMarkTourSeen } from "../me-queries";
import Logo from "./Logo";
import Sidebar from "./Sidebar";
import UserAvatar from "./UserAvatar";
import WelcomeTour from "./WelcomeTour";

type Tour = "auto" | "open" | "closed";

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tour, setTour] = useState<Tour>("auto");
  const { data: session } = authClient.useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const markTourSeen = useMarkTourSeen();

  const firstVisit = tour === "auto" && session != null && !session.user.tourSeenAt;
  const showTour = pathname === "/" && (tour === "open" || firstVisit);

  const closeTour = () => {
    setTour("closed");
    markTourSeen.mutate();
  };

  const replayTour = () => {
    setSidebarOpen(false);
    setTour("open");
    navigate("/");
  };

  return (
    <div className="drawer lg:drawer-open">
      <input
        id="app-sidebar"
        type="checkbox"
        className="drawer-toggle"
        checked={sidebarOpen}
        onChange={(e) => setSidebarOpen(e.target.checked)}
      />

      <div className="drawer-content flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-base-content/10 px-4 py-3 md:px-10">
          <label
            htmlFor="app-sidebar"
            className="btn btn-ghost btn-square btn-sm lg:hidden"
            aria-label="Open sidebar"
            data-tour="menu"
          >
            <MenuIcon className="size-5" />
          </label>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/create" className="btn btn-primary btn-sm" data-tour="new-note">
              <PlusIcon className="size-4" />
              New note
            </Link>
            {session && <UserAvatar name={session.user.name} image={session.user.image} />}
          </div>
        </header>

        <main className="flex-1 px-4 py-8 md:px-10">
          <Outlet />
        </main>
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="app-sidebar" className="drawer-overlay" aria-label="Close sidebar" />
        <Sidebar onNavigate={() => setSidebarOpen(false)} onReplayTour={replayTour} />
      </div>

      {showTour && session && (
        <WelcomeTour firstName={session.user.name.split(" ")[0] ?? ""} onClose={closeTour} />
      )}
    </div>
  );
};

export default AppLayout;
