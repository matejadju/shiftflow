import { createContext } from "react";
import type { User } from "../api/auth";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "anonymous"
  | "unavailable";

export type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  message: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  retry: () => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);