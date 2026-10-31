import { useQueryClient } from "@tanstack/react-query";
import { LogOutIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { authClient } from "../auth-client";
import ConnectGoogle from "./ConnectGoogle";

const Navbar = () => {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await authClient.signOut();
    queryClient.clear();
    navigate("/login");
  };
  return (
    <div className="bg-gray-950 border-b border-base-content/10">
      <div className="mx-auto max-w-6xl p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary font-mono tracking-wider">ShareNCare</h1>
          <div className="flex items-center gap-4">
            {session && (
              <span className="hidden md:inline text-sm text-base-content/60 font-mono">
                Hi, {session.user.name}
              </span>
            )}
            <Link to="/trash" className="btn btn-ghost">
              <Trash2Icon className="size-5" />
              <span className="tracking-wider font-mono">Trash</span>
            </Link>
            <Link to={"/create"} className="btn btn-primary">
              <PlusIcon className="size-5" />
              <span className="tracking-wider font-mono">New Note</span>
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleSignOut}
              aria-label="Sign out"
            >
              <LogOutIcon className="size-5" />
            </button>
            <ConnectGoogle />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
