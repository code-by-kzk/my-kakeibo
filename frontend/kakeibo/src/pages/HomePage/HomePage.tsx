
import { useMemo } from "react";
import {
    ArrowRight,
    Plus,
    ReceiptText,
} from "lucide-react";
import { Link } from "react-router-dom";

import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";

import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";

import type { Expense } from "../../types/expense";

const categoryLabels: Record<Expense["category"], string> = {
    food: "食費",
    daily: "日用品",
    transport: "交通",
    housing: "住居",
    utilities: "水道・光熱費",
    entertainment: "娯楽",
    other: "その他",
};

const categoryOrder: Expense["category"][] = [
    "food",
    "daily",
    "transport",
    "housing",
    "utilities",
    "entertainment",
    "other",
];

function formatYen(amount: number): string {
    return `¥${amount.toLocaleString("ja-JP")}`;
}

function getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

function getPreviousMonthKey(date: Date): string {
    const previousMonth = new Date(
        date.getFullYear(),
        date.getMonth() - 1,
        1
    );

    return getMonthKey(previousMonth);
}

export default function HomePage() {
    const {
        expenses,
        isLoading,
        loadError,
    } = useExpenses();

    const { settings } = useSettings();

    const today = new Date();

    const currentMonthKey = getMonthKey(today);
    const previousMonthKey = getPreviousMonthKey(today);

    // 今月の支出
    const currentMonthExpenses = useMemo(() => {
        return expenses.filter((expense) =>
            expense.date.startsWith(currentMonthKey)
        );
    }, [expenses, currentMonthKey]);

    // 前月の支出
    const previousMonthExpenses = useMemo(() => {
        return expenses.filter((expense) =>
            expense.date.startsWith(previousMonthKey)
        );
    }, [expenses, previousMonthKey]);

    // 今月の支出合計
    const currentMonthTotal = useMemo(() => {
        return currentMonthExpenses.reduce(
            (total, expense) => total + expense.amount,
            0
        );
    }, [currentMonthExpenses]);

    // 前月の支出合計
    const previousMonthTotal = useMemo(() => {
        return previousMonthExpenses.reduce(
            (total, expense) => total + expense.amount,
            0
        );
    }, [previousMonthExpenses]);

    // Aさん・Bさん別の支払額
    const paymentTotals = useMemo(() => {
        return currentMonthExpenses.reduce(
            (totals, expense) => {
                totals[expense.payer] += expense.amount;
                return totals;
            },
            {
                A: 0,
                B: 0,
            }
        );
    }, [currentMonthExpenses]);

    // 前月比
    const monthComparison = useMemo(() => {
        if (previousMonthTotal === 0) {
            return null;
        }

        return (
            ((currentMonthTotal - previousMonthTotal) /
                previousMonthTotal) *
            100
        );
    }, [currentMonthTotal, previousMonthTotal]);

    // カテゴリ別支出
    const categoryTotals = useMemo(() => {
        const totals = new Map<Expense["category"], number>();

        for (const category of categoryOrder) {
            totals.set(category, 0);
        }

        for (const expense of currentMonthExpenses) {
            const current = totals.get(expense.category) ?? 0;

            totals.set(
                expense.category,
                current + expense.amount
            );
        }

        return categoryOrder
            .map((category) => ({
                category,
                name: categoryLabels[category],
                amount: totals.get(category) ?? 0,
            }))
            .filter((item) => item.amount > 0)
            .sort((a, b) => b.amount - a.amount);
    }, [currentMonthExpenses]);

    // 最近の支出（全期間から直近5件）
    const recentExpenses = useMemo(() => {
        return [...expenses]
            .sort(
                (a, b) =>
                    b.date.localeCompare(a.date) ||
                    b.id.localeCompare(a.id)
            )
            .slice(0, 5);
    }, [expenses]);

    if (isLoading) {
        return (
            <div
                role="status"
                className="py-12 text-center text-mist"
            >
                支出データを読み込み中...
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="py-12 text-center">
                <p role="alert" className="text-sm text-red-300">
                    {loadError}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 今月の支出 */}
            <GlassCard>
                <p className="text-sm text-mist">
                    今月の支出
                </p>

                <p className="mt-3 text-4xl font-semibold tracking-wide text-moon">
                    {formatYen(currentMonthTotal)}
                </p>

                <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

                {/* Aさん・Bさん別の支払額 */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gold/20 bg-night/50 p-4">
                        <p className="truncate text-xs text-mist">
                            {settings.memberNames.A}の支払額
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-moon">
                            {formatYen(paymentTotals.A)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gold/20 bg-night/50 p-4">
                        <p className="truncate text-xs text-mist">
                            {settings.memberNames.B}の支払額
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-moon">
                            {formatYen(paymentTotals.B)}
                        </p>
                    </div>
                </div>

                {/* 前月比 */}
                <div className="mt-5">
                    {monthComparison === null ? (
                        <p className="text-sm text-mist">
                            前月の支出データがありません
                        </p>
                    ) : (
                        <p
                            className={`text-sm ${monthComparison > 0
                                    ? "text-red-300"
                                    : monthComparison < 0
                                        ? "text-cyan-glow"
                                        : "text-mist"
                                }`}
                        >
                            前月比{" "}
                            {monthComparison > 0 ? "+" : ""}
                            {monthComparison.toFixed(1)}%
                        </p>
                    )}
                </div>
            </GlassCard>

            {/* カテゴリ別支出 */}
            <GlassCard>
                <h2 className="mb-4 text-lg text-gold">
                    カテゴリ別支出
                </h2>

                {categoryTotals.length === 0 ? (
                    <p className="py-6 text-center text-sm text-mist">
                        今月の支出はまだありません
                    </p>
                ) : (
                    <div>
                        {categoryTotals.map((item) => (
                            <div
                                key={item.category}
                                className="flex justify-between gap-4 border-b border-white/10 py-3 last:border-0"
                            >
                                <span className="text-moon">
                                    {item.name}
                                </span>

                                <span className="font-medium text-moon">
                                    {formatYen(item.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* 最近の支出 */}
            <GlassCard>
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <ReceiptText
                            size={19}
                            className="text-gold"
                        />

                        <h2 className="text-lg text-gold">
                            最近の支出
                        </h2>
                    </div>

                    <Link
                        to="/expenses"
                        className="flex items-center gap-1 text-xs text-mist transition hover:text-gold"
                    >
                        すべて見る
                        <ArrowRight size={14} />
                    </Link>
                </div>

                {recentExpenses.length === 0 ? (
                    <p className="py-6 text-center text-sm text-mist">
                        支出履歴はまだありません
                    </p>
                ) : (
                    <div>
                        {recentExpenses.map((expense) => (
                            <Link
                                key={expense.id}
                                to={`/expenses/${expense.id}`}
                                className="flex items-center justify-between gap-3 border-b border-white/10 py-3 transition hover:bg-white/5 last:border-0"
                            >
                                <div className="min-w-0 space-y-1">
                                    <p className="text-xs text-mist">
                                        {expense.date.replaceAll(
                                            "-",
                                            "/"
                                        )}
                                    </p>

                                    <p className="text-sm text-moon">
                                        {categoryLabels[expense.category]}
                                    </p>

                                    <p className="truncate text-xs text-mist">
                                        支払者：
                                        {settings.memberNames[expense.payer]}
                                    </p>
                                </div>

                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="font-medium text-gold">
                                        {formatYen(expense.amount)}
                                    </span>

                                    <ArrowRight
                                        size={16}
                                        className="text-mist"
                                    />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* 支出登録ボタン */}
            <Link to="/expenses/new" className="block">
                <GoldButton className="pointer-events-none">
                    <Plus size={20} />
                    支出を登録する
                </GoldButton>
            </Link>
        </div>
    );
}
