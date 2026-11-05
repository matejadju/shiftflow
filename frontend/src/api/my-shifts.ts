import { readResponse } from "./auth";

export type MyShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

export async function getMyShifts(
  token: string,
  weekStart: string,
  signal?: AbortSignal
): Promise<MyShift[]> {
  const query = new URLSearchParams({ weekStart });

  const response = await fetch(`/api/me/shifts?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{
    weekStart: string;
    shifts: MyShift[];
  }>(response);

  return result.shifts;
}