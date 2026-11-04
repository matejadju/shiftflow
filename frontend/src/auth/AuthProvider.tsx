import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ApiError, getCurrentUser, login } from "../api/auth";
import type { User } from "../api/auth";
import { AuthContext } from "./auth-context";
import type { AuthStatus } from "./auth-context";

const TOKEN_KEY = "shiftflow.token";

function getExpiration(token: string): number {
  const payload: unknown = JSON.parse(
    atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))
  );

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("exp" in payload) ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    throw new Error("Žeton nima veljavnega časa poteka.");
  }

  return payload.exp * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    token ? "loading" : "anonymous"
  );
  const [message, setMessage] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    let expirationTimer: ReturnType<typeof setTimeout> | undefined;

    function expireSession() {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setStatus("anonymous");
      setMessage("Prijava je potekla. Prijavite se ponovno.");
    }

    async function restoreSession() {
      // Ta razčlenitev je samo za časovnik vmesnika.
      // Veljavnost podpisa in pravice vedno preverja backend.
      let expiresAt: number;

      try {
        expiresAt = getExpiration(token!);
      } catch {
        if (!controller.signal.aborted) {
          expireSession();
        }
        return;
      }

      if (expiresAt <= Date.now()) {
        expireSession();
        return;
      }

      expirationTimer = setTimeout(
        expireSession,
        Math.min(expiresAt - Date.now(), 2_147_483_647)
      );

      try {
        const currentUser = await getCurrentUser(
          token!,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setUser(currentUser);
          setStatus("authenticated");
          setMessage("");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          expireSession();
          return;
        }

        setUser(null);
        setStatus("unavailable");
        setMessage(
          "Prijave ni mogoče preveriti. Preverite povezavo in poskusite ponovno."
        );
      }
    }

    void restoreSession();

    return () => {
      controller.abort();
      clearTimeout(expirationTimer);
    };
  }, [token, attempt]);

  async function signIn(email: string, password: string) {
    const result = await login(email, password);

    sessionStorage.setItem(TOKEN_KEY, result.token);
    setUser(null);
    setStatus("loading");
    setMessage("");
    setToken(result.token);
    setAttempt((value) => value + 1);
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setStatus("anonymous");
    setMessage("");
  }

  function retry() {
    setStatus("loading");
    setAttempt((value) => value + 1);
  }

  return (
    <AuthContext.Provider
      value={{ user, status, message, signIn, signOut, retry }}
    >
      {children}
    </AuthContext.Provider>
  );
}