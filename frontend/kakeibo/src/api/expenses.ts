
import type { Expense, ExpenseInput } from "../types/expense";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

// 支出一覧取得
export async function fetchExpenses(
    signal?: AbortSignal
): Promise<Expense[]> {
    const expenses = await apiGet<Expense[] | null>(
        "/expenses",
        signal
    );

    return expenses ?? [];
}

// 支出登録
export async function createExpense(
    input: ExpenseInput
): Promise<Expense> {
    return apiPost<Expense, ExpenseInput>(
        "/expenses",
        input
    );
}

// 支出編集
export async function updateExpense(
    id: string,
    input: ExpenseInput
): Promise<Expense> {
    return apiPut<Expense, ExpenseInput>(
        `/expenses/${encodeURIComponent(id)}`,
        input
    );
}

// 支出削除
export async function deleteExpense(
    id: string
): Promise<void> {
    await apiDelete(
        `/expenses/${encodeURIComponent(id)}`
    );
}
