import { useExpenses } from "../../contexts/ExpenseContext";
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

type Category =
    | "food"
    | "daily"
    | "transport"
    | "housing"
    | "utilities"
    | "entertainment"
    | "other";

type Expense = {
    id: string;
    date: string;
    amount: number;
    category: Category;
    shares: {
        A: number;
        B: number;
    };
};

const categoryConfig: Record<
    Category,
    { label: string; color: string }
> = {
    food: { label: "食費", color: "#DCC397" },
    daily: { label: "日用品", color: "#75CBE3" },
    transport: { label: "交通費", color: "#A78BFA" },
    housing: { label: "住居費", color: "#93C5FD" },
    utilities: { label: "水道・光熱費", color: "#F9A8D4" },
    entertainment: { label: "娯楽", color: "#86EFAC" },
    other: { label: "その他", color: "#94A3B8" },
};

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
    const { expenses } = useExpenses();
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

    const monthlyExpenses = useMemo(
        () =>
            expenses.filter((expense) =>
                expense.date.startsWith(monthKey)
            ),
        [expenses, monthKey]
    );

    const totalAmount = sumExpenses(monthlyExpenses);

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
    const categoryData = useMemo(() => {
        return (
            Object.entries(categoryConfig) as [
                Category,
                { label: string; color: string }
            ][]
        )
            .map(([key, config]) => {
                const amount = monthlyExpenses
                    .filter((expense) => expense.category === key)
                    .reduce(
                        (sum, expense) => sum + expense.amount,
                        0
                    );

                return {
                    key,
                    name: config.label,
                    value: amount,
                    color: config.color,
                    percent:
                        totalAmount > 0
                            ? (amount / totalAmount) * 100
                            : 0,
                };
            })
            .filter((item) => item.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [monthlyExpenses, totalAmount]);

    // 選択月までの過去6か月
    const trendData = useMemo(() => {
        return Array.from({ length: 6 }, (_, index) => {
            const month = shiftMonth(
                selectedMonth,
                index - 5
            );

            const key = getMonthKey(month);

            const monthlyExpenses = expenses.filter(
                (expense) => expense.date.startsWith(key)
            );

            return {
                month: `${month.getMonth() + 1}月`,
                amount: sumExpenses(monthlyExpenses),
            };
        });
    }, [selectedMonth, expenses]);

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-5 pb-6 text-moon">
            {/* タイトル */}
            <header>
                <p className="mb-2 text-xs tracking-[0.2em] text-gold">
                    ANALYTICS
                </p>

                <h1 className="flex items-center gap-2 font-serif text-2xl">
                    <ChartPie size={24} className="text-gold" />
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
                    <p className="text-xs text-gold">
                        Aさんの負担
                    </p>
                    <p className="mt-3 break-all text-lg font-semibold">
                        {formatYen(totalA)}
                    </p>
                </GlassCard>

                <GlassCard>
                    <p className="text-xs text-cyan-glow">
                        Bさんの負担
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
                                            formatYen(Number(value ?? 0))
                                        }
                                        contentStyle={{
                                            background: "#142238",
                                            border: "1px solid #DCC39755",
                                            borderRadius: 12,
                                            color: "#E8F1FF",
                                        }}
                                        itemStyle={{ color: "#E8F1FF" }}
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
                                                    backgroundColor: item.color,
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
                                                    backgroundColor: item.color,
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
                                    formatYen(Number(value ?? 0))
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

            <p className="text-center text-xs text-mist">
                現在はサンプルデータを使って集計しています。
            </p>
        </div>
    );
}
