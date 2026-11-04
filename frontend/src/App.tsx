import { useEffect, useState } from "react";
import "./App.css";

type ApiStatus = "loading" | "available" | "unavailable";

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function checkApi() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error("Preverjanje API ni uspelo.");
        }

        const data: unknown = await response.json();

        const isHealthy =
          typeof data === "object" &&
          data !== null &&
          "status" in data &&
          data.status === "ok";

        setApiStatus(isHealthy ? "available" : "unavailable");
      } catch {
        if (!controller.signal.aborted) {
          setApiStatus("unavailable");
        }
      }
    }

    void checkApi();

    return () => controller.abort();
  }, []);

  const statusMessages: Record<ApiStatus, string> = {
    loading: "Preverjanje povezave …",
    available: "Povezava z API je vzpostavljena.",
    unavailable: "API trenutno ni dosegljiv."
  };

  return (
    <main className="page">
      <section className="welcome">
        <p className="eyebrow">ORGANIZACIJA DELOVNIH IZMEN</p>
        <h1>ShiftFlow</h1>
        <p className="description">
          Urniki, razpoložljivost in menjave izmen na enem mestu.
        </p>

        <div className="status" role="status">
          <span
            className={`status-dot status-dot--${apiStatus}`}
            aria-hidden="true"
          />
          {statusMessages[apiStatus]}
        </div>

        <p className="note">
          Aplikacija je v razvoju. Prijava in upravljanje izmen sledita
          v naslednjih korakih.
        </p>
      </section>
    </main>
  );
}

export default App;