
import { useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ChartPie,
    TrendingDown,
    TrendingUp,
    Minus,
} from "lucide-react";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import GlassCard from "../../components/ui/GlassCard";

import { useCategories } from "../../contexts/CategoryContext";
import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";

import type { Expense } from "../../types/expense";

// 既存カテゴリの色は維持する
const defaultCategoryColors: Record<string, string> = {
    food: "#DCC397",
    daily: "#75CBE3",
    transport: "#A78BFA",
    housing: "#93C5FD",
    utilities: "#F9A8D4",
    entertainment: "#86EFAC",
    other: "#94A3B8",
};

// 追加カテゴリ用のカラーパレット
const customCategoryColors = [
    "#FCA5A5",
    "#FCD34D",
    "#5EEAD4",
    "#C4B5FD",
    "#FDBA74",
    "#67E8F9",
    "#BEF264",
    "#F0ABFC",
    "#93C5FD",
    "#FDA4AF",
];

function getCategoryColor(categoryId: string): string {
    const defaultColor = defaultCategoryColors[categoryId];

    if (defaultColor) {
        return defaultColor;
    }

    // カテゴリIDから安定した色を決定する
    let hash = 0;

    for (let index = 0; index < categoryId.length; index++) {
        hash =
            (hash * 31 + categoryId.charCodeAt(index)) >>> 0;
    }

    return customCategoryColors[
        hash % customCategoryColors.length
    ];
}

