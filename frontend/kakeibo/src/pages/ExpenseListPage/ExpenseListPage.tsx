import { useExpenses } from "../../contexts/ExpenseContext";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Utensils,
    ShoppingBasket,
    TrainFront,
    House,
    Zap,
    Clapperboard,
    Wallet,
    type LucideIcon,
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import type { Expense } from "../../types/expense";

type Category =
    | "food"
    | "daily"
    | "transport"
    | "housing"
    | "utilities"
    | "entertainment"
    | "other";

const categoryConfig: Record<
    Category,
    { label: string; icon: LucideIcon }
> = {
    food: {
        label: "食費",
        icon: Utensils,
    },
    daily: {
        label: "日用品",
        icon: ShoppingBasket,
    },
    transport: {
        label: "交通費",
        icon: TrainFront,
    },
    housing: {
        label: "住居費",
        icon: House,
    },
    utilities: {
        label: "水道・光熱費",
        icon: Zap,
    },
    entertainment: {
        label: "娯楽",
        icon: Clapperboard,
    },
    other: {
        label: "その他",
        icon: Wallet,
    },
};

function formatYen(value: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(date: string): string {
    const [, month, day] = date.split("-").map(Number);
    return `${month}月${day}日`;
}

function getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

function shiftMonth(date: Date, offset: number): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth() + offset,
        1
    );
}

