
import type { ExpenseCategory } from "../types/expense";
import {
    apiGet,
    apiPost,
    apiPutNoContent,
    apiDelete,
} from "./client";

// カテゴリ一覧取得
export async function fetchCategories(
    signal?: AbortSignal
): Promise<ExpenseCategory[]> {
    const categories = await apiGet<ExpenseCategory[] | null>(
        "/categories",
        signal
    );

    return categories ?? [];
}

// カテゴリ追加
export async function createCategory(
    name: string
): Promise<ExpenseCategory> {
    return apiPost<ExpenseCategory, { name: string }>(
        "/categories",
        { name }
    );
}

// カテゴリ名変更
export async function renameCategory(
    id: string,
    name: string
): Promise<void> {
    await apiPutNoContent(
        `/categories/${encodeURIComponent(id)}`,
        { name }
    );
}

// カテゴリ削除
export async function removeCategory(
    id: string
): Promise<void> {
    await apiDelete(
        `/categories/${encodeURIComponent(id)}`
    );
}
