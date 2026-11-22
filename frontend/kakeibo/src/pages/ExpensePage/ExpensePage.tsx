
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    CalendarDays,
    Check,
    CreditCard,
    RotateCcw,
    Save,
    Wallet,
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";

import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";

import type {
    Category,
    PaymentMethod,
    Person,
} from "../../types/expense";

// カテゴリ
const categories: {
    value: Category;
    label: string;
}[] = [
        { value: "food", label: "食費" },
        { value: "daily", label: "日用品" },
        { value: "transport", label: "交通費" },
        { value: "housing", label: "住居費" },
        { value: "utilities", label: "水道・光熱費" },
        { value: "entertainment", label: "娯楽" },
        { value: "other", label: "その他" },
    ];

// 支払い方法
const paymentMethods: {
    value: PaymentMethod;
    label: string;
}[] = [
        { value: "cash", label: "現金" },
        { value: "credit", label: "クレジットカード" },
        { value: "debit", label: "デビットカード" },
        { value: "qr", label: "QRコード決済" },
    ];

// 今日の日付をローカル時間で取得
function getToday(): string {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Aさんの負担額を計算
function calculateShareA(
    amount: number,
    percentA: number
): number {
    return Math.floor(amount * percentA / 100);
}

// 円表示
function formatYen(value: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(value);
}

// 金額を安全に整数へ変換
function parseAmount(value: string): number {
    const parsed = Number(value);

    if (
        !Number.isFinite(parsed) ||
        parsed < 0
    ) {
        return 0;
    }

    return Math.floor(parsed);
}

export default function ExpensePage() {
    const navigate = useNavigate();

    const { addExpense } = useExpenses();
    const { settings } = useSettings();

    // 設定から表示名を取得
    const memberAName = settings.memberNames.A;
    const memberBName = settings.memberNames.B;

    const defaultSharePercentA =
        settings.defaultSharePercentA;

    // 支出情報
    const [amount, setAmount] = useState(0);
    const [date, setDate] = useState(getToday);

    const [payer, setPayer] = useState<Person>("A");

    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>("credit");

    const [category, setCategory] =
        useState<Category>("food");

    // 負担額
    const [aShare, setAShare] = useState(0);
    const [bShare, setBShare] = useState(0);

    // 登録処理中
    const [isSubmitting, setIsSubmitting] =
        useState(false);

    // エラーメッセージ
    const [error, setError] = useState("");

    // 入力欄の共通スタイル
    const inputClassName =
        "w-full min-w-0 max-w-full rounded-xl " +
        "border border-gold/20 bg-night/60 " +
        "px-4 py-3 text-sm text-moon " +
        "outline-none transition-colors " +
        "focus:border-gold/60 focus:ring-1 " +
        "focus:ring-gold/20";

    // 金額変更時にデフォルト割合で再計算
    const handleAmountChange = (value: string) => {
        const nextAmount = parseAmount(value);

        setAmount(nextAmount);

        const nextAShare = calculateShareA(
            nextAmount,
            defaultSharePercentA
        );

        setAShare(nextAShare);
        setBShare(nextAmount - nextAShare);

        setError("");
    };

    // Aさんの負担額を直接変更
    const handleAShareChange = (value: string) => {
        const nextAShare = Math.min(
            parseAmount(value),
            amount
        );

        setAShare(nextAShare);
        setBShare(amount - nextAShare);
        setError("");
    };

    // Bさんの負担額を直接変更
    const handleBShareChange = (value: string) => {
        const nextBShare = Math.min(
            parseAmount(value),
            amount
        );

        setBShare(nextBShare);
        setAShare(amount - nextBShare);
        setError("");
    };

    // スライダーでAさんの負担割合を変更
    const handleShareSliderChange = (
        percentA: number
    ) => {
        const nextAShare = calculateShareA(
            amount,
            percentA
        );

        setAShare(nextAShare);
        setBShare(amount - nextAShare);
        setError("");
    };

    // 設定したデフォルト割合に戻す
    const handleResetShare = () => {
        const nextAShare = calculateShareA(
            amount,
            defaultSharePercentA
        );

        setAShare(nextAShare);
        setBShare(amount - nextAShare);
        setError("");
    };

    // 現在の負担割合
    const currentSharePercentA =
        amount > 0
            ? Math.round(aShare / amount * 100)
            : defaultSharePercentA;

    const currentSharePercentB =
        100 - currentSharePercentA;

    // 登録処理
    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            setError("支出金額を正しく入力してください。");
            return;
        }

        if (!date) {
            setError("支出日を入力してください。");
            return;
        }

        if (
            aShare < 0 ||
            bShare < 0 ||
            aShare + bShare !== amount
        ) {
            setError("負担額の合計が支出金額と一致しません。");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const expense = await addExpense({
                amount,
                date,
                payer,
                paymentMethod,
                category,
                shares: {
                    A: aShare,
                    B: bShare,
                },
            });

            // 登録した支出の詳細画面へ移動
            navigate(`/expenses/${expense.id}`);
        } catch (err) {
            console.error(err);

            setError(
                "支出の登録に失敗しました。"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 pb-8 text-moon">
            {/* タイトル */}
            <header>
                <p className="mb-2 text-xs tracking-[0.2em] text-gold">
                    NEW EXPENSE
                </p>

                <h1 className="font-serif text-2xl tracking-wider">
                    支出登録
                </h1>

                <p className="mt-2 text-sm text-mist">
                    ふたりの支出を記録しましょう
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >
                {/* 金額 */}
                <GlassCard>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                            <Wallet size={20} />
                        </div>

                        <div>
                            <h2 className="font-serif text-base">
                                支出金額
                            </h2>

                            <p className="mt-1 text-xs text-mist">
                                支払った金額を入力してください
                            </p>
                        </div>
                    </div>

                    <div className="relative">
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={amount || ""}
                            onChange={(event) =>
                                handleAmountChange(
                                    event.target.value
                                )
                            }
                            placeholder="0"
                            required
                            className={
                                inputClassName +
                                " pr-12 text-right text-2xl font-semibold tabular-nums"
                            }
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gold">
                            円
                        </span>
                    </div>
                </GlassCard>

                {/* 支出日 */}
                <GlassCard>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                            <CalendarDays size={20} />
                        </div>

                        <h2 className="font-serif text-base">
                            支出日
                        </h2>
                    </div>

                    <input
                        type="date"
                        value={date}
                        onChange={(event) =>
                            setDate(event.target.value)
                        }
                        required
                        className={inputClassName}
                    />
                </GlassCard>

                {/* 支払者 */}
                <GlassCard>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                            <Check size={20} />
                        </div>

                        <h2 className="font-serif text-base">
                            支払者
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {(
                            [
                                {
                                    value: "A" as Person,
                                    label: memberAName,
                                },
                                {
                                    value: "B" as Person,
                                    label: memberBName,
                                },
                            ]
                        ).map((member) => (
                            <button
                                key={member.value}
                                type="button"
                                onClick={() =>
                                    setPayer(member.value)
                                }
                                aria-pressed={
                                    payer === member.value
                                }
                                className={
                                    "min-h-12 min-w-0 rounded-xl border px-3 py-3 text-sm transition-colors " +
                                    (
                                        payer === member.value
                                            ? "border-gold/60 bg-gold/15 text-gold"
                                            : "border-gold/15 bg-night/40 text-mist hover:bg-gold/5"
                                    )
                                }
                            >
                                <span className="block truncate">
                                    {member.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </GlassCard>

                {/* 支払い方法 */}
                <GlassCard>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                            <CreditCard size={20} />
                        </div>

                        <h2 className="font-serif text-base">
                            支払い方法
                        </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {paymentMethods.map((method) => (
                            <button
                                key={method.value}
                                type="button"
                                onClick={() =>
                                    setPaymentMethod(
                                        method.value
                                    )
                                }
                                aria-pressed={
                                    paymentMethod === method.value
                                }
                                className={
                                    "min-h-12 rounded-xl border px-3 py-3 text-sm transition-colors " +
                                    (
                                        paymentMethod === method.value
                                            ? "border-gold/60 bg-gold/15 text-gold"
                                            : "border-gold/15 bg-night/40 text-mist hover:bg-gold/5"
                                    )
                                }
                            >
                                {method.label}
                            </button>
                        ))}
                    </div>
                </GlassCard>

                {/* カテゴリ */}
                <GlassCard>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                            <Wallet size={20} />
                        </div>

                        <h2 className="font-serif text-base">
                            カテゴリ
                        </h2>
                    </div>

                    <select
                        value={category}
                        onChange={(event) =>
                            setCategory(
                                event.target.value as Category
                            )
                        }
                        className={inputClassName}
                    >
                        {categories.map((item) => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </GlassCard>

                {/* 負担内訳 */}
                <GlassCard>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                            <Wallet size={20} />
                        </div>

                        <div>
                            <h2 className="font-serif text-base">
                                負担内訳
                            </h2>

                            <p className="mt-1 text-xs text-mist">
                                ふたりの負担額を調整できます
                            </p>
                        </div>
                    </div>

                    {/* 金額入力 */}
                    <div className="grid grid-cols-2 gap-3">
                        <label className="min-w-0">
                            <span className="block truncate text-xs text-gold">
                                {memberAName}
                            </span>

                            <div className="relative mt-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={amount}
                                    step={1}
                                    value={aShare}
                                    onChange={(event) =>
                                        handleAShareChange(
                                            event.target.value
                                        )
                                    }
                                    aria-label={`${memberAName}の負担額`}
                                    className={
                                        inputClassName +
                                        " pr-8 text-right tabular-nums"
                                    }
                                />

                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mist">
                                    円
                                </span>
                            </div>
                        </label>

                        <label className="min-w-0">
                            <span className="block truncate text-xs text-cyan-glow">
                                {memberBName}
                            </span>

                            <div className="relative mt-2">
                                <input
                                    type="number"
                                    min={0}
                                    max={amount}
                                    step={1}
                                    value={bShare}
                                    onChange={(event) =>
                                        handleBShareChange(
                                            event.target.value
                                        )
                                    }
                                    aria-label={`${memberBName}の負担額`}
                                    className={
                                        inputClassName +
                                        " pr-8 text-right tabular-nums"
                                    }
                                />

                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-mist">
                                    円
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* 負担割合 */}
                    <div className="mt-6">
                        <div className="mb-3 flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate text-gold">
                                {memberAName} {currentSharePercentA}%
                            </span>

                            <span className="min-w-0 truncate text-right text-cyan-glow">
                                {memberBName} {currentSharePercentB}%
                            </span>
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={currentSharePercentA}
                            onChange={(event) =>
                                handleShareSliderChange(
                                    Number(event.target.value)
                                )
                            }
                            disabled={amount <= 0}
                            aria-label={`${memberAName}の負担割合`}
                            className="w-full cursor-pointer accent-[#dcc397] disabled:cursor-not-allowed disabled:opacity-40"
                        />

                        <div className="mt-2 flex justify-between text-xs text-mist">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* リセット */}
                    <button
                        type="button"
                        onClick={handleResetShare}
                        className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold transition-colors hover:bg-gold/10"
                    >
                        <RotateCcw size={17} />
                        デフォルト割合に戻す
                        （{defaultSharePercentA}:
                        {100 - defaultSharePercentA}）
                    </button>

                    {/* 合計 */}
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-gold/15 pt-4">
                        <span className="text-sm text-mist">
                            負担額合計
                        </span>

                        <span className="text-lg font-semibold tabular-nums text-gold">
                            {formatYen(aShare + bShare)}
                        </span>
                    </div>
                </GlassCard>

                {/* エラー */}
                {error && (
                    <GlassCard>
                        <p
                            role="alert"
                            className="text-sm text-red-200"
                        >
                            {error}
                        </p>
                    </GlassCard>
                )}

                {/* 登録ボタン */}
                <GoldButton
                    type="submit"
                    disabled={isSubmitting}
                >
                    <span className="flex items-center justify-center gap-2">
                        <Save size={18} />
                        {isSubmitting
                            ? "登録中..."
                            : "支出を登録"}
                    </span>
                </GoldButton>
            </form>
        </div>
    );
}
