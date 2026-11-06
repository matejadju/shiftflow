import { readResponse } from "./auth";

export type SwapStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "APPROVED";

export type SwapParticipant = {
  id: string;
  firstName: string;
  lastName: string;
};

export type SwapRequest = {
  id: string;
  status: SwapStatus;
  createdAt: string;
  requester: SwapParticipant;
  recipient: SwapParticipant;
  shift: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
  };
};

export type CreatedSwapRequest = {
  id: string;
  shiftId: string;
  requesterId: string;
  recipientId: string;
  status: SwapStatus;
  createdAt: string;
};

export const swapStatusLabels: Record<SwapStatus, string> = {
  PENDING: "V čakanju",
  ACCEPTED: "Sprejeta – čaka na vodjo",
  REJECTED: "Zavrnjena",
  APPROVED: "Potrjena"
};

export async function getSwapRecipients(
  token: string,
  signal?: AbortSignal
): Promise<SwapParticipant[]> {
  const response = await fetch("/api/swap-requests/recipients", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{
    employees: SwapParticipant[];
  }>(response);

  return result.employees;
}

export async function getSwapRequests(
  token: string,
  signal?: AbortSignal
): Promise<SwapRequest[]> {
  const response = await fetch("/api/swap-requests", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{
    swapRequests: SwapRequest[];
  }>(response);

  return result.swapRequests;
}

export async function createSwapRequest(
  token: string,
  shiftId: string,
  recipientId: string
): Promise<CreatedSwapRequest> {
  const response = await fetch("/api/swap-requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      shiftId,
      recipientId
    })
  });

  const result = await readResponse<{
    swapRequest: CreatedSwapRequest;
  }>(response);

  return result.swapRequest;
}