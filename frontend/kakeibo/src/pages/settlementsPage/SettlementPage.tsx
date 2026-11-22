
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowRight,
    CheckCircle2,
    History,
    MoonStar,
    RefreshCw,
    Trash2,
    Wallet,
} from "lucide-react";

import {
    fetchBalance,
    type BalanceResponse,
} from "../../api/balance";

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
    const {
        expenses,
        expenseRevision,
        isLoading: expensesLoading,
        loadError: expensesError,
    } = useExpenses();

    const {
        settlements,
        isLoading: settlementsLoading,
        loadError: settlementsError,
        addSettlement,
        deleteSettlement,
    } = useSettlements();

    const { settings } = useSettings();

    const [amountInput, setAmountInput] = useState("");
    const [date, setDate] = useState(getLocalDate);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [apiBalance, setApiBalance] =
        useState<BalanceResponse | null>(null);

    const [balanceLoading, setBalanceLoading] = useState(true);
    const [balanceError, setBalanceError] =
        useState<string | null>(null);

    // 残高取得リクエストの管理
    const balanceControllerRef =
        useRef<AbortController | null>(null);

    const balanceRequestIdRef = useRef(0);

    const balance = useMemo(() => {
        if (!apiBalance) {
            return {
                from: null,
                to: null,
                amount: 0,
                signedBalance: 0,
            };
        }

        return {
            from: apiBalance.fromPerson,
            to: apiBalance.toPerson,
            amount: apiBalance.amount,
            signedBalance:
                apiBalance.fromPerson === "B"
                    ? apiBalance.amount
                    : apiBalance.fromPerson === "A"
                        ? -apiBalance.amount
                        : 0,
        };
    }, [apiBalance]);

    // 残高を取得する共通処理
    const refreshBalance = async (): Promise<boolean> => {
        // 前のリクエストを中断
        balanceControllerRef.current?.abort();

        const controller = new AbortController();
        balanceControllerRef.current = controller;

        const requestId = ++balanceRequestIdRef.current;

        setBalanceLoading(true);
        setBalanceError(null);

        try {
            const data = await fetchBalance(controller.signal);

            if (
                controller.signal.aborted ||
                requestId !== balanceRequestIdRef.current
            ) {
                return false;
            }

            setApiBalance(data);
            return true;
        } catch (error) {
            if (
                controller.signal.aborted ||
                requestId !== balanceRequestIdRef.current
            ) {
                return false;
            }

            console.error(
                "残高の取得に失敗しました",
                error,
            );

            setApiBalance(null);
            setBalanceError(
                "未精算残高を取得できませんでした",
            );

            return false;
        } finally {
            if (
                !controller.signal.aborted &&
                requestId === balanceRequestIdRef.current
            ) {
                setBalanceLoading(false);
                balanceControllerRef.current = null;
            }
        }
    };

    // 初回表示および支出変更時に残高を再取得
    useEffect(() => {
        if (expensesLoading || settlementsLoading) {
            return;
        }

        if (expensesError || settlementsError) {
            return;
        }

        void refreshBalance();

        return () => {
            balanceControllerRef.current?.abort();
            balanceControllerRef.current = null;
        };

        // expenseRevisionが変わったときに再取得する
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        expenseRevision,
        expensesLoading,
        settlementsLoading,
        expensesError,
        settlementsError,
    ]);

    // 手動で残高を再取得
    const handleRefreshBalance = async () => {
        if (
            balanceLoading ||
            isSubmitting ||
            deletingId !== null
        ) {
            return;
        }

        setError("");
        setSuccess("");

        await refreshBalance();
    };

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

    // 精算登録
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (
            isSubmitting ||
            deletingId !== null ||
            balanceLoading ||
            balanceError ||
            !apiBalance
        ) {
            return;
        }

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
            setError(
                "精算日には今日以前の日付を指定してください",
            );
            return;
        }

        // 指定日時点の残高を検証
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

        setIsSubmitting(true);

        try {
            await addSettlement({
                date,
                from: balance.from,
                to: balance.to,
                amount: selectedAmount,
            });

            setAmountInput("");

            const refreshed = await refreshBalance();

            if (refreshed) {
                setSuccess("精算を記録しました");
            } else {
                setSuccess(
                    "精算を記録しましたが、残高の更新に失敗しました",
                );
            }
        } catch (error) {
            console.error(error);
            setError("精算の登録に失敗しました");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 精算履歴削除
    const handleDelete = async (id: string) => {
        if (
            deletingId !== null ||
            isSubmitting ||
            balanceLoading
        ) {
            return;
        }

        if (!window.confirm("この精算履歴を削除しますか？")) {
            return;
        }

        setDeletingId(id);
        setError("");
        setSuccess("");

        try {
            await deleteSettlement(id);

            const refreshed = await refreshBalance();

            if (refreshed) {
                setSuccess("精算履歴を削除しました");
            } else {
                setSuccess(
                    "精算履歴を削除しましたが、残高の更新に失敗しました",
                );
            }
        } catch (error) {
            console.error(error);
            setError("精算履歴の削除に失敗しました");
        } finally {
            setDeletingId(null);
        }
    };

    if (expensesLoading || settlementsLoading) {
        return (
            <div
                role="status"
                className="mx-auto max-w-2xl py-12 text-center text-mist"
            >
                精算データを読み込み中...
            </div>
        );
    }

    if (expensesError || settlementsError) {
        return (
            <div className="mx-auto max-w-2xl py-12 text-center">
                <p role="alert" className="text-red-300">
                    {expensesError || settlementsError}
                </p>
            </div>
        );
    }

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
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-gold">
                        <Wallet size={18} />
                        <span className="text-sm">
                            現在の未精算額
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            void handleRefreshBalance()
                        }
                        disabled={
                            balanceLoading ||
                            isSubmitting ||
                            deletingId !== null
                        }
                        aria-label="未精算残高を再取得"
                        title="最新の残高を取得"
                        className="flex items-center gap-2 rounded-lg border border-gold/20 px-3 py-2 text-xs text-gold transition hover:border-gold/50 hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <RefreshCw
                            size={15}
                            className={
                                balanceLoading
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        <span>
                            {balanceLoading
                                ? "取得中..."
                                : "再取得"}
                        </span>
                    </button>
                </div>

                {balanceLoading ? (
                    <p
                        role="status"
                        className="mt-6 text-center text-sm text-mist"
                    >
                        未精算残高を取得中...
                    </p>
                ) : balanceError || !apiBalance ? (
                    <p
                        role="alert"
                        className="mt-6 text-center text-sm text-red-300"
                    >
                        {balanceError ||
                            "未精算残高を取得できませんでした"}
                    </p>
                ) : (
                    <>
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
                                <span>
                                    すべて精算済みです
                                </span>
                            </div>
                        )}
                    </>
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

                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >

                    <div className="min-w-0 space-y-2">
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
                            className="block w-full min-w-0 max-w-full box-border rounded-xl border border-gold/20 bg-night/70 px-4 py-3 text-moon outline-none focus:border-gold/70"
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
                                    setAmountInput(
                                        event.target.value,
                                    );
                                    setError("");
                                    setSuccess("");
                                }}
                                placeholder="金額を入力"
                                disabled={
                                    balanceLoading ||
                                    balance.amount === 0 ||
                                    !!balanceError ||
                                    !apiBalance ||
                                    isSubmitting ||
                                    deletingId !== null
                                }
                                required
                                className="min-w-0 flex-1 rounded-xl border border-gold/20 bg-night/70 px-4 py-3 text-moon outline-none placeholder:text-mist/50 focus:border-gold/70 disabled:opacity-50"
                            />

                            <button
                                type="button"
                                onClick={handleSetFullAmount}
                                disabled={
                                    balanceLoading ||
                                    balance.amount === 0 ||
                                    !!balanceError ||
                                    !apiBalance ||
                                    isSubmitting ||
                                    deletingId !== null
                                }
                                className="rounded-xl border border-gold/40 px-4 text-sm text-gold transition hover:bg-gold/10 disabled:opacity-40"
                            >
                                全額
                            </button>
                        </div>

                        <p className="text-xs text-mist">
                            一部精算もできます
                        </p>
                    </div>

                    {!balanceLoading &&
                        apiBalance &&
                        !balanceError &&
                        balance.amount > 0 && (
                            <div className="rounded-xl bg-night/50 p-4 text-center text-sm text-moon">
                                {getName(balance.from)}
                                <span className="mx-2 text-gold">
                                    →
                                </span>
                                {getName(balance.to)}

                                <p className="mt-2 text-xs text-mist">
                                    実際に送金した金額を記録します
                                </p>
                            </div>
                        )}

                    {error && (
                        <p
                            role="alert"
                            className="text-sm text-red-300"
                        >
                            {error}
                        </p>
                    )}

                    {success && (
                        <p
                            role="status"
                            className="text-sm text-cyan-glow"
                        >
                            {success}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            balanceLoading ||
                            balance.amount === 0 ||
                            isSubmitting ||
                            deletingId !== null ||
                            !!balanceError ||
                            !apiBalance
                        }
                        className="w-full rounded-xl border border-gold/50 bg-gradient-to-r from-[#bfa47a] via-[#e6d1a9] to-[#bfa47a] px-5 py-4 font-medium tracking-wider text-night transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isSubmitting
                            ? "登録中..."
                            : "精算を記録する"}
                    </button>
                </form>
            </section>

            {/* 精算履歴 */}
            <section className="rounded-2xl border border-gold/20 bg-night-light/70 p-5 backdrop-blur-xl">
                <div className="mb-5 flex items-center gap-2">
                    <History
                        size={19}
                        className="text-gold"
                    />
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
                                        {settlement.date.replaceAll(
                                            "-",
                                            "/",
                                        )}
                                    </p>

                                    <div className="flex items-center gap-2 text-sm text-moon">
                                        <span>
                                            {getName(
                                                settlement.from,
                                            )}
                                        </span>
                                        <ArrowRight
                                            size={15}
                                            className="shrink-0 text-gold"
                                        />
                                        <span>
                                            {getName(
                                                settlement.to,
                                            )}
                                        </span>
                                    </div>

                                    <p className="font-medium text-gold">
                                        {formatYen(
                                            settlement.amount,
                                        )}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        void handleDelete(
                                            settlement.id,
                                        )
                                    }
                                    disabled={
                                        deletingId !== null ||
                                        isSubmitting ||
                                        balanceLoading
                                    }
                                    aria-label="精算履歴を削除"
                                    className="rounded-lg p-3 text-mist transition hover:bg-red-400/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
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
