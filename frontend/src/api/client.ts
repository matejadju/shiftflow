// Osnovni URL backenda. V produkciji ga nastavi VITE_API_URL ob gradnji
// (npr. https://shiftflow-api.example.com). Lokalno ostane prazen, zato
// zahteve na /api gredo prek Vite proxyja (glej vite.config.ts).
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, init);
}
