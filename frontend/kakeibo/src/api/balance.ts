
import { apiGet } from "./client";

import type { Person } from "../types/expense";

export type BalanceResponse = {
    amount: number;
    fromPerson: Person | null;
    toPerson: Person | null;
};

export async function fetchBalance(
    signal?: AbortSignal,
): Promise<BalanceResponse> {
    return apiGet<BalanceResponse>(
        "/balance",
        signal,
    );
}
