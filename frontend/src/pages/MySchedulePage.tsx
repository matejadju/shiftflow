import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/auth";
import { getMyShifts } from "../api/my-shifts";
import type { MyShift } from "../api/my-shifts";
import {
  getSwapRequests,
  swapStatusLabels
} from "../api/swap-requests";
import type {
  CreatedSwapRequest,
  SwapStatus
} from "../api/swap-requests";
import { useAuth } from "../auth/useAuth";
import { SwapProposalForm } from "../components/SwapProposalForm";
import {
  addDays,
  displayDate,
  formatLocalDate,
  getMonday
} from "../lib/week";

const dayNames = [
  "Ponedeljek",
  "Torek",
  "Sreda",
  "Četrtek",
  "Petek",
  "Sobota",
  "Nedelja"
];

type OpenSwap = {
  shiftId: string;
  status: SwapStatus;
};

export function MySchedulePage() {
  const { token, user, signOut, expireSession } = useAuth();

  const [weekStart, setWeekStart] = useState(() =>
    getMonday(formatLocalDate(new Date()))
  );
  const [revision, setRevision] = useState(0);

  return (
    <main className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">ZAPOSLENI</p>
          <h1>Moje izmene</h1>
        </div>

        <nav className="actions" aria-label="Navigacija zaposlenega">
          <Link className="button-link" to="/">
            Začetna stran
          </Link>
          <Link className="button-link" to="/unavailability">
            Moja nerazpoložljivost
          </Link>
          <button className="secondary" onClick={signOut}>
            Odjava
          </button>
        </nav>
      </header>

      <section className="schedule-panel">
        <div className="week-controls">
          <button
            className="secondary"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            Prejšnji teden
          </button>

          <label>
            Izberi teden
            <input
              type="date"
              value={weekStart}
              onChange={(event) => {
                if (event.target.value) {
                  setWeekStart(getMonday(event.target.value));
                }
              }}
            />
          </label>

          <button
            className="secondary"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Naslednji teden
          </button>
        </div>

        <h2>
          {displayDate(weekStart)} – {displayDate(addDays(weekStart, 6))}
        </h2>

        {token && user && (
          <WeekCalendar
            key={`${weekStart}-${revision}`}
            token={token}
            userId={user.id}
            weekStart={weekStart}
            onUnauthorized={expireSession}
            onRetry={() => setRevision((value) => value + 1)}
          />
        )}
      </section>
    </main>
  );
}

type WeekCalendarProps = {
  token: string;
  userId: string;
  weekStart: string;
  onUnauthorized: () => void;
  onRetry: () => void;
};

function WeekCalendar({
  token,
  userId,
  weekStart,
  onUnauthorized,
  onRetry
}: WeekCalendarProps) {
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [openSwaps, setOpenSwaps] = useState<OpenSwap[]>([]);
  const [selectedShift, setSelectedShift] = useState<MyShift | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [weeklyShifts, requests] = await Promise.all([
          getMyShifts(token, weekStart, controller.signal),
          getSwapRequests(token, controller.signal)
        ]);

        if (!controller.signal.aborted) {
          setShifts(weeklyShifts);

          setOpenSwaps(
            requests
              .filter(
                (entry) =>
                  entry.requester.id === userId &&
                  (entry.status === "PENDING" ||
                    entry.status === "ACCEPTED")
              )
              .map((entry) => ({
                shiftId: entry.shift.id,
                status: entry.status
              }))
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

        setError(
          error instanceof ApiError
            ? error.message
            : "Koledarja in zahtev ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, userId, weekStart, onUnauthorized]);

  function handleCreated(entry: CreatedSwapRequest) {
    setOpenSwaps((current) => [
      ...current.filter((item) => item.shiftId !== entry.shiftId),
      {
        shiftId: entry.shiftId,
        status: entry.status
      }
    ]);

    setSelectedShift(null);
    setNotice(
      "Zahteva je poslana in je v čakanju. Urnik ostaja nespremenjen."
    );
  }

  if (loading) {
    return <p role="status">Nalaganje koledarja …</p>;
  }

  if (error) {
    return (
      <div>
        <p className="error-message" role="alert">
          {error}
        </p>
        <button onClick={onRetry}>Poskusi ponovno</button>
      </div>
    );
  }

  const today = formatLocalDate(new Date());

  return (
    <>
      <div className="actions">
        <button className="secondary" onClick={onRetry}>
          Osveži koledar
        </button>
      </div>

      {notice && <p role="status">{notice}</p>}

      {selectedShift && (
        <SwapProposalForm
          key={selectedShift.id}
          token={token}
          shift={selectedShift}
          onUnauthorized={onUnauthorized}
          onCreated={handleCreated}
          onCancel={() => setSelectedShift(null)}
        />
      )}

      {shifts.length === 0 && (
        <p role="status">
          Za izbrani teden nimate objavljenih izmen.
        </p>
      )}

      <div className="calendar-grid">
        {dayNames.map((dayName, index) => {
          const date = addDays(weekStart, index);
          const dailyShifts = shifts
            .filter((shift) => shift.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));

          return (
            <section
              key={date}
              className={`calendar-day ${
                date === today ? "calendar-day--today" : ""
              }`}
              aria-label={`${dayName}, ${displayDate(date)}`}
            >
              <h3>{dayName}</h3>
              <p className="calendar-date">
                {displayDate(date)}
                {date === today && " · Danes"}
              </p>

              {dailyShifts.length === 0 ? (
                <p className="calendar-empty">Brez izmen</p>
              ) : (
                <ul className="calendar-shifts">
                  {dailyShifts.map((shift) => {
                    const openSwap = openSwaps.find(
                      (entry) => entry.shiftId === shift.id
                    );

                    return (
                      <li key={shift.id}>
                        <span>Delovna izmena</span>
                        <strong>
                          <time dateTime={`${date}T${shift.startTime}`}>
                            {shift.startTime}
                          </time>
                          {" – "}
                          <time dateTime={`${date}T${shift.endTime}`}>
                            {shift.endTime}
                          </time>
                        </strong>

                        {openSwap ? (
                          <p className="swap-status">
                            Menjava: {swapStatusLabels[openSwap.status]}
                          </p>
                        ) : (
                          <button
                            className="secondary swap-proposal-button"
                            disabled={selectedShift !== null}
                            onClick={() => {
                              setNotice("");
                              setSelectedShift(shift);
                            }}
                            aria-label={
                              `Predlagaj menjavo ${displayDate(date)}, ` +
                              `${shift.startTime}–${shift.endTime}`
                            }
                          >
                            Predlagaj menjavo
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}