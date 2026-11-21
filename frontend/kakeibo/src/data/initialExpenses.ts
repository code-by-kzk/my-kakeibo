
import type { Expense } from "../types/expense";

export const initialExpenses: Expense[] = [
    {
        id: "1",
        date: "2026-11-21",
        amount: 3480,
        payer: "A",
        paymentMethod: "credit",
        category: "food",
        shares: {
            A: 2000,
            B: 1480,
        },
    },
    {
        id: "2",
        date: "2026-11-21",
        amount: 1250,
        payer: "B",
        paymentMethod: "cash",
        category: "daily",
        shares: {
            A: 625,
            B: 625,
        },
    },
    {
        id: "3",
        date: "2026-11-20",
        amount: 860,
        payer: "A",
        paymentMethod: "qr",
        category: "transport",
        shares: {
            A: 430,
            B: 430,
        },
    },
    {
        id: "4",
        date: "2026-11-18",
        amount: 5600,
        payer: "B",
        paymentMethod: "credit",
        category: "food",
        shares: {
            A: 2800,
            B: 2800,
        },
    },
    {
        id: "5",
        date: "2026-10-30",
        amount: 4200,
        payer: "A",
        paymentMethod: "credit",
        category: "utilities",
        shares: {
            A: 2100,
            B: 2100,
        },
    },
];
