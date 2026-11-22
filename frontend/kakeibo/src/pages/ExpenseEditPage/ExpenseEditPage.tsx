import { useNavigate } from "react-router-dom";
import { useExpenses } from "../../contexts/ExpenseContext";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    Check,
    RotateCcw,
    Wallet,
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";

type Person = "A" | "B";

type PaymentMethod =
    | "cash"
    | "credit"
    | "debit"
    | "qr";

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
    payer: Person;
    paymentMethod: PaymentMethod;
    category: Category;
    shares: {
        A: number;
        B: number;
    };
};

const paymentMethods: Record<PaymentMethod, string> = {
    cash: "現金",
    credit: "クレジットカード",
    debit: "デビットカード",
    qr: "QRコード決済",
};

const categories: Record<Category, string> = {
    food: "食費",
    daily: "日用品",
    transport: "交通費",
    housing: "住居費",
    utilities: "水道・光熱費",
    entertainment: "娯楽",
    other: "その他",
};

const inputClass = [
    "block box-border w-full min-w-0 max-w-full",
    "min-h-12 rounded-xl",
    "border border-gold/25 bg-night/60",
    "px-3 py-3 text-base text-moon",
    "outline-none transition-colors",
    "focus:border-gold focus:ring-1 focus:ring-gold/40",
].join(" ");

function formatYen(value: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(value);
}

function parseAmount(value: string): number | null {
    if (!/^\d+$/.test(value)) return null;

    const number = Number(value);

    return Number.isSafeInteger(number) ? number : null;
}

