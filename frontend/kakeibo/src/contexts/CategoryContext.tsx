
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    createCategory,
    fetchCategories,
    removeCategory,
    renameCategory,
} from "../api/categories";

import type {
    ExpenseCategory,
} from "../types/expense";

type CategoryContextValue = {
    categories: ExpenseCategory[];
    isLoading: boolean;
    loadError: string | null;
    refreshCategories: () => Promise<void>;
    addCategory: (name: string) => Promise<ExpenseCategory>;
    updateCategory: (
        id: string,
        name: string
    ) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    getCategoryName: (id: string) => string;
};

const CategoryContext =
    createContext<CategoryContextValue | undefined>(
        undefined
    );

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "不明なエラーが発生しました。";
}

export function CategoryProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [categories, setCategories] =
        useState<ExpenseCategory[]>([]);

    const [isLoading, setIsLoading] =
        useState(true);

    const [loadError, setLoadError] =
        useState<string | null>(null);

    // カテゴリ一覧を再取得
    const refreshCategories = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        try {
            const result = await fetchCategories();

            setCategories(result);
        } catch (error) {
            console.error(
                "カテゴリ一覧取得に失敗:",
                error
            );

            setLoadError(
                `カテゴリの取得に失敗しました: ${getErrorMessage(error)}`
            );

            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 初回読み込み
    useEffect(() => {
        const controller = new AbortController();
        let active = true;

        async function loadCategories() {
            setIsLoading(true);
            setLoadError(null);

            try {
                const result = await fetchCategories(
                    controller.signal
                );

                if (!active) {
                    return;
                }

                setCategories(result);
            } catch (error) {
                if (!active) {
                    return;
                }

                console.error(
                    "カテゴリ初期取得に失敗:",
                    error
                );

                setLoadError(
                    `カテゴリの取得に失敗しました: ${getErrorMessage(error)}`
                );
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void loadCategories();

        return () => {
            active = false;
            controller.abort();
        };
    }, []);

    // カテゴリ追加
    const addCategory = useCallback(
        async (name: string): Promise<ExpenseCategory> => {
            const trimmedName = name.trim();

            if (!trimmedName) {
                throw new Error(
                    "カテゴリ名を入力してください。"
                );
            }

            const created = await createCategory(
                trimmedName
            );

            setCategories((current) =>
                [...current, created].sort(
                    (a, b) =>
                        a.sortOrder - b.sortOrder
                )
            );

            return created;
        },
        []
    );

    // カテゴリ名変更
    const updateCategory = useCallback(
        async (
            id: string,
            name: string
        ): Promise<void> => {
            const trimmedName = name.trim();

            if (!trimmedName) {
                throw new Error(
                    "カテゴリ名を入力してください。"
                );
            }

            await renameCategory(
                id,
                trimmedName
            );

            setCategories((current) =>
                current.map((item) =>
                    item.id === id
                        ? {
                            ...item,
                            name: trimmedName,
                        }
                        : item
                )
            );
        },
        []
    );

    // カテゴリ削除
    const deleteCategory = useCallback(
        async (id: string): Promise<void> => {
            await removeCategory(id);

            setCategories((current) =>
                current.filter(
                    (item) => item.id !== id
                )
            );
        },
        []
    );

    // カテゴリIDから表示名を取得
    const getCategoryName = useCallback(
        (id: string): string => {
            const category = categories.find(
                (item) => item.id === id
            );

            return category?.name ?? id;
        },
        [categories]
    );

    const value = useMemo<CategoryContextValue>(
        () => ({
            categories,
            isLoading,
            loadError,
            refreshCategories,
            addCategory,
            updateCategory,
            deleteCategory,
            getCategoryName,
        }),
        [
            categories,
            isLoading,
            loadError,
            refreshCategories,
            addCategory,
            updateCategory,
            deleteCategory,
            getCategoryName,
        ]
    );

    return (
        <CategoryContext.Provider value={value}>
            {children}
        </CategoryContext.Provider>
    );
}

export function useCategories(): CategoryContextValue {
    const context = useContext(CategoryContext);

    if (!context) {
        throw new Error(
            "useCategories は CategoryProvider の内部で使用してください。"
        );
    }

    return context;
}
