
import { useNavigate } from "react-router-dom";
import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    CreditCard,
    Pencil,
    Trash2,
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
    food: { label: "食費", icon: Utensils },
    daily: { label: "日用品", icon: ShoppingBasket },
    transport: { label: "交通費", icon: TrainFront },
    housing: { label: "住居費", icon: House },
    utilities: { label: "水道・光熱費", icon: Zap },
    entertainment: { label: "娯楽", icon: Clapperboard },
    other: { label: "その他", icon: Wallet },
};

const paymentMethodLabels: Record<string, string> = {
    cash: "現金",
    credit: "クレジットカード",
    debit: "デビットカード",
    qr: "QRコード決済",
};

function formatYen(value: number): string {
    return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
    }).format(value);
}

function formatDate(value: string): string {
    const [year, month, day] = value.split("-").map(Number);
    return `${year}年${month}月${day}日`;
}

export default function ExpenseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");
    const navigate = useNavigate();

    const { settings } = useSettings();
    const memberNames = settings.memberNames;

    const {
        getExpenseById,
        deleteExpense,
        isLoading,
        loadError,
    } = useExpenses();

    const expense = id
        ? getExpenseById(id)
        : undefined;

    async function handleDelete() {
        if (!expense || isDeleting) return;

        setIsDeleting(true);
        setDeleteError("");

        try {
            await deleteExpense(expense.id);

            navigate("/expenses", { replace: true });
        } catch (error) {
            console.error("支出削除に失敗:", error);
            setDeleteError("支出の削除に失敗しました。");
            setIsDeleting(false);
        }
    }

    if (isLoading) {
        return (
            <div className="mx-auto w-full max-w-xl text-moon">
                <GlassCard>
                    <p
                        role="status"
                        className="py-8 text-center text-sm text-mist"
                    >
                        支出データを読み込み中...
                    </p>
                </GlassCard>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="mx-auto w-full max-w-xl text-moon">
                <GlassCard>
                    <div className="py-8 text-center">
                        <p role="alert" className="text-sm text-red-200">
                            {loadError}
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

    const category = categoryConfig[expense.category];
    const CategoryIcon = category.icon;

    const aPercent =
        expense.amount > 0
            ? (expense.shares.A / expense.amount) * 100
            : 0;

    const bPercent = 100 - aPercent;

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-5 pb-6 text-moon">
            {/* ヘッダー */}
            <header className="flex items-center gap-3">
                <Link
                    to="/expenses"
                    aria-label="支出一覧に戻る"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/25 text-gold hover:bg-gold/10"
                >
                    <ArrowLeft size={20} />
                </Link>

                <div>
                    <p className="text-xs tracking-widest text-gold">
                        EXPENSE DETAIL
                    </p>

                    <h1 className="mt-1 font-serif text-2xl">
                        支出詳細
                    </h1>
                </div>
            </header>

            {/* 支出情報 */}
            <GlassCard>
                <div className="flex flex-col items-center">
                    <div className="flex size-16 items-center justify-center rounded-full bg-gold/10 text-gold">
                        <CategoryIcon size={30} />
                    </div>

                    <p className="mt-4 text-sm text-mist">
                        {category.label}
                    </p>

                    <p className="mt-2 max-w-full break-all text-3xl font-semibold tracking-wide">
                        {formatYen(expense.amount)}
                    </p>
                </div>

                <div className="mt-6 space-y-5 border-t border-gold/20 pt-6">
                    <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-mist">
                            <CalendarDays size={16} />
                            日付
                        </span>

                        <span className="text-right text-sm">
                            {formatDate(expense.date)}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-mist">
                            支払者
                        </span>

                        <span className="text-sm">
                            {memberNames[expense.payer]}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-sm text-mist">
                            <CreditCard size={16} />
                            支払方法
                        </span>

                        <span className="text-right text-sm">
                            {paymentMethodLabels[expense.paymentMethod] ??
                                expense.paymentMethod}
                        </span>
                    </div>
                </div>
            </GlassCard>

            {/* 負担内訳 */}
            <GlassCard>
                <h2 className="font-serif text-lg text-gold">
                    ふたりの負担内訳
                </h2>

                <div
                    aria-hidden="true"
                    className="mt-5 flex h-2 overflow-hidden rounded-full"
                >
                    <div
                        className="bg-gold"
                        style={{ width: `${aPercent}%` }}
                    />
                    <div className="flex-1 bg-cyan-glow" />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="min-w-0 rounded-xl bg-gold/10 p-3">
                        <p className="text-xs text-mist">
                            {memberNames.A} {aPercent.toFixed(1)}%
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-gold">
                            {formatYen(expense.shares.A)}
                        </p>
                    </div>

                    <div className="min-w-0 rounded-xl bg-cyan-glow/10 p-3">
                        <p className="text-xs text-mist">
                            {memberNames.B} {bPercent.toFixed(1)}%
                        </p>

                        <p className="mt-2 break-all text-lg font-semibold text-cyan-glow">
                            {formatYen(expense.shares.B)}
                        </p>
                    </div>
                </div>

                <div className="mt-5 flex justify-between border-t border-white/10 pt-4 text-sm">
                    <span className="text-mist">負担額合計</span>
                    <span className="font-semibold">
                        {formatYen(expense.shares.A + expense.shares.B)}
                    </span>
                </div>
            </GlassCard>

            {/* 編集ボタン */}
            <Link
                to={`/expenses/${expense.id}/edit`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#f0dcad] bg-gradient-to-r from-[#b9a079] via-[#f0dcad] to-[#b9a079] px-5 py-3 font-semibold text-[#182235] hover:brightness-110"
            >
                <Pencil size={18} />
                編集する
            </Link>

            {/* 削除ボタン */}
            <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-400/5 text-red-300 hover:bg-red-400/10"
            >
                <Trash2 size={18} />
                削除する
            </button>

            {/* 削除確認ダイアログ */}
            {showDeleteDialog && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
                    role="presentation"
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-title"
                        aria-describedby="delete-description"
                        className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[#142238] p-6 shadow-2xl"
                    >
                        <h2
                            id="delete-title"
                            className="font-serif text-xl text-moon"
                        >
                            支出を削除しますか？
                        </h2>

                        <p
                            id="delete-description"
                            className="mt-3 text-sm leading-relaxed text-mist"
                        >
                            {formatYen(expense.amount)} の支出を
                            削除しようとしています。
                            この操作は取り消せません。
                        </p>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setShowDeleteDialog(false)}
                                disabled={isDeleting}
                                className="min-h-12 rounded-xl border border-white/20 text-moon disabled:opacity-50"
                            >
                                キャンセル
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleDelete()}
                                disabled={isDeleting}
                                className="min-h-12 rounded-xl bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-50"
                            >
                                {isDeleting ? "削除中..." : "削除する"}
                            </button>
                        </div>

                        {deleteError && (
                            <p
                                role="alert"
                                className="mt-4 text-sm text-red-200"
                            >
                                {deleteError}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