function ExpenseEditForm({ expense }: { expense: Expense }) {
    const navigate = useNavigate();
    const { updateExpense } = useExpenses();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [amountInput, setAmountInput] = useState(
        String(expense.amount)
    );
    const [date, setDate] = useState(expense.date);
    const [payer, setPayer] = useState<Person>(expense.payer);
    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>(expense.paymentMethod);
    const [category, setCategory] =
        useState<Category>(expense.category);

    // nullなら50:50、数値文字列なら手動指定
    const [aShareInput, setAShareInput] = useState<string | null>(
        String(expense.shares.A)
    );

    const [editingShare, setEditingShare] =
        useState<Person | null>(null);
    const [draftShare, setDraftShare] = useState("");

    const parsedAmount = parseAmount(amountInput);
    const amount = parsedAmount ?? 0;

    const defaultAShare = Math.floor(amount / 2);
    const storedAShare =
        aShareInput === null
            ? defaultAShare
            : parseAmount(aShareInput) ?? defaultAShare;

    const aShare = Math.min(
        amount,
        Math.max(0, storedAShare)
    );
    const bShare = amount - aShare;

    const aPercent =
        amount > 0 ? (aShare / amount) * 100 : 50;
    const bPercent = 100 - aPercent;

    const isValid =
        parsedAmount !== null &&
        parsedAmount > 0 &&
        Boolean(date) &&
        editingShare === null;

    function handleAmountChange(value: string) {
        setAmountInput(value);
        setAShareInput(null);
        setEditingShare(null);
        setDraftShare("");
    }

    function changeAShare(value: number) {
        const nextA = Math.min(
            amount,
            Math.max(0, Math.trunc(value))
        );
        setAShareInput(String(nextA));
    }

    function changeBShare(value: number) {
        const nextB = Math.min(
            amount,
            Math.max(0, Math.trunc(value))
        );
        setAShareInput(String(amount - nextB));
    }

    function startEditing(person: Person) {
        setEditingShare(person);
        setDraftShare(
            String(person === "A" ? aShare : bShare)
        );
    }

    function commitEditing(person: Person) {
        const parsed = parseAmount(draftShare);

        if (parsed !== null && parsed <= amount) {
            if (person === "A") {
                changeAShare(parsed);
            } else {
                changeBShare(parsed);
            }
        }

        setEditingShare(null);
        setDraftShare("");
    }

    function resetSplit() {
        setAShareInput(null);
        setEditingShare(null);
        setDraftShare("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!isValid || isSubmitting) return;

        setIsSubmitting(true);

        try {
            const updated = await updateExpense(expense.id, {
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

            if (!updated) {
                window.alert("更新対象の支出が見つかりません");
                return;
            }

            navigate(`/expenses/${expense.id}`);
        } catch (error) {
            console.error(error);
            window.alert("支出を更新できませんでした");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-5 pb-6 text-moon">
            <header className="flex items-center gap-3">
                <Link
                    to={`/expenses/${expense.id}`}
                    aria-label="支出詳細に戻る"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/25 text-gold hover:bg-gold/10"
                >
                    <ArrowLeft size={20} />
                </Link>

                <div>
                    <p className="text-xs tracking-widest text-gold">
                        EDIT EXPENSE
                    </p>
                    <h1 className="mt-1 font-serif text-2xl">
                        支出を編集
                    </h1>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 金額 */}
                <GlassCard>
                    <label
                        htmlFor="edit-amount"
                        className="mb-3 block text-sm text-gold"
                    >
                        支出金額
                    </label>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gold">
                            ¥
                        </span>
                        <input
                            id="edit-amount"
                            type="number"
                            inputMode="numeric"
                            min="1"
                            step="1"
                            required
                            value={amountInput}
                            onChange={(e) =>
                                handleAmountChange(e.target.value)
                            }
                            className={`${inputClass} pl-12 text-right text-3xl font-semibold`}
                        />
                    </div>
                </GlassCard>

                {/* 支出情報 */}
                <GlassCard>
                    <div className="space-y-5">
                        <div className="min-w-0">
                            <label
                                htmlFor="edit-date"
                                className="mb-2 flex items-center gap-2 text-sm text-gold"
                            >
                                <CalendarDays size={16} />
                                日付
                            </label>

                            <input
                                id="edit-date"
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className={inputClass}
                                style={{
                                    colorScheme: "dark",
                                    WebkitAppearance: "none",
                                }}
                            />
                        </div>

                        <fieldset>
                            <legend className="mb-3 text-sm text-gold">
                                支払者
                            </legend>

                            <div className="grid grid-cols-2 gap-3">
                                {(["A", "B"] as const).map((person) => (
                                    <button
                                        key={person}
                                        type="button"
                                        aria-pressed={payer === person}
                                        onClick={() => setPayer(person)}
                                        className={[
                                            "min-h-12 rounded-xl border font-medium",
                                            "transition-colors",
                                            payer === person
                                                ? "border-gold bg-gold/15 text-gold"
                                                : "border-white/15 bg-night/40 text-mist",
                                        ].join(" ")}
                                    >
                                        {person}さん
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <div>
                            <label
                                htmlFor="edit-payment"
                                className="mb-2 flex items-center gap-2 text-sm text-gold"
                            >
                                <Wallet size={16} />
                                支払方法
                            </label>

                            <select
                                id="edit-payment"
                                value={paymentMethod}
                                onChange={(e) =>
                                    setPaymentMethod(
                                        e.target.value as PaymentMethod
                                    )
                                }
                                className={inputClass}
                            >
                                {Object.entries(paymentMethods).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div>
                            <label
                                htmlFor="edit-category"
                                className="mb-2 block text-sm text-gold"
                            >
                                カテゴリ
                            </label>

                            <select
                                id="edit-category"
                                value={category}
                                onChange={(e) =>
                                    setCategory(e.target.value as Category)
                                }
                                className={inputClass}
                            >
                                {Object.entries(categories).map(
                                    ([value, label]) => (
                                        <option key={value} value={value}>
                                            {label}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>
                    </div>
                </GlassCard>

                {/* 負担内訳 */}
                <GlassCard>
                    <h2 className="font-serif text-lg text-gold">
                        ふたりの負担内訳
                    </h2>
                    <p className="mb-6 mt-2 text-xs text-mist">
                        片方の金額を変更すると、もう片方を自動計算します
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0">
                            <label
                                htmlFor="edit-share-a"
                                className="mb-2 block text-sm text-gold"
                            >
                                Aさんの負担額
                            </label>

                            <input
                                id="edit-share-a"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max={amount}
                                step="1"
                                value={
                                    editingShare === "A"
                                        ? draftShare
                                        : String(aShare)
                                }
                                onFocus={() => startEditing("A")}
                                onChange={(e) =>
                                    setDraftShare(e.target.value)
                                }
                                onBlur={() => commitEditing("A")}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        e.currentTarget.blur();
                                    }
                                }}
                                className={`${inputClass} text-right font-semibold`}
                            />
                        </div>

                        <div className="min-w-0">
                            <label
                                htmlFor="edit-share-b"
                                className="mb-2 block text-sm text-cyan-glow"
                            >
                                Bさんの負担額
                            </label>

                            <input
                                id="edit-share-b"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                max={amount}
                                step="1"
                                value={
                                    editingShare === "B"
                                        ? draftShare
                                        : String(bShare)
                                }
                                onFocus={() => startEditing("B")}
                                onChange={(e) =>
                                    setDraftShare(e.target.value)
                                }
                                onBlur={() => commitEditing("B")}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        e.currentTarget.blur();
                                    }
                                }}
                                className={`${inputClass} text-right font-semibold`}
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex justify-between text-sm">
                        <span>Aさん {aPercent.toFixed(1)}%</span>
                        <span>Bさん {bPercent.toFixed(1)}%</span>
                    </div>

                    <div
                        aria-hidden="true"
                        className="mt-3 flex h-2 overflow-hidden rounded-full"
                    >
                        <div
                            className="bg-gold"
                            style={{ width: `${aPercent}%` }}
                        />
                        <div className="flex-1 bg-cyan-glow" />
                    </div>

                    <input
                        type="range"
                        min="0"
                        max={Math.max(1, amount)}
                        step="1"
                        value={aShare}
                        disabled={amount === 0 || editingShare !== null}
                        aria-label="Aさんの負担額を調整"
                        onChange={(e) =>
                            changeAShare(Number(e.target.value))
                        }
                        className="mt-4 w-full accent-gold disabled:opacity-40"
                    />

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="min-w-0 rounded-xl bg-gold/10 p-3">
                            <p className="text-xs text-gold">
                                Aさんの負担
                            </p>
                            <p className="mt-2 break-all text-lg font-semibold">
                                {formatYen(aShare)}
                            </p>
                        </div>

                        <div className="min-w-0 rounded-xl bg-cyan-glow/10 p-3">
                            <p className="text-xs text-cyan-glow">
                                Bさんの負担
                            </p>
                            <p className="mt-2 break-all text-lg font-semibold">
                                {formatYen(bShare)}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={resetSplit}
                        className="mt-5 flex items-center gap-2 text-sm text-mist hover:text-gold"
                    >
                        <RotateCcw size={15} />
                        50：50に戻す
                    </button>
                </GlassCard>

                <GoldButton
                    type="submit"
                    disabled={!isValid || isSubmitting}
                >
                    <Check size={20} />
                    {isSubmitting ? "更新中..." : "変更内容を保存"}
                </GoldButton>

                <Link
                    to={`/expenses/${expense.id}`}
                    className="flex min-h-12 items-center justify-center rounded-xl border border-white/20 text-mist hover:bg-white/5"
                >
                    キャンセル
                </Link>
            </form>
        </div>
    );
}

export default function ExpenseEditPage() {
    const { id } = useParams<{ id: string }>();
    const {
        getExpenseById,
        isLoading,
        loadError,
    } = useExpenses();

    const expense = id
        ? getExpenseById(id)
        : undefined;

    if (isLoading) {
        return (
            <div
                role="status"
                className="mx-auto max-w-xl py-12 text-center text-mist"
            >
                支出データを読み込み中...
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mx-auto max-w-xl py-12 text-center">
                <p role="alert" className="text-red-200">
                    {loadError}
                </p>

                <Link
                    to="/expenses"
                    className="mt-6 inline-block text-gold underline"
                >
                    支出一覧に戻る
                </Link>
            </div>
        );
    }

    if (!expense) {
        return (
            <div className="mx-auto w-full max-w-xl text-moon">
                <GlassCard>
                    <div className="py-8 text-center">
                        <h1 className="font-serif text-xl">
                            支出が見つかりません
                        </h1>
                        <p className="mt-3 text-sm text-mist">
                            指定された支出は存在しません。
                        </p>
                        <Link
                            to="/expenses"
                            className="mt-6 inline-block text-gold underline"
                        >
                            支出一覧に戻る
                        </Link>
                    </div>
                </GlassCard>
            </div>
        );
    }

    return <ExpenseEditForm key={expense.id} expense={expense} />;
}
