import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { ApiError } from "../api/auth";
import { useAuth } from "../auth/useAuth";

export function LoginPage() {
  const { status, message, signIn, retry, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  if (status === "loading") {
    return (
      <main className="page">
        <p role="status">Preverjanje prijave …</p>
      </main>
    );
  }

  if (status === "unavailable") {
    return (
      <main className="page">
        <section className="welcome">
          <h1>ShiftFlow</h1>
          <p role="alert">{message}</p>
          <div className="actions">
            <button onClick={retry}>Poskusi ponovno</button>
            <button className="secondary" onClick={signOut}>
              Nazaj na prijavo
            </button>
          </div>
        </section>
      </main>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
      setPassword("");
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "Povezava s strežnikom ni uspela. Poskusite ponovno."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="welcome">
        <p className="eyebrow">ORGANIZACIJA DELOVNIH IZMEN</p>
        <h1>ShiftFlow</h1>
        <p className="description">
          Prijavite se za dostop do svojih delovnih izmen.
        </p>

        {message && <p role="status">{message}</p>}

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">E-poštni naslov</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={submitting}
          />

          <label htmlFor="password">Geslo</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={submitting}
          />

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? "Prijavljanje …" : "Prijava"}
          </button>
        </form>
      </section>
    </main>
  );
}