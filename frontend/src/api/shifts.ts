import { readResponse } from "./auth";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export type Shift = {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "DRAFT" | "PUBLISHED";
  employee: Employee;
};

export type CreateShiftInput = {
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export async function getEmployees(
  token: string,
  signal?: AbortSignal
): Promise<Employee[]> {
  const response = await fetch("/api/shifts/employees", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{ employees: Employee[] }>(
    response
  );

  return result.employees;
}

export async function getWeeklyShifts(
  token: string,
  weekStart: string,
  signal?: AbortSignal
): Promise<Shift[]> {
  const query = new URLSearchParams({ weekStart });

  const response = await fetch(`/api/shifts?${query}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{
    weekStart: string;
    shifts: Shift[];
  }>(response);

  return result.shifts;
}

export async function createShift(
  token: string,
  input: CreateShiftInput
): Promise<Shift> {
  const response = await fetch("/api/shifts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const result = await readResponse<{ shift: Shift }>(response);

  return result.shift;
}

export async function publishWeek(
  token: string,
  weekStart: string
): Promise<number> {
  const response = await fetch("/api/shifts/publish", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ weekStart })
  });

  const result = await readResponse<{
    weekStart: string;
    publishedCount: number;
  }>(response);

  return result.publishedCount;
}