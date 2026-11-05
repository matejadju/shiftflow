import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/auth";
import {
  createUnavailability,
  deleteUnavailability,
  getUnavailabilities
} from "../api/unavailability";
import type { Unavailability } from "../api/unavailability";
import { useAuth } from "../auth/useAuth";
import { displayDate, formatLocalDate } from "../lib/week";

export function UnavailabilityPage() {
  const { token, signOut, expireSession } = useAuth();
  const [revision, setRevision] = useState(0);

  return (
    <main className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">ZAPOSLENI</p>
          <h1>Moja nerazpoložljivost</h1>
        </div>

        <nav className="actions" aria-label="Navigacija zaposlenega">
          <Link className="button-link" to="/">
            Začetna stran
          </Link>
          <Link className="button-link" to="/my-schedule">
            Moje izmene
          </Link>
          <button className="secondary" onClick={signOut}>
            Odjava
          </button>
        </nav>
      </header>

      <section className="schedule-panel">
        <p>
          Označite obdobja, ko niste na voljo za delo.
        </p>

        {token && (
          <UnavailabilityEditor
            key={revision}
            token={token}
            onUnauthorized={expireSession}
            onRetry={() => setRevision((value) => value + 1)}
          />
        )}
      </section>
    </main>
  );
}

type EditorProps = {
  token: string;
  onUnauthorized: () => void;
  onRetry: () => void;
};

function sortEntries(entries: Unavailability[]): Unavailability[] {
  return [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id)
  );
}

function UnavailabilityEditor({
  token,
  onUnauthorized,
  onRetry
}: EditorProps) {
  const [entries, setEntries] = useState<Unavailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [date, setDate] = useState(() => formatLocalDate(new Date()));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await getUnavailabilities(
          token,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setEntries(sortEntries(result));
          setLoading(false);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          onUnauthorized();
          return;
        }

        setLoadError(
          error instanceof ApiError
            ? error.message
            : "Nerazpoložljivosti ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, onUnauthorized]);

  function handleError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      onUnauthorized();
      return;
    }

    setError(
      error instanceof ApiError
        ? error.message
        : "Povezava s strežnikom ni uspela."
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (endTime <= startTime) {
      setError("Konec nerazpoložljivosti mora biti po začetku.");
      return;
    }

    setBusy(true);

    try {
      const entry = await createUnavailability(token, {
        date,
        startTime,
        endTime
      });

      setEntries((current) => sortEntries([...current, entry]));
      setNotice("Nerazpoložljivost je shranjena.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(entry: Unavailability) {
    const confirmed = window.confirm(
      `Odstranim nerazpoložljivost ${displayDate(entry.date)}, ` +
        `${entry.startTime}–${entry.endTime}?`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setBusy(true);

    try {
      await deleteUnavailability(token, entry.id);

      setEntries((current) =>
        current.filter((item) => item.id !== entry.id)
      );
      setNotice("Vnos nerazpoložljivosti je odstranjen.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setEntries((current) =>
          current.filter((item) => item.id !== entry.id)
        );
        setNotice("Vnos je bil že odstranjen.");
      } else {
        handleError(error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p role="status">Nalaganje nerazpoložljivosti …</p>;
  }

  if (loadError) {
    return (
      <div>
        <p className="error-message" role="alert">
          {loadError}
        </p>
        <button onClick={onRetry}>Poskusi ponovno</button>
      </div>
    );
  }

  return (
    <>
      <form className="shift-form" onSubmit={handleCreate}>
        <h2>Nov vnos</h2>

        <fieldset disabled={busy}>
          <label>
            Datum
            <input
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>

          <label>
            Začetek
            <input
              type="time"
              required
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </label>

          <label>
            Konec
            <input
              type="time"
              required
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </label>

          <button type="submit">
            {busy ? "Obdelovanje …" : "Shrani"}
          </button>
        </fieldset>
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}

      <h2>Moji vnosi ({entries.length})</h2>

      {entries.length === 0 ? (
        <p>Nimate vnesene nerazpoložljivosti.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Lastna obdobja nerazpoložljivosti
            </caption>
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Čas</th>
                <th scope="col">Dejanje</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{displayDate(entry.date)}</td>
                  <td>
                    {entry.startTime}–{entry.endTime}
                  </td>
                  <td>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() => void handleDelete(entry)}
                      aria-label={
                        `Odstrani vnos ${displayDate(entry.date)}, ` +
                        `${entry.startTime}–${entry.endTime}`
                      }
                    >
                      Odstrani
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}