import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export function ManagerPage() {
  const { signOut } = useAuth();

  return (
    <main className="page">
      <section className="welcome">
        <p className="eyebrow">VODJA IZMEN</p>
        <h1>Pregled za vodjo</h1>

        <p className="description">
          Tukaj bosta v naslednjih nalogah na voljo priprava urnikov
          in odločanje o menjavah.
        </p>

        <nav className="actions" aria-label="Navigacija vodje">
          <Link className="button-link" to="/">
            Začetna stran
          </Link>
          <button className="secondary" onClick={signOut}>
            Odjava
          </button>
        </nav>
      </section>
    </main>
  );
}