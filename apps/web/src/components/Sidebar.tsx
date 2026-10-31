import { useQueryClient } from "@tanstack/react-query";
import { InboxIcon, LogOutIcon, Trash2Icon } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import { authClient } from "../auth-client";
import { useTrash } from "../note-queries";
import ConnectGoogle from "./ConnectGoogle";
import Logo from "./Logo";
import UserAvatar from "./UserAvatar";

type SidebarProps = {
  onNavigate: () => void;
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-field px-3 py-2 transition-colors ${
    isActive ? "bg-base-300 text-base-content" : "text-base-content/60 hover:text-base-content"
  }`;

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { data: session } = authClient.useSession();
  const { data: trashedNotes } = useTrash();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <aside className="flex min-h-full w-64 flex-col gap-8 border-r border-base-content/10 bg-base-200 p-5">
      <Logo />

      <nav className="flex flex-col gap-1 font-mono text-xs uppercase tracking-widest">
        <NavLink to="/" end className={navLinkClass} onClick={onNavigate}>
          <InboxIcon className="size-4" />
          Your desk
        </NavLink>
        <NavLink to="/trash" className={navLinkClass} onClick={onNavigate}>
          <Trash2Icon className="size-4" />
          Trash
          <span className="ml-auto">{trashedNotes?.length ?? 0}</span>
        </NavLink>
      </nav>

      {session && (
        <div className="mt-auto flex flex-col gap-3 border-t border-base-content/10 pt-5">
          <div className="flex items-center gap-3">
            <UserAvatar name={session.user.name} image={session.user.image} />
            <div className="min-w-0">
              <p className="truncate text-sm">{session.user.name}</p>
              <p className="truncate text-xs text-base-content/50">{session.user.email}</p>
            </div>
          </div>
          <ConnectGoogle />
          <button
            type="button"
            className="btn btn-ghost btn-sm justify-start w-full font-normal"
            onClick={handleSignOut}
          >
            <LogOutIcon className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
