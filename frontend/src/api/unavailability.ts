import { readResponse } from "./auth";

export type Unavailability = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type CreateUnavailabilityInput = {
  date: string;
  startTime: string;
  endTime: string;
};

export async function getUnavailabilities(
  token: string,
  signal?: AbortSignal
): Promise<Unavailability[]> {
  const response = await fetch("/api/me/unavailability", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{
    unavailabilities: Unavailability[];
  }>(response);

  return result.unavailabilities;
}

export async function createUnavailability(
  token: string,
  input: CreateUnavailabilityInput
): Promise<Unavailability> {
  const response = await fetch("/api/me/unavailability", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const result = await readResponse<{
    unavailability: Unavailability;
  }>(response);

  return result.unavailability;
}

export async function deleteUnavailability(
  token: string,
  id: string
): Promise<void> {
  const response = await fetch(
    `/api/me/unavailability/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  // Uspešno brisanje vrne 204 brez telesa odgovora.
  if (!response.ok) {
    await readResponse<unknown>(response);
  }
}