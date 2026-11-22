
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import type {
    Expense,
    ExpenseInput,
} from "../types/expense";

import {
    fetchExpenses,
    createExpense,
    updateExpense as updateExpenseApi,
    deleteExpense as deleteExpenseApi,
} from "../api/expenses";

type ExpenseContextType = {
    expenses: Expense[];
    isLoading: boolean;
    loadError: string | null;

    // 支出データの更新番号
    expenseRevision: number;

    addExpense: (input: ExpenseInput) => Promise<Expense>;
    updateExpense: (
        id: string,
        input: ExpenseInput
    ) => Promise<boolean>;
    deleteExpense: (id: string) => Promise<void>;
    getExpenseById: (id: string) => Expense | undefined;
};

const ExpenseContext =
    createContext<ExpenseContextType | null>(null);

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

export function ExpenseProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    // 支出の登録・編集・削除が成功した回数
    const [expenseRevision, setExpenseRevision] = useState(0);

    useEffect(() => {
        const controller = new AbortController();

        async function loadApiExpenses() {
            setIsLoading(true);
            setLoadError(null);

            try {
                const data = await fetchExpenses(
                    controller.signal
                );

                if (controller.signal.aborted) return;

                console.log(
                    "Go APIから取得した支出一覧:",
                    data
                );

                setExpenses(data);
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error(
                    "支出一覧の取得に失敗:",
                    error
                );

                setLoadError(
                    "支出一覧の取得に失敗しました。"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        void loadApiExpenses();

        return () => controller.abort();
    }, []);

    async function addExpense(
        input: ExpenseInput
    ): Promise<Expense> {
        validateInput(input);

        const expense = await createExpense(input);

        setExpenses((current) => [
            expense,
            ...current,
        ]);

        // 登録成功後に更新番号を増やす
        setExpenseRevision((current) => current + 1);

        return expense;
    }

    async function updateExpense(
        id: string,
        input: ExpenseInput
    ): Promise<boolean> {
        validateInput(input);

        if (
            !expenses.some(
                (expense) => expense.id === id
            )
        ) {
            return false;
        }

        const updatedExpense = await updateExpenseApi(
            id,
            input
        );

        setExpenses((current) =>
            current.map((expense) =>
                expense.id === id
                    ? updatedExpense
                    : expense
            )
        );

        // 編集成功後に更新番号を増やす
        setExpenseRevision((current) => current + 1);

        return true;
    }

    async function deleteExpense(
        id: string
    ): Promise<void> {
        await deleteExpenseApi(id);

        setExpenses((current) =>
            current.filter(
                (expense) => expense.id !== id
            )
        );

        // 削除成功後に更新番号を増やす
        setExpenseRevision((current) => current + 1);
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
                isLoading,
                loadError,
                expenseRevision,
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