export default function ExpenseListPage() {
    const {
        expenses,
        isLoading,
        loadError,
    } = useExpenses();
    const [selectedMonth, setSelectedMonth] = useState(
        () => new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
        )
    );

    const monthKey = getMonthKey(selectedMonth);

    const monthLabel = new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "long",
    }).format(selectedMonth);

    // 選択月の支出を取得
    const monthlyExpenses = useMemo(() => {
        return expenses
            .filter((expense) =>
                expense.date.startsWith(monthKey)
            )
            .sort((a, b) =>
                b.date.localeCompare(a.date)
            );
    }, [expenses, monthKey]);

    // 月間合計
    const totals = useMemo(() => {
        return monthlyExpenses.reduce(
            (result, expense) => ({
                amount: result.amount + expense.amount,
                A: result.A + expense.shares.A,
                B: result.B + expense.shares.B,
            }),
            { amount: 0, A: 0, B: 0 }
        );
    }, [monthlyExpenses]);

    // 日付ごとにグループ化
    const groupedExpenses = useMemo(() => {
        const groups = new Map<string, Expense[]>();

        for (const expense of monthlyExpenses) {
            const group = groups.get(expense.date) ?? [];
            group.push(expense);
            groups.set(expense.date, group);
        }

        return Array.from(groups.entries());
    }, [monthlyExpenses]);

    if (isLoading) {
        return (
            <div
                role="status"
                className="mx-auto max-w-xl py-12 text-center text-mist"
            >
                支出一覧を読み込み中...
            </div>
        );
    }

    if (loadError) {
        return (
            <div
                role="alert"
                className="mx-auto max-w-xl py-12 text-center text-red-200"
            >
                {loadError}
            </div>
        );
    }

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 pb-6 text-moon">
            {/* タイトル */}
            <header>
                <p className="mb-2 text-xs tracking-[0.2em] text-gold">
                    EXPENSE HISTORY
                </p>

                <h1 className="font-serif text-2xl tracking-wider">
                    支出一覧
                </h1>

                <p className="mt-2 text-sm text-mist">
                    ふたりの支出を振り返りましょう
                </p>
            </header>

            {/* 月間サマリー */}
            <GlassCard>
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        aria-label="前月"
                        onClick={() =>
                            setSelectedMonth((current) =>
                                shiftMonth(current, -1)
                            )
                        }
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/20 text-gold transition-colors hover:bg-gold/10"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <h2 className="min-w-0 text-center font-serif text-lg">
                        {monthLabel}
                    </h2>

                    <button
                        type="button"
                        aria-label="翌月"
                        onClick={() =>
                            setSelectedMonth((current) =>
                                shiftMonth(current, 1)
                            )
                        }
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/20 text-gold transition-colors hover:bg-gold/10"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="mt-5 border-t border-gold/15 pt-5">
                    <p className="text-sm text-mist">
                        月間支出合計
                    </p>

                    <p className="mt-2 break-all text-3xl font-semibold tracking-wide text-gold">
                        {formatYen(totals.amount)}
                    </p>

                    <p className="mt-2 text-xs text-mist">
                        {monthlyExpenses.length}件の支出
                    </p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="min-w-0 rounded-xl bg-gold/10 p-3">
                        <p className="text-xs text-gold">
                            Aさんの負担
                        </p>
                        <p className="mt-2 break-all text-base font-semibold">
                            {formatYen(totals.A)}
                        </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-cyan-glow/10 p-3">
                        <p className="text-xs text-cyan-glow">
                            Bさんの負担
                        </p>
                        <p className="mt-2 break-all text-base font-semibold">
                            {formatYen(totals.B)}
                        </p>
                    </div>
                </div>
            </GlassCard>

            {/* 支出一覧 */}
            <section className="space-y-5">
                {groupedExpenses.length === 0 ? (
                    <GlassCard>
                        <div className="py-10 text-center">
                            <Wallet
                                size={32}
                                className="mx-auto mb-4 text-gold/60"
                            />

                            <p className="text-moon">
                                この月の支出はありません
                            </p>

                            <p className="mt-2 text-sm text-mist">
                                支出を登録すると、ここに表示されます
                            </p>
                        </div>
                    </GlassCard>
                ) : (
                    groupedExpenses.map(([date, items]) => (
                        <div key={date} className="space-y-3">
                            <h2 className="px-1 text-sm font-medium text-mist">
                                {formatDate(date)}
                            </h2>

                            {items.map((expense) => {
                                const category =
                                    categoryConfig[expense.category];

                                const Icon = category.icon;

                                return (
                                    <Link
                                        key={expense.id}
                                        to={`/expenses/${expense.id}`}
                                        className="block rounded-2xl transition-transform active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
                                        <GlassCard key={expense.id}>
                                            <div className="flex min-w-0 items-center gap-3">
                                                {/* カテゴリアイコン */}
                                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                                                    <Icon size={21} />
                                                </div>

                                                {/* カテゴリと支払者 */}
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium">
                                                        {category.label}
                                                    </p>

                                                    <p className="mt-1 text-xs text-mist">
                                                        支払者：{expense.payer}さん
                                                    </p>
                                                </div>

                                                {/* 金額 */}
                                                <p className="shrink-0 text-right text-base font-semibold tabular-nums">
                                                    {formatYen(expense.amount)}
                                                </p>
                                            </div>

                                            {/* 負担内訳 */}
                                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gold/15 pt-3">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-mist">
                                                        Aさんの負担
                                                    </p>
                                                    <p className="mt-1 break-all text-sm font-medium text-gold">
                                                        {formatYen(expense.shares.A)}
                                                    </p>
                                                </div>

                                                <div className="min-w-0 text-right">
                                                    <p className="text-xs text-mist">
                                                        Bさんの負担
                                                    </p>
                                                    <p className="mt-1 break-all text-sm font-medium text-cyan-glow">
                                                        {formatYen(expense.shares.B)}
                                                    </p>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    </Link>
                                );
                            })}
                        </div>
                    ))
                )}
            </section>

            {/* 支出登録へのリンク */}
            <Link
                to="/expenses/new"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f0dcad] bg-gradient-to-r from-[#b9a079] via-[#f0dcad] to-[#b9a079] px-5 py-3 font-semibold text-[#182235] transition-all hover:brightness-110 active:scale-[0.98]"
            >
                <Plus size={20} />
                支出を追加
            </Link>
        </div>
    );
}
