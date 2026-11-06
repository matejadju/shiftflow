import { readResponse } from "./auth";
import type { SwapParticipant } from "./swap-requests";

export type ManagerSwapRequest = {
  id: string;
  status: "ACCEPTED";
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

export type ManagerSwapDecision = "APPROVE" | "REJECT";

export type ManagerSwapResult = {
  id: string;
  status: "APPROVED" | "REJECTED";
};

export async function getManagerSwapRequests(
  token: string,
  signal?: AbortSignal
): Promise<ManagerSwapRequest[]> {
  const response = await fetch("/api/manager/swap-requests", {
    headers: {
      Authorization: `Bearer ${token}`
    },
    signal
  });

  const result = await readResponse<{
    swapRequests: ManagerSwapRequest[];
  }>(response);

  return result.swapRequests;
}

export async function decideManagerSwap(
  token: string,
  id: string,
  decision: ManagerSwapDecision
): Promise<ManagerSwapResult> {
  const response = await fetch(
    `/api/manager/swap-requests/${encodeURIComponent(id)}/decision`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ decision })
    }
  );

  const result = await readResponse<{
    swapRequest: ManagerSwapResult;
  }>(response);

  return result.swapRequest;
}