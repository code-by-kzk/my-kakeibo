import type { Expense, Person } from "../types/expense";
import type { Settlement } from "../types/settlement";

export type SettlementBalance = {
    from: Person | null;
    to: Person | null;
    amount: number;
    signedBalance: number;
};

export function calculateSettlementBalance(
    expenses: Expense[],
    settlements: Settlement[],
    throughDate?: string,
): SettlementBalance {
    let balance = 0;

    // Aさんが立て替えた金額をプラス、
    // Bさんが立て替えた金額をマイナスとして計算
    for (const expense of expenses) {
        if (throughDate && expense.date > throughDate) continue;

        if (expense.payer === "A") {
            balance += expense.shares.B;
        } else {
            balance -= expense.shares.A;
        }
    }

    // 精算済み金額を差し引く
    for (const settlement of settlements) {
        if (throughDate && settlement.date > throughDate) continue;

        if (settlement.from === "B" && settlement.to === "A") {
            balance -= settlement.amount;
        } else if (
            settlement.from === "A" &&
            settlement.to === "B"
        ) {
            balance += settlement.amount;
        }
    }

    if (balance > 0) {
        return {
            from: "B",
            to: "A",
            amount: balance,
            signedBalance: balance,
        };
    }

    if (balance < 0) {
        return {
            from: "A",
            to: "B",
            amount: Math.abs(balance),
            signedBalance: balance,
        };
    }

    return {
        from: null,
        to: null,
        amount: 0,
        signedBalance: 0,
    };
}