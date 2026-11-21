
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { initialExpenses } from "../data/initialExpenses";
import type {
    Expense,
    ExpenseInput,
} from "../types/expense";

type ExpenseContextType = {
    expenses: Expense[];
    addExpense: (input: ExpenseInput) => Expense;
    updateExpense: (
        id: string,
        input: ExpenseInput
    ) => boolean;
    deleteExpense: (id: string) => void;
    getExpenseById: (
        id: string
    ) => Expense | undefined;
};

const ExpenseContext =
    createContext<ExpenseContextType | null>(null);

const STORAGE_KEY = "futari-kakeibo-expenses";

function isExpense(value: unknown): value is Expense {
    if (
        typeof value !== "object" ||
        value === null
    ) {
        return false;
    }

    const item = value as Record<string, unknown>;
    const shares = item.shares;

    if (
        typeof shares !== "object" ||
        shares === null
    ) {
        return false;
    }

    const split = shares as Record<string, unknown>;

    const categories = [
        "food",
        "daily",
        "transport",
        "housing",
        "utilities",
        "entertainment",
        "other",
    ];

    const methods = [
        "cash",
        "credit",
        "debit",
        "qr",
    ];

    return (
        typeof item.id === "string" &&
        item.id.length > 0 &&
        typeof item.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        Number.isSafeInteger(item.amount) &&
        (item.amount as number) > 0 &&
        (item.payer === "A" || item.payer === "B") &&
        methods.includes(String(item.paymentMethod)) &&
        categories.includes(String(item.category)) &&
        Number.isSafeInteger(split.A) &&
        Number.isSafeInteger(split.B) &&
        (split.A as number) >= 0 &&
        (split.B as number) >= 0 &&
        (split.A as number) + (split.B as number) ===
        item.amount
    );
}

function validateInput(input: ExpenseInput): void {
    if (!isExpense({ ...input, id: "validation" })) {
        throw new Error("支出データが不正です");
    }
}

function loadExpenses(): Expense[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            return initialExpenses;
        }

        const parsed: unknown = JSON.parse(saved);

        if (
            !Array.isArray(parsed) ||
            !parsed.every(isExpense)
        ) {
            throw new Error("保存データの形式が不正です");
        }

        return parsed;
    } catch (error) {
        console.error("支出データの読み込み失敗:", error);

        // 破損した保存データは上書きせず、
        // この画面表示中のみ空の一覧にする
        return [];
    }
}

export function ExpenseProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [expenses, setExpenses] =
        useState<Expense[]>(loadExpenses);

    useEffect(() => {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(expenses)
            );
        } catch (error) {
            console.error("支出データの保存失敗:", error);
        }
    }, [expenses]);

    function addExpense(input: ExpenseInput): Expense {
        validateInput(input);

        const expense: Expense = {
            ...input,
            shares: { ...input.shares },
            id: crypto.randomUUID(),
        };

        setExpenses((current) => [
            expense,
            ...current,
        ]);

        return expense;
    }

    function updateExpense(
        id: string,
        input: ExpenseInput
    ): boolean {
        validateInput(input);

        if (!expenses.some((expense) => expense.id === id)) {
            return false;
        }

        setExpenses((current) =>
            current.map((expense) =>
                expense.id === id
                    ? {
                        ...input,
                        shares: { ...input.shares },
                        id,
                    }
                    : expense
            )
        );

        return true;
    }

    function deleteExpense(id: string): void {
        setExpenses((current) =>
            current.filter(
                (expense) => expense.id !== id
            )
        );
    }

    function getExpenseById(
        id: string
    ): Expense | undefined {
        return expenses.find(
            (expense) => expense.id === id
        );
    }

    return (
        <ExpenseContext.Provider
            value={{
                expenses,
                addExpense,
                updateExpense,
                deleteExpense,
                getExpenseById,
            }}
        >
            {children}
        </ExpenseContext.Provider>
    );
}

export function useExpenses(): ExpenseContextType {
    const context = useContext(ExpenseContext);

    if (!context) {
        throw new Error(
            "useExpenses must be used within ExpenseProvider"
        );
    }

    return context;
}
