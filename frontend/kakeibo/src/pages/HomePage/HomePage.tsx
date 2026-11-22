
import { useMemo, useState } from "react";
import {
    ArrowRight,
    CalendarDays,
    Plus,
    ReceiptText,
} from "lucide-react";
import { Link } from "react-router-dom";

import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";

import { useCategories } from "../../contexts/CategoryContext";
import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";

type PeriodType = "current" | "previous" | "last30" | "custom";

type MemberTotals = {
    A: number;
    B: number;
};

type DateRange = {
    start: string;
    end: string;
};

const PERIOD_OPTIONS: {
    value: PeriodType;
    label: string;
}[] = [
        { value: "current", label: "今月" },
        { value: "previous", label: "先月" },
        { value: "last30", label: "過去30日" },
        { value: "custom", label: "期間指定" },
    ];

function formatYen(amount: number): string {
    return `¥${amount.toLocaleString("ja-JP")}`;
}

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getMonthRange(
    year: number,
    monthIndex: number
): DateRange {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);

    return {
        start: formatDate(firstDay),
        end: formatDate(lastDay),
    };
}

function getPeriodRange(
    period: PeriodType,
    today: Date,
    customRange: DateRange
): DateRange {
    switch (period) {
        case "current":
            return getMonthRange(
                today.getFullYear(),
                today.getMonth()
            );

        case "previous":
            return getMonthRange(
                today.getFullYear(),
                today.getMonth() - 1
            );

        case "last30": {
            const start = new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() - 29
            );

            return {
                start: formatDate(start),
                end: formatDate(today),
            };
        }

        case "custom":
            return customRange;
    }
}

function getPreviousMonthRange(
    period: PeriodType,
    today: Date
): DateRange | null {
    if (period === "current") {
        return getMonthRange(
            today.getFullYear(),
            today.getMonth() - 1
        );
    }

    if (period === "previous") {
        return getMonthRange(
            today.getFullYear(),
            today.getMonth() - 2
        );
    }

    return null;
}

function isDateInRange(
    date: string,
    range: DateRange
): boolean {
    return date >= range.start && date <= range.end;
}

function isValidDateString(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const [year, month, day] = value
        .split("-")
        .map(Number);

    const parsed = new Date(year, month - 1, day);

    return (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
    );
}

function getPeriodLabel(period: PeriodType): string {
    switch (period) {
        case "current":
            return "今月";

        case "previous":
            return "先月";

        case "last30":
            return "過去30日";

        case "custom":
            return "指定期間";
    }
}

