import type { ReactNode } from "react";

const AuthCard = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center p-4">
    <div className="card bg-base-200 w-full max-w-md">
      <div className="card-body gap-4">
        <h1 className="text-center font-serif text-4xl italic tracking-tight">
          ShareN<span className="text-primary">Care</span>
        </h1>
        {children}
      </div>
    </div>
  </div>
);

export default AuthCard;