function formatYen(value: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(value);
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

function sumExpenses(expenses: Expense[]): number {
    return expenses.reduce(
        (total, expense) => total + expense.amount,
        0
    );
}

export default function AnalyticsPage() {
    const {
        expenses,
        isLoading,
        loadError,
    } = useExpenses();

    const { getCategoryName } = useCategories();
    const { settings } = useSettings();

    const [selectedMonth, setSelectedMonth] = useState(
        () =>
            new Date(
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

    // 選択月の支出
    const monthlyExpenses = useMemo(
        () =>
            expenses.filter((expense) =>
                expense.date.startsWith(monthKey)
            ),
        [expenses, monthKey]
    );

    // 月間支出合計
    const totalAmount = sumExpenses(monthlyExpenses);

    // Aさん・Bさんの負担額
    const totalA = monthlyExpenses.reduce(
        (sum, expense) => sum + expense.shares.A,
        0
    );

    const totalB = monthlyExpenses.reduce(
        (sum, expense) => sum + expense.shares.B,
        0
    );

    // 前月との比較
    const previousMonth = shiftMonth(selectedMonth, -1);
    const previousMonthKey = getMonthKey(previousMonth);

    const previousTotal = sumExpenses(
        expenses.filter((expense) =>
            expense.date.startsWith(previousMonthKey)
        )
    );

    const difference = totalAmount - previousTotal;

    const changeRate =
        previousTotal > 0
            ? (difference / previousTotal) * 100
            : null;

    // カテゴリ別集計
    // 固定7カテゴリではなく、支出データに存在する
    // すべてのカテゴリを集計対象にする
    const categoryData = useMemo(() => {
        const totals = new Map<string, number>();

        for (const expense of monthlyExpenses) {
            const current = totals.get(expense.category) ?? 0;

            totals.set(
                expense.category,
                current + expense.amount
            );
        }

        return Array.from(totals.entries())
            .map(([key, amount]) => ({
                key,
                name: getCategoryName(key),
                value: amount,
                color: getCategoryColor(key),
                percent:
                    totalAmount > 0
                        ? (amount / totalAmount) * 100
                        : 0,
            }))
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [monthlyExpenses, totalAmount, getCategoryName]);

    // 選択月までの過去6か月
    const trendData = useMemo(() => {
        return Array.from({ length: 6 }, (_, index) => {
            const month = shiftMonth(
                selectedMonth,
                index - 5
            );

            const key = getMonthKey(month);

            const targetExpenses = expenses.filter(
                (expense) => expense.date.startsWith(key)
            );

            return {
                month: `${month.getMonth() + 1}月`,
                amount: sumExpenses(targetExpenses),
            };
        });
    }, [selectedMonth, expenses]);

    // API読み込み中
    if (isLoading) {
        return (
            <div
                role="status"
                className="mx-auto max-w-xl py-12 text-center text-mist"
            >
                分析データを読み込み中...
            </div>
        );
    }

    // API取得失敗
    if (loadError) {
        return (
            <div className="mx-auto max-w-xl py-12 text-center">
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
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-5 pb-6 text-moon">
            {/* タイトル */}
            <header>
                <p className="mb-2 text-xs tracking-[0.2em] text-gold">
                    ANALYTICS
                </p>

                <h1 className="flex items-center gap-2 font-serif text-2xl">
                    <ChartPie
                        size={24}
                        className="text-gold"
                    />
                    支出分析
                </h1>

                <p className="mt-2 text-sm text-mist">
                    ふたりの支出を、月ごとに振り返る
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
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/25 text-gold hover:bg-gold/10"
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
                        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/25 text-gold hover:bg-gold/10"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="mt-5 border-t border-gold/15 pt-5">
                    <p className="text-sm text-mist">
                        月間支出合計
                    </p>

                    <p className="mt-2 break-all text-3xl font-semibold text-gold">
                        {formatYen(totalAmount)}
                    </p>

                    {/* 前月比較 */}
                    <div className="mt-3 flex items-center gap-2 text-sm">
                        {changeRate === null ? (
                            <span className="flex items-center gap-1 text-mist">
                                <Minus size={16} />
                                前月データなし
                            </span>
                        ) : difference < 0 ? (
                            <span className="flex items-center gap-1 text-emerald-300">
                                <TrendingDown size={16} />
                                前月比 {changeRate.toFixed(1)}%
                            </span>
                        ) : difference > 0 ? (
                            <span className="flex items-center gap-1 text-rose-300">
                                <TrendingUp size={16} />
                                前月比 +{changeRate.toFixed(1)}%
                            </span>
                        ) : (
                            <span className="text-mist">
                                前月比 0.0%
                            </span>
                        )}
                    </div>
                </div>
            </GlassCard>

            {/* Aさん・Bさんの負担 */}
            <div className="grid grid-cols-2 gap-3">
                <GlassCard>
                    <p className="truncate text-xs text-gold">
                        {settings.memberNames.A}の負担
                    </p>

                    <p className="mt-3 break-all text-lg font-semibold">
                        {formatYen(totalA)}
                    </p>
                </GlassCard>

                <GlassCard>
                    <p className="truncate text-xs text-cyan-glow">
                        {settings.memberNames.B}の負担
                    </p>

                    <p className="mt-3 break-all text-lg font-semibold">
                        {formatYen(totalB)}
                    </p>
                </GlassCard>
            </div>

            {/* カテゴリ別分析 */}
            <GlassCard>
                <h2 className="font-serif text-lg text-gold">
                    カテゴリ別支出
                </h2>

                {categoryData.length === 0 ? (
                    <p className="py-12 text-center text-sm text-mist">
                        この月の支出データはありません
                    </p>
                ) : (
                    <>
                        <div className="mt-4 h-64 min-w-0">
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={3}
                                        stroke="none"
                                    >
                                        {categoryData.map((item) => (
                                            <Cell
                                                key={item.key}
                                                fill={item.color}
                                            />
                                        ))}
                                    </Pie>

                                    <Tooltip
                                        formatter={(value) =>
                                            formatYen(
                                                Number(value ?? 0)
                                            )
                                        }
                                        contentStyle={{
                                            background: "#142238",
                                            border: "1px solid #DCC39755",
                                            borderRadius: 12,
                                            color: "#E8F1FF",
                                        }}
                                        itemStyle={{
                                            color: "#E8F1FF",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 space-y-4">
                            {categoryData.map((item) => (
                                <div key={item.key}>
                                    <div className="flex items-center justify-between gap-2 text-sm">
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span
                                                className="size-2.5 shrink-0 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        item.color,
                                                }}
                                            />

                                            <span className="truncate">
                                                {item.name}
                                            </span>
                                        </span>

                                        <span className="shrink-0 tabular-nums">
                                            {formatYen(item.value)}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center gap-3">
                                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${item.percent}%`,
                                                    backgroundColor:
                                                        item.color,
                                                }}
                                            />
                                        </div>

                                        <span className="w-12 shrink-0 text-right text-xs text-mist">
                                            {item.percent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </GlassCard>

            {/* 月別推移 */}
            <GlassCard>
                <h2 className="font-serif text-lg text-gold">
                    過去6か月の支出推移
                </h2>

                <p className="mt-2 text-xs text-mist">
                    選択した月までの支出合計
                </p>

                <div className="mt-6 h-64 min-w-0">
                    <ResponsiveContainer
                        width="100%"
                        height="100%"
                    >
                        <BarChart
                            data={trendData}
                            margin={{
                                top: 10,
                                right: 5,
                                left: -15,
                                bottom: 0,
                            }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="#DCC39722"
                            />

                            <XAxis
                                dataKey="month"
                                tick={{
                                    fill: "#A6BCD4",
                                    fontSize: 11,
                                }}
                                axisLine={false}
                                tickLine={false}
                            />

                            <YAxis
                                tick={{
                                    fill: "#A6BCD4",
                                    fontSize: 10,
                                }}
                                tickFormatter={(value) =>
                                    `${Math.round(value / 1000)}k`
                                }
                                axisLine={false}
                                tickLine={false}
                            />

                            <Tooltip
                                formatter={(value) =>
                                    formatYen(
                                        Number(value ?? 0)
                                    )
                                }
                                contentStyle={{
                                    background: "#142238",
                                    border: "1px solid #DCC39755",
                                    borderRadius: 12,
                                    color: "#E8F1FF",
                                }}
                                cursor={{
                                    fill: "#DCC39710",
                                }}
                            />

                            <Bar
                                dataKey="amount"
                                name="支出額"
                                fill="#DCC397"
                                radius={[5, 5, 0, 0]}
                                maxBarSize={38}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </GlassCard>
        </div>
    );
}
