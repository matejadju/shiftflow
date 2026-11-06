import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api/auth";
import {
  createShift,
  getEmployees,
  getWeeklyShifts,
  publishWeek
} from "../api/shifts";
import type { Employee, Shift } from "../api/shifts";
import { useAuth } from "../auth/useAuth";
import {
  addDays,
  displayDate,
  formatLocalDate,
  getMonday
} from "../lib/week";

export function ManagerPage() {
  const { token, signOut, expireSession } = useAuth();

  const [weekStart, setWeekStart] = useState(() =>
    getMonday(formatLocalDate(new Date()))
  );
  const [revision, setRevision] = useState(0);

  return (
    <main className="schedule-page">
      <header className="schedule-header">
        <div>
          <p className="eyebrow">VODJA IZMEN</p>
          <h1>Tedenski urnik</h1>
        </div>

        <nav className="actions" aria-label="Navigacija vodje">
          <Link className="button-link" to="/">
            Začetna stran
          </Link>
          <Link className="button-link" to="/manager/swaps">
            Potrditev menjav
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
          <WeekEditor
            key={`${weekStart}-${revision}`}
            token={token}
            weekStart={weekStart}
            onUnauthorized={expireSession}
            onReload={() => setRevision((value) => value + 1)}
          />
        )}
      </section>
    </main>
  );
}

type WeekEditorProps = {
  token: string;
  weekStart: string;
  onUnauthorized: () => void;
  onReload: () => void;
};

function WeekEditor({
  token,
  weekStart,
  onUnauthorized,
  onReload
}: WeekEditorProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(weekStart);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const [employeeList, weeklyShifts] = await Promise.all([
          getEmployees(token, controller.signal),
          getWeeklyShifts(token, weekStart, controller.signal)
        ]);

        if (!controller.signal.aborted) {
          setEmployees(employeeList);
          setShifts(weeklyShifts);
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
            : "Urnika ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, weekStart, onUnauthorized]);

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
      setError("Konec izmene mora biti po začetku.");
      return;
    }

    if (date < weekStart || date > addDays(weekStart, 6)) {
      setError("Datum mora biti znotraj izbranega tedna.");
      return;
    }

    setBusy(true);

    try {
      const shift = await createShift(token, {
        employeeId,
        date,
        startTime,
        endTime
      });

      setShifts((current) =>
        [...current, shift].sort(
          (a, b) =>
            a.date.localeCompare(b.date) ||
            a.startTime.localeCompare(b.startTime) ||
            a.id.localeCompare(b.id)
        )
      );

      setNotice("Izmena je shranjena kot osnutek.");
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const count = await publishWeek(token, weekStart);

      // Po objavi pridobimo dejansko stanje, tudi če je medtem
      // drug vodja dodal ali objavil izmeno.
      try {
        const updated = await getWeeklyShifts(token, weekStart);
        setShifts(updated);
        setNotice(`Objava zaključena. Novo objavljenih izmen: ${count}.`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          onUnauthorized();
          return;
        }

        setLoadError(
          "Objava je uspela, vendar urnika ni mogoče osvežiti. Ponovno ga naložite."
        );
      }
    } catch (error) {
      handleError(error);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p role="status">Nalaganje urnika …</p>;
  }

  if (loadError) {
    return (
      <div>
        <p className="error-message" role="alert">
          {loadError}
        </p>
        <button onClick={onReload}>Ponovno naloži</button>
      </div>
    );
  }

  const draftCount = shifts.filter(
    (shift) => shift.status === "DRAFT"
  ).length;

  return (
    <>
      <form className="shift-form" onSubmit={handleCreate}>
        <h3>Nova izmena</h3>

        <fieldset disabled={busy}>
          <label>
            Zaposleni
            <select
              required
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="">Izberite zaposlenega</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
          </label>

          <label>
            Datum
            <input
              type="date"
              required
              min={weekStart}
              max={addDays(weekStart, 6)}
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

          <button type="submit" disabled={employees.length === 0}>
            Shrani osnutek
          </button>
        </fieldset>

        {employees.length === 0 && (
          <p>Za ustvarjanje izmene potrebujete zaposlenega.</p>
        )}
      </form>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}

      <div className="publish-bar">
        <h3>Izmene ({shifts.length})</h3>
        <button
          disabled={busy || draftCount === 0}
          onClick={handlePublish}
        >
          {busy ? "Obdelovanje …" : `Objavi urnik (${draftCount})`}
        </button>
      </div>

      {shifts.length === 0 ? (
        <p>Za izbrani teden še ni izmen.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Izmene izbranega tedna
            </caption>
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Čas</th>
                <th scope="col">Zaposleni</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift) => (
                <tr key={shift.id}>
                  <td>{displayDate(shift.date)}</td>
                  <td>
                    {shift.startTime}–{shift.endTime}
                  </td>
                  <td>
                    {shift.employee.firstName} {shift.employee.lastName}
                  </td>
                  <td>
                    <span className={`badge badge--${shift.status}`}>
                      {shift.status === "DRAFT"
                        ? "Osnutek"
                        : "Objavljena"}
                    </span>
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