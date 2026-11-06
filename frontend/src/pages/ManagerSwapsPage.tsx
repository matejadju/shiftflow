import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/auth";
import {
  decideManagerSwap,
  getManagerSwapRequests
} from "../api/manager-swaps";
import type {
  ManagerSwapDecision,
  ManagerSwapRequest
} from "../api/manager-swaps";
import { useAuth } from "../auth/useAuth";
import { displayDate } from "../lib/week";

export function ManagerSwapsPage() {
  const { token, signOut, expireSession } = useAuth();
  const [revision, setRevision] = useState(0);

  return (
    <main className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">VODJA IZMEN</p>
          <h1>Potrditev menjav</h1>
        </div>

        <nav className="actions" aria-label="Navigacija vodje">
          <Link className="button-link" to="/manager">
            Tedenski urnik
          </Link>
          <Link className="button-link" to="/">
            Začetna stran
          </Link>
          <button className="secondary" onClick={signOut}>
            Odjava
          </button>
        </nav>
      </header>

      <section className="schedule-panel">
        <p>
          Prikazane so zahteve, ki jih je prevzemnik že sprejel.
          Ob potrditvi se izmena dodeli prevzemniku.
        </p>

        {token && (
          <ManagerRequests
            key={revision}
            token={token}
            onUnauthorized={expireSession}
            onReload={() => setRevision((value) => value + 1)}
          />
        )}
      </section>
    </main>
  );
}

type Props = {
  token: string;
  onUnauthorized: () => void;
  onReload: () => void;
};

function ManagerRequests({
  token,
  onUnauthorized,
  onReload
}: Props) {
  const [requests, setRequests] = useState<ManagerSwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await getManagerSwapRequests(
          token,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setRequests(result);
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
            : "Zahtev za odločanje ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, onUnauthorized]);

  async function handleDecision(
    entry: ManagerSwapRequest,
    decision: ManagerSwapDecision
  ) {
    if (busyId || needsRefresh) {
      return;
    }

    setError("");
    setNotice("");
    setBusyId(entry.id);

    try {
      const result = await decideManagerSwap(
        token,
        entry.id,
        decision
      );

      setRequests((current) =>
        current.filter((item) => item.id !== result.id)
      );

      const shiftDescription =
        `${displayDate(entry.shift.date)}, ` +
        `${entry.shift.startTime}–${entry.shift.endTime}`;

      setNotice(
        result.status === "APPROVED"
          ? `Menjava (${shiftDescription}) je potrjena. ` +
              `Izmena je dodeljena zaposlenemu ` +
              `${entry.recipient.firstName} ${entry.recipient.lastName}.`
          : `Menjava (${shiftDescription}) je zavrnjena. ` +
              "Urnik ostaja nespremenjen."
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setError(
        error instanceof ApiError
          ? `${displayDate(entry.shift.date)}, ` +
              `${entry.shift.startTime}–${entry.shift.endTime}: ` +
              error.message
          : "Odločitve ni mogoče potrditi. Osvežite seznam in preverite stanje."
      );

      // Pri konfliktu lahko vodja zahtevo še vedno zavrne.
      // Pri drugih napakah pred novo odločitvijo preverimo stanje.
      if (!(error instanceof ApiError && error.status === 409)) {
        setNeedsRefresh(true);
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p role="status">Nalaganje zahtev …</p>;
  }

  if (loadError) {
    return (
      <div>
        <p className="error-message" role="alert">
          {loadError}
        </p>
        <button onClick={onReload}>Poskusi ponovno</button>
      </div>
    );
  }

  return (
    <>
      <div className="actions">
        <button
          className="secondary"
          disabled={busyId !== null}
          onClick={onReload}
        >
          Osveži seznam
        </button>
      </div>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {needsRefresh && (
        <p>Pred naslednjo odločitvijo osvežite seznam.</p>
      )}

      {notice && (
        <div role="status">
          <p>{notice}</p>
          <Link to="/manager">Odpri posodobljen tedenski urnik</Link>
        </div>
      )}

      <h2>Zahteve za odločanje ({requests.length})</h2>

      {requests.length === 0 ? (
        <p>Ni sprejetih zahtev, ki čakajo na odločitev.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Sprejete zahteve za odločitev vodje
            </caption>
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Čas</th>
                <th scope="col">Predlagatelj</th>
                <th scope="col">Prevzemnik</th>
                <th scope="col">Status</th>
                <th scope="col">Odločitev</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((entry) => (
                <tr key={entry.id}>
                  <td>{displayDate(entry.shift.date)}</td>
                  <td>
                    {entry.shift.startTime}–{entry.shift.endTime}
                  </td>
                  <td>
                    {entry.requester.firstName}{" "}
                    {entry.requester.lastName}
                  </td>
                  <td>
                    {entry.recipient.firstName}{" "}
                    {entry.recipient.lastName}
                  </td>
                  <td>Sprejeta – čaka na vodjo</td>
                  <td>
                    <div className="request-actions">
                      <button
                        disabled={busyId !== null || needsRefresh}
                        onClick={() =>
                          void handleDecision(entry, "APPROVE")
                        }
                      >
                        Potrdi
                      </button>
                      <button
                        className="secondary"
                        disabled={busyId !== null || needsRefresh}
                        onClick={() =>
                          void handleDecision(entry, "REJECT")
                        }
                      >
                        Zavrni
                      </button>
                      {busyId === entry.id && (
                        <span role="status">Shranjevanje …</span>
                      )}
                    </div>
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