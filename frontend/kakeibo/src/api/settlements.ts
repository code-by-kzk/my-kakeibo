
import type {
    Settlement,
    SettlementInput,
} from "../types/settlement";

import {
    apiGet,
    apiPost,
    apiDelete,
} from "./client";

type SettlementApi = {
    id: string;
    date: string;
    amount: number;
    fromPerson: Settlement["from"];
    toPerson: Settlement["to"];
    createdAt: string;
    updatedAt: string;
};

type SettlementCreateRequest = {
    date: string;
    amount: number;
    fromPerson: SettlementInput["from"];
    toPerson: SettlementInput["to"];
};

function toSettlement(data: SettlementApi): Settlement {
    return {
        id: data.id,
        date: data.date,
        amount: data.amount,
        from: data.fromPerson,
        to: data.toPerson,
    };
}

export async function fetchSettlements(
    signal?: AbortSignal,
): Promise<Settlement[]> {
    const settlements = await apiGet<SettlementApi[] | null>(
        "/settlements",
        signal,
    );

    return (settlements ?? []).map(toSettlement);
}

export async function createSettlement(
    input: SettlementInput,
): Promise<Settlement> {
    const request: SettlementCreateRequest = {
        date: input.date,
        amount: input.amount,
        fromPerson: input.from,
        toPerson: input.to,
    };

    const settlement = await apiPost<
        SettlementApi,
        SettlementCreateRequest
    >("/settlements", request);

    return toSettlement(settlement);
}

export async function deleteSettlement(
    id: string,
): Promise<void> {
    await apiDelete(
        `/settlements/${encodeURIComponent(id)}`,
    );
}
