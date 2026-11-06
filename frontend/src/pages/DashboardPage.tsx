import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function DashboardPage() {
  const { user, signOut } = useAuth();

  if (!user) {
    return null;
  }

  const roleNames = {
    EMPLOYEE: "Zaposleni",
    MANAGER: "Vodja izmen",
    ADMIN: "Administrator"
  };

  return (
    <main className="page">
      <section className="welcome">
        <p className="eyebrow">{roleNames[user.role]}</p>
        <h1>ShiftFlow</h1>
        <p className="description">
          Pozdravljeni, {user.firstName} {user.lastName}.
        </p>

        <p>
          Uspešno ste prijavljeni. Funkcionalnosti urnikov in menjav
          bomo dodali v naslednjih korakih.
        </p>

        <nav className="actions" aria-label="Uporabniški meni">
          {user.role === "MANAGER" && (
            <Link className="button-link" to="/manager">
              Pregled za vodjo
            </Link>
          )}
          {user.role === "MANAGER" && (
            <Link className="button-link" to="/manager/swaps">
                Potrditev menjav
            </Link>
          )}
          {user.role === "EMPLOYEE" && (
            <Link className="button-link" to="/my-schedule">
                Moje izmene
            </Link>
           )}
           {user.role === "EMPLOYEE" && (
            <Link className="button-link" to="/unavailability">
                Moja nerazpoložljivost
            </Link>
            )}
            {user.role === "EMPLOYEE" && (
            <Link className="button-link" to="/received-requests">
                Prejete zahteve
            </Link>
            )}

          <button className="secondary" onClick={signOut}>
            Odjava
          </button>
        </nav>
      </section>
    </main>
  );
}