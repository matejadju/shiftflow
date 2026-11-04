export type Role = "EMPLOYEE" | "MANAGER" | "ADMIN";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function readResponse<T>(
  response: Response
): Promise<T> {  if (!response.ok) {
    let message = "Zahteve ni bilo mogoče izvesti.";

    try {
      const body: unknown = await response.json();

      if (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch {
      // Odgovor ob napaki morda ne vsebuje JSON.
    }

    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });

  return readResponse<LoginResponse>(response);
}

export async function getCurrentUser(
  token: string,
  signal?: AbortSignal
): Promise<User> {
  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{ user: User }>(response);

  return result.user;
}