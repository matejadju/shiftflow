import { Navigate, Outlet } from "react-router-dom";
import type { Role } from "../api/auth";
import { useAuth } from "./useAuth";

type ProtectedRouteProps = {
  allowedRoles?: Role[];
};

export function ProtectedRoute({
  allowedRoles
}: ProtectedRouteProps) {
  const { user, status, message, retry, signOut } = useAuth();

  if (status === "loading") {
    return <p role="status">Preverjanje prijave …</p>;
  }

  if (status === "unavailable") {
    return (
      <main className="page">
        <section className="welcome">
          <p role="alert">{message}</p>
          <button onClick={retry}>Poskusi ponovno</button>
          <button onClick={signOut}>Nazaj na prijavo</button>
        </section>
      </main>
    );
  }

  if (status !== "authenticated" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}