export default function HomePage() {
    const {
        expenses,
        isLoading,
        loadError,
    } = useExpenses();

    const { getCategoryName } = useCategories();
    const { settings } = useSettings();

    const [period, setPeriod] = useState<PeriodType>("current");

    const [customRange, setCustomRange] = useState<DateRange>(
        () => {
            const today = new Date();

            return getMonthRange(
                today.getFullYear(),
                today.getMonth()
            );
        }
    );

    const today = new Date();

    const selectedRange = getPeriodRange(
        period,
        today,
        customRange
    );

    const isCustomRangeValid =
        period !== "custom" ||
        (
            isValidDateString(customRange.start) &&
            isValidDateString(customRange.end) &&
            customRange.start <= customRange.end
        );

    const periodLabel = getPeriodLabel(period);

    const selectedExpenses = useMemo(() => {
        if (!isCustomRangeValid) {
            return [];
        }

        return expenses.filter((expense) =>
            isDateInRange(expense.date, selectedRange)
        );
    }, [
        expenses,
        selectedRange.start,
        selectedRange.end,
        isCustomRangeValid,
    ]);

    // 選択期間の支出合計
    const selectedTotal = useMemo(() => {
        return selectedExpenses.reduce(
            (total, expense) => total + expense.amount,
            0
        );
    }, [selectedExpenses]);

    // 選択期間のメンバー別支払額
    const paymentTotals = useMemo<MemberTotals>(() => {
        return selectedExpenses.reduce(
            (totals, expense) => {
                totals[expense.payer] += expense.amount;

                return totals;
            },
            {
                A: 0,
                B: 0,
            }
        );
    }, [selectedExpenses]);

    // 選択期間のメンバー別負担額
    const burdenTotals = useMemo<MemberTotals>(() => {
        return selectedExpenses.reduce(
            (totals, expense) => {
                totals.A += expense.shares.A;
                totals.B += expense.shares.B;

                return totals;
            },
            {
                A: 0,
                B: 0,
            }
        );
    }, [selectedExpenses]);

    // 比較対象となる前月の支出
    const comparisonRange = getPreviousMonthRange(
        period,
        today
    );

    const comparisonTotal = useMemo(() => {
        if (!comparisonRange) {
            return null;
        }

        return expenses
            .filter((expense) =>
                isDateInRange(expense.date, comparisonRange)
            )
            .reduce(
                (total, expense) => total + expense.amount,
                0
            );
    }, [
        expenses,
        comparisonRange?.start,
        comparisonRange?.end,
    ]);

    const monthComparison = useMemo(() => {
        if (
            comparisonTotal === null ||
            comparisonTotal === 0
        ) {
            return null;
        }

        return (
            ((selectedTotal - comparisonTotal) /
                comparisonTotal) *
            100
        );
    }, [selectedTotal, comparisonTotal]);

    // 選択期間のカテゴリ別支出
    const categoryTotals = useMemo(() => {
        const totals = new Map<string, number>();

        for (const expense of selectedExpenses) {
            const current = totals.get(expense.category) ?? 0;

            totals.set(
                expense.category,
                current + expense.amount
            );
        }

        return Array.from(totals.entries())
            .map(([category, amount]) => ({
                category,
                name: getCategoryName(category),
                amount,
            }))
            .filter((item) => item.amount > 0)
            .sort((a, b) => b.amount - a.amount);
    }, [selectedExpenses, getCategoryName]);

    // 最近の支出は期間選択の影響を受けない
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
                <p
                    role="alert"
                    className="text-sm text-red-300"
                >
                    {loadError}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* 集計期間の選択 */}
            <GlassCard>
                <div className="mb-4 flex items-center gap-2">
                    <CalendarDays
                        size={19}
                        className="text-gold"
                    />

                    <h2 className="text-lg text-gold">
                        集計期間
                    </h2>
                </div>

                <div
                    role="group"
                    aria-label="集計期間"
                    className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                >
                    {PERIOD_OPTIONS.map((option) => {
                        const isSelected =
                            period === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={isSelected}
                                onClick={() =>
                                    setPeriod(option.value)
                                }
                                className={`rounded-xl border px-3 py-3 text-sm transition ${isSelected
                                    ? "border-gold/70 bg-gold/15 text-gold"
                                    : "border-white/10 bg-night/40 text-mist hover:border-gold/30 hover:text-moon"
                                    }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>

                {period === "custom" && (
                    <div className="mt-5 space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="home-start-date"
                                    className="mb-2 block text-xs text-mist"
                                >
                                    開始日
                                </label>

                                <input
                                    id="home-start-date"
                                    type="date"
                                    value={customRange.start}
                                    max={customRange.end}
                                    onChange={(event) =>
                                        setCustomRange(
                                            (current) => ({
                                                ...current,
                                                start: event.target.value,
                                            })
                                        )
                                    }
                                    className="w-full min-w-0 rounded-xl border border-gold/20 bg-night/60 px-3 py-3 text-sm text-moon outline-none transition focus:border-gold/70"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="home-end-date"
                                    className="mb-2 block text-xs text-mist"
                                >
                                    終了日
                                </label>

                                <input
                                    id="home-end-date"
                                    type="date"
                                    value={customRange.end}
                                    min={customRange.start}
                                    onChange={(event) =>
                                        setCustomRange(
                                            (current) => ({
                                                ...current,
                                                end: event.target.value,
                                            })
                                        )
                                    }
                                    className="w-full min-w-0 rounded-xl border border-gold/20 bg-night/60 px-3 py-3 text-sm text-moon outline-none transition focus:border-gold/70"
                                />
                            </div>
                        </div>

                        {!isCustomRangeValid && (
                            <p
                                role="alert"
                                className="text-sm text-red-300"
                            >
                                開始日と終了日を正しく指定してください。
                            </p>
                        )}
                    </div>
                )}

                <p className="mt-4 text-xs text-mist">
                    集計対象：
                    {selectedRange.start.replaceAll("-", "/")}
                    {" 〜 "}
                    {selectedRange.end.replaceAll("-", "/")}
                </p>
            </GlassCard>

            {/* 選択期間の支出 */}
            <GlassCard>
                <p className="text-sm text-mist">
                    {periodLabel}の支出
                </p>

                <p className="mt-3 text-4xl font-semibold tracking-wide text-moon">
                    {formatYen(selectedTotal)}
                </p>

                <p className="mt-2 text-xs text-mist">
                    {selectedExpenses.length}件の支出
                </p>

                <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

                {/* メンバー別支払額 */}
                <h3 className="mt-5 text-sm text-gold">
                    支払額
                </h3>

                <p className="mt-1 text-xs text-mist">
                    実際に支払いを行った金額
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gold/20 bg-night/50 p-4">
                        <p className="truncate text-xs text-mist">
                            {settings.memberNames.A}
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-moon">
                            {formatYen(paymentTotals.A)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gold/20 bg-night/50 p-4">
                        <p className="truncate text-xs text-mist">
                            {settings.memberNames.B}
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-moon">
                            {formatYen(paymentTotals.B)}
                        </p>
                    </div>
                </div>

                {/* メンバー別負担額 */}
                <h3 className="mt-6 text-sm text-gold">
                    負担額
                </h3>

                <p className="mt-1 text-xs text-mist">
                    支出の負担内訳に基づく金額
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gold/20 bg-night/50 p-4">
                        <p className="truncate text-xs text-mist">
                            {settings.memberNames.A}
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-moon">
                            {formatYen(burdenTotals.A)}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gold/20 bg-night/50 p-4">
                        <p className="truncate text-xs text-mist">
                            {settings.memberNames.B}
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-moon">
                            {formatYen(burdenTotals.B)}
                        </p>
                    </div>
                </div>

                {/* 前月比 */}
                {comparisonRange && (
                    <div className="mt-5 border-t border-white/10 pt-4">
                        {monthComparison === null ? (
                            <p className="text-sm text-mist">
                                比較対象月の支出データがありません
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
                )}
            </GlassCard>

            {/* カテゴリ別支出 */}
            <GlassCard>
                <h2 className="mb-4 text-lg text-gold">
                    カテゴリ別支出
                </h2>

                {categoryTotals.length === 0 ? (
                    <p className="py-6 text-center text-sm text-mist">
                        {isCustomRangeValid
                            ? "選択期間の支出はまだありません"
                            : "集計期間を正しく指定してください"}
                    </p>
                ) : (
                    <div>
                        {categoryTotals.map((item) => {
                            const percentage =
                                selectedTotal > 0
                                    ? (item.amount / selectedTotal) * 100
                                    : 0;

                            return (
                                <div
                                    key={item.category}
                                    className="border-b border-white/10 py-3 last:border-0"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-sm text-moon">
                                            {item.name}
                                        </span>

                                        <span className="shrink-0 font-medium text-moon">
                                            {formatYen(item.amount)}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full bg-gold/70 transition-all"
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />
                                        </div>

                                        <span className="w-12 text-right text-xs text-mist">
                                            {percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
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
                                        {getCategoryName(
                                            expense.category
                                        )}
                                    </p>

                                    <p className="truncate text-xs text-mist">
                                        支払者：
                                        {
                                            settings.memberNames[
                                            expense.payer
                                            ]
                                        }
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
            <Link
                to="/expenses/new"
                className="block"
            >
                <GoldButton className="pointer-events-none">
                    <Plus size={20} />
                    支出を登録する
                </GoldButton>
            </Link>
        </div>
    );
}
