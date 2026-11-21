import type { Person } from "./expense";

export type Settlement = {
    id: string;
    date: string;
    from: Person;
    to: Person;
    amount: number;
};

export type SettlementInput = Omit<Settlement, "id">;