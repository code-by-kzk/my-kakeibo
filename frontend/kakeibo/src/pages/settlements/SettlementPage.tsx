import { useMemo, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    History,
    MoonStar,
    Trash2,
    Wallet,
} from "lucide-react";

import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useSettlements } from "../../contexts/SettlementContext";

import { calculateSettlementBalance } from "../../utils/settlementCalculator";

import type { Person } from "../../types/expense";

const formatYen = (amount: number) =>
    `¥${amount.toLocaleString("ja-JP")}`;

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export default function SettlementPage() {
    const { expenses } = useExpenses();
    const { settlements, addSettlement, deleteSettlement } =
        useSettlements();
    const { settings } = useSettings();

    const [amountInput, setAmountInput] = useState("");
    const [date, setDate] = useState(getLocalDate);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const balance = useMemo(
        () => calculateSettlementBalance(expenses, settlements),
        [expenses, settlements],
    );

    const getName = (person: Person | null) => {
        if (!person) return "―";
        return settings.memberNames[person];
    };

    const history = useMemo(
        () =>
            [...settlements].sort(
                (a, b) =>
                    b.date.localeCompare(a.date) ||
                    b.id.localeCompare(a.id),
            ),
        [settlements],
    );

    const selectedAmount = Number(amountInput);

    const handleSetFullAmount = () => {
        setAmountInput(String(balance.amount));
        setError("");
        setSuccess("");
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!balance.from || !balance.to) {
            setError("現在、精算が必要な金額はありません");
            return;
        }

        if (
            !Number.isSafeInteger(selectedAmount) ||
            selectedAmount <= 0
        ) {
            setError("精算金額を正しく入力してください");
            return;
        }

        if (selectedAmount > balance.amount) {
            setError("未精算額を超える金額は登録できません");
            return;
        }

        if (!date || date > getLocalDate()) {
            setError("精算日には今日以前の日付を指定してください");
            return;
        }

        // 過去の日付で精算を記録する場合、
        // その日時点の残高も確認する
        const balanceOnDate = calculateSettlementBalance(
            expenses,
            settlements,
            date,
        );

        if (
            balanceOnDate.from !== balance.from ||
            balanceOnDate.to !== balance.to ||
            selectedAmount > balanceOnDate.amount
        ) {
            setError(
                "指定日時点の未精算残高では登録できません。精算日と金額を確認してください",
            );
            return;
        }

        try {
            addSettlement({
                date,
                from: balance.from,
                to: balance.to,
                amount: selectedAmount,
            });

            setAmountInput("");
            setSuccess("精算を記録しました");
        } catch {
            setError("精算の登録に失敗しました");
        }
    };

    const handleDelete = (id: string) => {
        if (!window.confirm("この精算履歴を削除しますか？")) {
            return;
        }

        deleteSettlement(id);
        setSuccess("精算履歴を削除しました");
        setError("");
    };

    return (
        <div className="mx-auto max-w-2xl space-y-6 pb-8">
            {/* タイトル */}
            <div className="space-y-2 text-center">
                <div className="flex items-center justify-center gap-2 text-gold">
                    <MoonStar size={20} />
                    <span className="text-xs tracking-[0.3em]">
                        SETTLEMENT
                    </span>
                </div>

                <h2 className="font-serif text-2xl tracking-widest text-moon">
                    ふたりの精算
                </h2>

                <p className="text-sm text-mist">
                    立て替えたお金を、ふたりで管理
                </p>
            </div>

            {/* 未精算残高 */}
            <section className="rounded-2xl border border-gold/30 bg-night-light/80 p-6 shadow-[0_0_35px_rgba(220,195,151,0.07)] backdrop-blur-xl">
                <div className="flex items-center justify-center gap-2 text-gold">
                    <Wallet size={18} />
                    <span className="text-sm">現在の未精算額</span>
                </div>

                <p className="mt-5 text-center font-serif text-4xl tracking-wider text-gold">
                    {formatYen(balance.amount)}
                </p>

                {balance.amount > 0 ? (
                    <div className="mt-5 flex items-center justify-center gap-4 text-moon">
                        <span className="text-lg">
                            {getName(balance.from)}
                        </span>

                        <ArrowRight
                            size={22}
                            className="text-gold"
                        />

                        <span className="text-lg">
                            {getName(balance.to)}
                        </span>
                    </div>
                ) : (
                    <div className="mt-5 flex items-center justify-center gap-2 text-cyan-glow">
                        <CheckCircle2 size={19} />
                        <span>すべて精算済みです</span>
                    </div>
                )}

                <p className="mt-5 text-center text-xs leading-relaxed text-mist">
                    未精算額は翌月以降も自動で繰り越されます
                </p>
            </section>

            {/* 精算登録 */}
            <section className="rounded-2xl border border-gold/20 bg-night-light/70 p-5 backdrop-blur-xl">
                <h3 className="mb-5 font-serif text-lg text-moon">
                    精算を記録する
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label
                            htmlFor="settlement-date"
                            className="block text-sm text-mist"
                        >
                            精算日
                        </label>

                        <input
                            id="settlement-date"
                            type="date"
                            value={date}
                            max={getLocalDate()}
                            onChange={(event) => {
                                setDate(event.target.value);
                                setError("");
                                setSuccess("");
                            }}
                            required
                            className="w-full rounded-xl border border-gold/20 bg-night/70 px-4 py-3 text-moon outline-none focus:border-gold/70"
                        />
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="settlement-amount"
                            className="block text-sm text-mist"
                        >
                            精算金額
                        </label>

                        <div className="flex gap-2">
                            <input
                                id="settlement-amount"
                                type="number"
                                min="1"
                                max={balance.amount}
                                step="1"
                                value={amountInput}
                                onChange={(event) => {
                                    setAmountInput(event.target.value);
                                    setError("");
                                    setSuccess("");
                                }}
                                placeholder="金額を入力"
                                disabled={balance.amount === 0}
                                required
                                className="min-w-0 flex-1 rounded-xl border border-gold/20 bg-night/70 px-4 py-3 text-moon outline-none placeholder:text-mist/50 focus:border-gold/70 disabled:opacity-50"
                            />

                            <button
                                type="button"
                                onClick={handleSetFullAmount}
                                disabled={balance.amount === 0}
                                className="rounded-xl border border-gold/40 px-4 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-40"
                            >
                                全額
                            </button>
                        </div>

                        <p className="text-xs text-mist">
                            一部精算もできます
                        </p>
                    </div>

                    {balance.amount > 0 && (
                        <div className="rounded-xl bg-night/50 p-4 text-center text-sm text-moon">
                            {getName(balance.from)}
                            <span className="mx-2 text-gold">→</span>
                            {getName(balance.to)}
                            <p className="mt-2 text-xs text-mist">
                                実際に送金した金額を記録します
                            </p>
                        </div>
                    )}

                    {error && (
                        <p role="alert" className="text-sm text-red-300">
                            {error}
                        </p>
                    )}

                    {success && (
                        <p role="status" className="text-sm text-cyan-glow">
                            {success}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={balance.amount === 0}
                        className="w-full rounded-xl border border-gold/50 bg-gradient-to-r from-[#bfa47a] via-[#e6d1a9] to-[#bfa47a] px-5 py-4 font-medium tracking-wider text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        精算を記録する
                    </button>
                </form>
            </section>

            {/* 精算履歴 */}
            <section className="rounded-2xl border border-gold/20 bg-night-light/70 p-5 backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2">
                    <History size={19} className="text-gold" />
                    <h3 className="font-serif text-lg text-moon">
                        精算履歴
                    </h3>
                </div>

                {history.length === 0 ? (
                    <p className="py-8 text-center text-sm text-mist">
                        精算履歴はまだありません
                    </p>
                ) : (
                    <div className="space-y-3">
                        {history.map((settlement) => (
                            <div
                                key={settlement.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-night/50 p-4"
                            >
                                <div className="min-w-0 space-y-2">
                                    <p className="text-xs text-mist">
                                        {settlement.date.replaceAll("-", "/")}
                                    </p>

                                    <div className="flex items-center gap-2 text-sm text-moon">
                                        <span>{getName(settlement.from)}</span>
                                        <ArrowRight
                                            size={15}
                                            className="shrink-0 text-gold"
                                        />
                                        <span>{getName(settlement.to)}</span>
                                    </div>

                                    <p className="font-medium text-gold">
                                        {formatYen(settlement.amount)}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleDelete(settlement.id)}
                                    aria-label="精算履歴を削除"
                                    className="rounded-lg p-3 text-mist transition hover:bg-red-400/10 hover:text-red-300"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}