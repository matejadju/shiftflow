import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/auth";
import { getMyShifts } from "../api/my-shifts";
import type { MyShift } from "../api/my-shifts";
import { useAuth } from "../auth/useAuth";
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

export function MySchedulePage() {
  const { token, signOut, expireSession } = useAuth();
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

        {token && (
          <WeekCalendar
            key={`${weekStart}-${revision}`}
            token={token}
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
  weekStart: string;
  onUnauthorized: () => void;
  onRetry: () => void;
};

function WeekCalendar({
  token,
  weekStart,
  onUnauthorized,
  onRetry
}: WeekCalendarProps) {
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await getMyShifts(
          token,
          weekStart,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setShifts(result);
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
            : "Izmen ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, weekStart, onUnauthorized]);

  if (loading) {
    return <p role="status">Nalaganje izmen …</p>;
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
                  {dailyShifts.map((shift) => (
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
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}