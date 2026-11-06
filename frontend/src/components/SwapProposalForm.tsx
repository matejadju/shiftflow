import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api/auth";
import {
  createSwapRequest,
  getSwapRecipients
} from "../api/swap-requests";
import type {
  CreatedSwapRequest,
  SwapParticipant
} from "../api/swap-requests";
import type { MyShift } from "../api/my-shifts";
import { displayDate } from "../lib/week";

type Props = {
  token: string;
  shift: MyShift;
  onUnauthorized: () => void;
  onCreated: (request: CreatedSwapRequest) => void;
  onCancel: () => void;
};

export function SwapProposalForm({
  token,
  shift,
  onUnauthorized,
  onCreated,
  onCancel
}: Props) {
  const [recipients, setRecipients] = useState<SwapParticipant[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const result = await getSwapRecipients(
          token,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setRecipients(result);
          setLoadError("");
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
            : "Seznama sodelavcev ni bilo mogoče naložiti."
        );
        setLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [token, onUnauthorized, attempt]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting || conflict) {
      return;
    }

    if (!recipients.some((person) => person.id === recipientId)) {
      setError("Izberite sodelavca.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const result = await createSwapRequest(
        token,
        shift.id,
        recipientId
      );

      onCreated(result);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
      }

      setError(
        error instanceof ApiError
          ? error.message
          : "Zahteve ni bilo mogoče poslati. Preverite povezavo."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="shift-form" aria-labelledby="swap-form-title">
      <h2 id="swap-form-title">Predlog menjave</h2>

      <p>
        {displayDate(shift.date)}, {shift.startTime}–{shift.endTime}
      </p>

      {loading ? (
        <p role="status">Nalaganje sodelavcev …</p>
      ) : loadError ? (
        <div>
          <p className="error-message" role="alert">
            {loadError}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              setAttempt((value) => value + 1);
            }}
          >
            Poskusi ponovno
          </button>
        </div>
      ) : recipients.length === 0 ? (
        <p>Za predlog menjave ni drugih zaposlenih.</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <fieldset disabled={submitting || conflict}>
            <label>
              Predvideni prevzemnik
              <select
                required
                value={recipientId}
                onChange={(event) =>
                  setRecipientId(event.target.value)
                }
              >
                <option value="">Izberite sodelavca</option>
                {recipients.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.firstName} {person.lastName}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit">
              {submitting ? "Pošiljanje …" : "Pošlji zahtevo"}
            </button>
          </fieldset>
        </form>
      )}

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {conflict && (
        <p>
          Zaprite obrazec in osvežite koledar za trenutni status zahteve.
        </p>
      )}

      <div className="actions">
        <button
          className="secondary"
          disabled={submitting}
          onClick={onCancel}
        >
          Zapri
        </button>
      </div>
    </section>
  );
}