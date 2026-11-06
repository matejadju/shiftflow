import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/auth";
import {
  getSwapRequests,
  respondToSwapRequest,
  swapStatusLabels
} from "../api/swap-requests";
import type {
  SwapDecision,
  SwapRequest
} from "../api/swap-requests";
import { useAuth } from "../auth/useAuth";
import { displayDate } from "../lib/week";

export function ReceivedRequestsPage() {
  const { token, user, signOut, expireSession } = useAuth();
  const [revision, setRevision] = useState(0);

  return (
    <main className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">ZAPOSLENI</p>
          <h1>Prejete zahteve</h1>
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
          Sprejmite ali zavrnite predloge za prevzem sodelavčeve izmene.
          Sprejeto zahtevo mora potrditi še vodja.
        </p>

        {token && user && (
          <ReceivedRequests
            key={revision}
            token={token}
            userId={user.id}
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
  userId: string;
  onUnauthorized: () => void;
  onReload: () => void;
};

function ReceivedRequests({
  token,
  userId,
  onUnauthorized,
  onReload
}: Props) {
  const [requests, setRequests] = useState<SwapRequest[]>([]);
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
        const result = await getSwapRequests(
          token,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setRequests(
            result.filter((entry) => entry.recipient.id === userId)
          );
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
            : "Prejetih zahtev ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, userId, onUnauthorized]);

  async function handleRespond(
    entry: SwapRequest,
    decision: SwapDecision
  ) {
    if (busyId || needsRefresh || entry.status !== "PENDING") {
      return;
    }

    setError("");
    setNotice("");
    setBusyId(entry.id);

    try {
      const result = await respondToSwapRequest(
        token,
        entry.id,
        decision
      );

      setRequests((current) =>
        current.map((item) =>
          item.id === result.id
            ? { ...item, status: result.status }
            : item
        )
      );

      setNotice(
        result.status === "ACCEPTED"
          ? "Zahteva je sprejeta in čaka na odločitev vodje. Urnik še ni spremenjen."
          : "Zahteva je zavrnjena. Urnik ostaja nespremenjen."
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setError(
        error instanceof ApiError
          ? error.message
          : "Odgovora ni mogoče potrditi. Osvežite seznam, da preverite stanje."
      );

      // Stanje se je lahko spremenilo v drugi kartici ali pa
      // je bil odgovor shranjen pred prekinitvijo povezave.
      setNeedsRefresh(true);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p role="status">Nalaganje prejetih zahtev …</p>;
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
        <p>Pred naslednjim odgovorom osvežite seznam.</p>
      )}

      {notice && <p role="status">{notice}</p>}

      <h2>Prejete zahteve ({requests.length})</h2>

      {requests.length === 0 ? (
        <p>Nimate prejetih zahtev za menjavo.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Prejeti predlogi za prevzem izmene
            </caption>
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Čas</th>
                <th scope="col">Predlagatelj</th>
                <th scope="col">Status</th>
                <th scope="col">Odgovor</th>
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
                  <td>{swapStatusLabels[entry.status]}</td>
                  <td>
                    {entry.status === "PENDING" ? (
                      <div className="request-actions">
                        <button
                          disabled={busyId !== null || needsRefresh}
                          onClick={() =>
                            void handleRespond(entry, "ACCEPT")
                          }
                        >
                          Sprejmi
                        </button>
                        <button
                          className="secondary"
                          disabled={busyId !== null || needsRefresh}
                          onClick={() =>
                            void handleRespond(entry, "REJECT")
                          }
                        >
                          Zavrni
                        </button>
                        {busyId === entry.id && (
                          <span role="status">Pošiljanje …</span>
                        )}
                      </div>
                    ) : (
                      "Odgovor ni več na voljo."
                    )}
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