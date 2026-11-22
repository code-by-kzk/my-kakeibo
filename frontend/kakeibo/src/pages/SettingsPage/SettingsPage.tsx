
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Check,
    Fingerprint,
    House,
    Info,
    LogOut,
    Pencil,
    Plus,
    RotateCcw,
    Save,
    Settings2,
    ShieldCheck,
    Tags,
    Trash2,
    Users,
    X,
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";
import { useAuth } from "../../contexts/AuthContext";
import { useCategories } from "../../contexts/CategoryContext";
import { useExpenses } from "../../contexts/ExpenseContext";
import { useSettings } from "../../contexts/SettingsContext";

export default function SettingsPage() {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const {
        settings,
        isLoading,
        loadError,
        updateSettings,
        resetSettings,
    } = useSettings();

    const {
        categories,
        isLoading: categoriesLoading,
        loadError: categoriesError,
        addCategory,
        updateCategory,
        deleteCategory,
    } = useCategories();

    const { expenses } = useExpenses();

    // ========================================
    // 家計簿設定フォーム
    // ========================================

    const [householdName, setHouseholdName] = useState(
        settings.householdName,
    );

    const [memberAName, setMemberAName] = useState(
        settings.memberNames.A,
    );

    const [memberBName, setMemberBName] = useState(
        settings.memberNames.B,
    );

    const [defaultShareA, setDefaultShareA] = useState(
        settings.defaultSharePercentA,
    );

    // ========================================
    // 家計簿設定の通信状態
    // ========================================

    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [actionError, setActionError] = useState<
        string | null
    >(null);

    const [logoutError, setLogoutError] = useState<
        string | null
    >(null);

    const [saved, setSaved] = useState(false);

    const [showResetConfirm, setShowResetConfirm] =
        useState(false);

    const [showLogoutConfirm, setShowLogoutConfirm] =
        useState(false);

    // ========================================
    // カテゴリ管理
    // ========================================

    const [newCategoryName, setNewCategoryName] =
        useState("");

    const [editingCategoryId, setEditingCategoryId] =
        useState<string | null>(null);

    const [editingCategoryName, setEditingCategoryName] =
        useState("");

    const [deletingCategoryId, setDeletingCategoryId] =
        useState<string | null>(null);

    const [isCategorySaving, setIsCategorySaving] =
        useState(false);

    const [isCategoryDeleting, setIsCategoryDeleting] =
        useState(false);

    const [categoryActionError, setCategoryActionError] =
        useState<string | null>(null);

    const [categorySuccess, setCategorySuccess] =
        useState<string | null>(null);

    const isCategoryBusy =
        isCategorySaving || isCategoryDeleting;

    const isCategoryDisabled =
        categoriesLoading ||
        categoriesError !== null ||
        isCategoryBusy;

    const deletingCategory = categories.find(
        (category) => category.id === deletingCategoryId,
    );

    const deletingCategoryIsUsed = expenses.some(
        (expense) => expense.category === deletingCategoryId,
    );

    const clearCategoryMessages = () => {
        setCategoryActionError(null);
        setCategorySuccess(null);
    };

    const validateCategoryName = (
        value: string,
    ): string | null => {
        const name = value.trim();

        if (!name) {
            return "カテゴリ名を入力してください。";
        }

        if (Array.from(name).length > 50) {
            return "カテゴリ名は50文字以内で入力してください。";
        }

        const duplicated = categories.some(
            (category) =>
                category.name.toLocaleLowerCase() ===
                name.toLocaleLowerCase() &&
                category.id !== editingCategoryId,
        );

        if (duplicated) {
            return "同じ名前のカテゴリが存在します。";
        }

        return null;
    };

    const handleAddCategory = async (): Promise<void> => {
        if (isCategoryDisabled) {
            return;
        }

        const name = newCategoryName.trim();
        const error = validateCategoryName(name);

        if (error) {
            setCategoryActionError(error);
            setCategorySuccess(null);
            return;
        }

        setIsCategorySaving(true);
        clearCategoryMessages();

        try {
            await addCategory(name);

            setNewCategoryName("");
            setCategorySuccess(
                `「${name}」を追加しました。`,
            );
        } catch (error) {
            setCategoryActionError(
                error instanceof Error
                    ? error.message
                    : "カテゴリの追加に失敗しました。",
            );
        } finally {
            setIsCategorySaving(false);
        }
    };

    const handleStartCategoryEdit = (
        id: string,
        name: string,
    ) => {
        if (isCategoryDisabled) {
            return;
        }

        setEditingCategoryId(id);
        setEditingCategoryName(name);
        clearCategoryMessages();
    };

    const handleCancelCategoryEdit = () => {
        setEditingCategoryId(null);
        setEditingCategoryName("");
        clearCategoryMessages();
    };

    const handleUpdateCategory = async (): Promise<void> => {
        if (
            isCategoryDisabled ||
            editingCategoryId === null
        ) {
            return;
        }

        const name = editingCategoryName.trim();
        const error = validateCategoryName(name);

        if (error) {
            setCategoryActionError(error);
            setCategorySuccess(null);
            return;
        }

        setIsCategorySaving(true);
        clearCategoryMessages();

        try {
            await updateCategory(editingCategoryId, name);

            setEditingCategoryId(null);
            setEditingCategoryName("");

            setCategorySuccess(
                `カテゴリ名を「${name}」に変更しました。`,
            );
        } catch (error) {
            setCategoryActionError(
                error instanceof Error
                    ? error.message
                    : "カテゴリ名の変更に失敗しました。",
            );
        } finally {
            setIsCategorySaving(false);
        }
    };

    const handleDeleteCategory = async (): Promise<void> => {
        if (
            isCategoryDisabled ||
            deletingCategoryId === null
        ) {
            return;
        }

        if (deletingCategoryIsUsed) {
            setCategoryActionError(
                "支出で使用中のカテゴリは削除できません。",
            );
            setDeletingCategoryId(null);
            return;
        }

        const categoryName =
            deletingCategory?.name ?? "カテゴリ";

        setIsCategoryDeleting(true);
        clearCategoryMessages();

        try {
            await deleteCategory(deletingCategoryId);

            setDeletingCategoryId(null);

            setCategorySuccess(
                `「${categoryName}」を削除しました。`,
            );
        } catch (error) {
            setDeletingCategoryId(null);

            setCategoryActionError(
                error instanceof Error
                    ? error.message
                    : "カテゴリの削除に失敗しました。",
            );
        } finally {
            setIsCategoryDeleting(false);
        }
    };

    // ========================================
    // 家計簿設定
    // ========================================

    useEffect(() => {
        setHouseholdName(settings.householdName);
        setMemberAName(settings.memberNames.A);
        setMemberBName(settings.memberNames.B);
        setDefaultShareA(settings.defaultSharePercentA);
    }, [settings]);

    const hasChanges =
        householdName !== settings.householdName ||
        memberAName !== settings.memberNames.A ||
        memberBName !== settings.memberNames.B ||
        defaultShareA !== settings.defaultSharePercentA;

    const isBusy =
        isSaving || isResetting || isLoggingOut;

    const isFormDisabled =
        isLoading || loadError !== null || isBusy;

    const clearMessages = () => {
        setSaved(false);
        setActionError(null);
    };

    const handleSave = async (): Promise<void> => {
        if (isFormDisabled || !hasChanges) {
            return;
        }

        const trimmedHouseholdName = householdName.trim();
        const trimmedMemberAName = memberAName.trim();
        const trimmedMemberBName = memberBName.trim();

        if (
            !trimmedHouseholdName ||
            !trimmedMemberAName ||
            !trimmedMemberBName
        ) {
            setActionError(
                "すべての名前を入力してください。",
            );
            setSaved(false);
            return;
        }

        if (
            !Number.isFinite(defaultShareA) ||
            defaultShareA < 0 ||
            defaultShareA > 100
        ) {
            setActionError(
                "負担割合は0〜100%で指定してください。",
            );
            setSaved(false);
            return;
        }

        if (
            trimmedHouseholdName.length > 100 ||
            trimmedMemberAName.length > 50 ||
            trimmedMemberBName.length > 50
        ) {
            setActionError(
                "入力文字数が上限を超えています。",
            );
            setSaved(false);
            return;
        }

        setIsSaving(true);
        clearMessages();

        try {
            await updateSettings({
                householdName: trimmedHouseholdName,
                memberNames: {
                    A: trimmedMemberAName,
                    B: trimmedMemberBName,
                },
                defaultSharePercentA: defaultShareA,
            });

            setSaved(true);
        } catch {
            setActionError(
                "設定の保存に失敗しました。時間をおいて再度お試しください。",
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelChanges = () => {
        if (isFormDisabled) {
            return;
        }

        setHouseholdName(settings.householdName);
        setMemberAName(settings.memberNames.A);
        setMemberBName(settings.memberNames.B);
        setDefaultShareA(settings.defaultSharePercentA);

        clearMessages();
    };

    const handleReset = async (): Promise<void> => {
        if (isFormDisabled) {
            return;
        }

        setIsResetting(true);
        clearMessages();

        try {
            await resetSettings();

            setShowResetConfirm(false);
            setSaved(true);
        } catch {
            setActionError(
                "設定の初期化に失敗しました。再度お試しください。",
            );
        } finally {
            setIsResetting(false);
        }
    };

    const handleLogout = async (): Promise<void> => {
        if (isBusy) {
            return;
        }

        setIsLoggingOut(true);
        setLogoutError(null);

        try {
            await logout();

            setShowLogoutConfirm(false);

            navigate("/login", {
                replace: true,
            });
        } catch {
            setLogoutError(
                "ログアウトに失敗しました。通信状態を確認して再度お試しください。",
            );
        } finally {
            setIsLoggingOut(false);
        }
    };

    const handleShareChange = (value: number) => {
        if (isFormDisabled) {
            return;
        }

        setDefaultShareA(value);
        clearMessages();
    };

    // ========================================
    // 共通スタイル
    // ========================================

    const inputClassName =
        "mt-2 w-full min-w-0 rounded-xl " +
        "border border-gold/20 bg-night/60 " +
        "px-4 py-3 text-sm text-moon " +
        "placeholder:text-mist/50 " +
        "outline-none transition-colors " +
        "focus:border-gold/60 focus:ring-1 " +
        "focus:ring-gold/20 " +
        "disabled:cursor-not-allowed disabled:opacity-50";

    const smallButtonClassName =
        "flex min-h-10 items-center justify-center " +
        "gap-2 rounded-xl border border-gold/20 " +
        "px-3 py-2 text-sm text-mist " +
        "transition-colors hover:bg-gold/10 " +
        "hover:text-moon disabled:cursor-not-allowed " +
        "disabled:opacity-50";

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 pb-8 text-moon">
            {/* ========================================
                ページタイトル
            ======================================== */}

            <header>
                <p className="mb-2 text-xs tracking-[0.2em] text-gold">
                    SETTINGS
                </p>

                <h1 className="font-serif text-2xl tracking-wider">
                    設定
                </h1>

                <p className="mt-2 text-sm text-mist">
                    ふたりの家計簿を使いやすく整えましょう
                </p>
            </header>

            {/* 読み込み状態 */}

            {isLoading && (
                <div
                    role="status"
                    className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-mist"
                >
                    設定情報を読み込んでいます...
                </div>
            )}

            {/* 設定取得エラー */}

            {loadError && (
                <div
                    role="alert"
                    className="rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200"
                >
                    <p>{loadError}</p>

                    <p className="mt-2 text-xs">
                        設定を変更するには、API接続を確認して
                        ページを再読み込みしてください。
                    </p>
                </div>
            )}

            {/* ========================================
                家計簿の設定
            ======================================== */}

            <GlassCard>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <House size={20} />
                    </div>

                    <div>
                        <h2 className="font-serif text-base">
                            家計簿の設定
                        </h2>

                        <p className="mt-1 text-xs text-mist">
                            家計簿の名前を変更できます
                        </p>
                    </div>
                </div>

                <label className="block">
                    <span className="text-sm text-mist">
                        家計簿名
                    </span>

                    <input
                        type="text"
                        value={householdName}
                        onChange={(event) => {
                            setHouseholdName(
                                event.target.value,
                            );
                            clearMessages();
                        }}
                        disabled={isFormDisabled}
                        maxLength={50}
                        placeholder="ふたりの家計簿"
                        className={inputClassName}
                    />
                </label>
            </GlassCard>

            {/* ========================================
                メンバー設定
            ======================================== */}

            <GlassCard>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <Users size={20} />
                    </div>

                    <div>
                        <h2 className="font-serif text-base">
                            メンバー設定
                        </h2>

                        <p className="mt-1 text-xs text-mist">
                            ふたりの表示名を設定します
                        </p>
                    </div>
                </div>

                <div className="space-y-5">
                    <label className="block">
                        <span className="flex items-center gap-2 text-sm text-mist">
                            <span className="size-2 rounded-full bg-gold" />
                            メンバーA
                        </span>

                        <input
                            type="text"
                            value={memberAName}
                            onChange={(event) => {
                                setMemberAName(
                                    event.target.value,
                                );
                                clearMessages();
                            }}
                            disabled={isFormDisabled}
                            maxLength={30}
                            placeholder="Aさん"
                            className={inputClassName}
                        />
                    </label>

                    <label className="block">
                        <span className="flex items-center gap-2 text-sm text-mist">
                            <span className="size-2 rounded-full bg-cyan-glow" />
                            メンバーB
                        </span>

                        <input
                            type="text"
                            value={memberBName}
                            onChange={(event) => {
                                setMemberBName(
                                    event.target.value,
                                );
                                clearMessages();
                            }}
                            disabled={isFormDisabled}
                            maxLength={30}
                            placeholder="Bさん"
                            className={inputClassName}
                        />
                    </label>
                </div>

                <p className="mt-5 text-xs leading-relaxed text-mist/80">
                    表示名を変更しても、登録済みの支出データや
                    負担金額は変更されません。
                </p>
            </GlassCard>

            {/* ========================================
                デフォルト負担割合
            ======================================== */}

            <GlassCard>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <Settings2 size={20} />
                    </div>

                    <div>
                        <h2 className="font-serif text-base">
                            デフォルト負担割合
                        </h2>

                        <p className="mt-1 text-xs text-mist">
                            新しい支出を登録するときの初期割合
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="min-w-0 rounded-xl border border-gold/20 bg-gold/10 p-4">
                        <p className="truncate text-xs text-gold">
                            {memberAName || "メンバーA"}
                        </p>

                        <p className="mt-2 text-2xl font-semibold tabular-nums text-moon">
                            {defaultShareA}
                            <span className="ml-1 text-sm text-mist">
                                %
                            </span>
                        </p>
                    </div>

                    <div className="min-w-0 rounded-xl border border-cyan-glow/20 bg-cyan-glow/10 p-4">
                        <p className="truncate text-xs text-cyan-glow">
                            {memberBName || "メンバーB"}
                        </p>

                        <p className="mt-2 text-2xl font-semibold tabular-nums text-moon">
                            {100 - defaultShareA}
                            <span className="ml-1 text-sm text-mist">
                                %
                            </span>
                        </p>
                    </div>
                </div>

                <div className="mt-6">
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={defaultShareA}
                        disabled={isFormDisabled}
                        onChange={(event) =>
                            handleShareChange(
                                Number(event.target.value),
                            )
                        }
                        aria-label="メンバーAのデフォルト負担割合"
                        className="w-full cursor-pointer accent-[#dcc397] disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <div className="mt-2 flex justify-between text-xs text-mist">
                        <span>A 0%</span>
                        <span>50 : 50</span>
                        <span>A 100%</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => handleShareChange(50)}
                    disabled={isFormDisabled}
                    className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RotateCcw size={16} />
                    50 : 50 に戻す
                </button>

                <p className="mt-4 text-xs leading-relaxed text-mist/80">
                    この設定は新しく登録する支出の初期値にのみ適用されます。
                    登録済みの支出には影響しません。
                </p>
            </GlassCard>

            {/* ========================================
                カテゴリ管理
            ======================================== */}

            <GlassCard>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <Tags size={20} />
                    </div>

                    <div>
                        <h2 className="font-serif text-base">
                            支出カテゴリ
                        </h2>

                        <p className="mt-1 text-xs text-mist">
                            カテゴリの追加・編集・削除
                        </p>
                    </div>
                </div>

                <p className="mb-5 text-xs leading-relaxed text-mist/80">
                    ふたりで共通のカテゴリを使用します。
                    変更した内容は支出の登録や表示にも反映されます。
                </p>

                {categoriesLoading && (
                    <div
                        role="status"
                        className="mb-4 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-mist"
                    >
                        カテゴリを読み込んでいます...
                    </div>
                )}

                {categoriesError && (
                    <div
                        role="alert"
                        className="mb-4 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200"
                    >
                        {categoriesError}
                    </div>
                )}

                {categorySuccess && (
                    <div
                        role="status"
                        className="mb-4 flex items-center gap-2 rounded-xl border border-cyan-glow/20 bg-cyan-glow/10 px-4 py-3 text-sm text-cyan-glow"
                    >
                        <Check size={17} />
                        {categorySuccess}
                    </div>
                )}

                {categoryActionError && (
                    <div
                        role="alert"
                        className="mb-4 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200"
                    >
                        {categoryActionError}
                    </div>
                )}

                {/* カテゴリ一覧 */}

                {!categoriesLoading &&
                    !categoriesError && (
                        <div className="space-y-2">
                            {categories.map((category) => {
                                const isEditing =
                                    editingCategoryId ===
                                    category.id;

                                const isUsed = expenses.some(
                                    (expense) =>
                                        expense.category ===
                                        category.id,
                                );

                                return (
                                    <div
                                        key={category.id}
                                        className="rounded-xl border border-gold/15 bg-night/40 p-3"
                                    >
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <label className="block">
                                                    <span className="text-xs text-mist">
                                                        カテゴリ名
                                                    </span>

                                                    <input
                                                        type="text"
                                                        value={
                                                            editingCategoryName
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) => {
                                                            setEditingCategoryName(
                                                                event.target.value,
                                                            );
                                                            clearCategoryMessages();
                                                        }}
                                                        maxLength={50}
                                                        disabled={
                                                            isCategoryDisabled
                                                        }
                                                        className={
                                                            inputClassName
                                                        }
                                                    />
                                                </label>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleCancelCategoryEdit
                                                        }
                                                        disabled={
                                                            isCategoryBusy
                                                        }
                                                        className={
                                                            smallButtonClassName
                                                        }
                                                    >
                                                        <X size={15} />
                                                        キャンセル
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            void handleUpdateCategory()
                                                        }
                                                        disabled={
                                                            isCategoryDisabled ||
                                                            !editingCategoryName.trim() ||
                                                            editingCategoryName.trim() ===
                                                            category.name
                                                        }
                                                        className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gold px-3 py-2 text-sm font-semibold text-night disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        <Check size={15} />
                                                        保存
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex min-w-0 items-center justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="size-2 shrink-0 rounded-full bg-gold/70" />

                                                    <div className="min-w-0">
                                                        <p className="break-words text-sm text-moon">
                                                            {category.name}
                                                        </p>

                                                        {isUsed && (
                                                            <p className="mt-1 text-[11px] text-mist/70">
                                                                支出で使用中
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleStartCategoryEdit(
                                                                category.id,
                                                                category.name,
                                                            )
                                                        }
                                                        disabled={
                                                            isCategoryDisabled ||
                                                            editingCategoryId !==
                                                            null
                                                        }
                                                        aria-label={`${category.name}を編集`}
                                                        title="編集"
                                                        className="flex size-10 items-center justify-center rounded-lg text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <Pencil size={17} />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            clearCategoryMessages();
                                                            setDeletingCategoryId(
                                                                category.id,
                                                            );
                                                        }}
                                                        disabled={
                                                            isCategoryDisabled ||
                                                            isUsed ||
                                                            editingCategoryId !==
                                                            null
                                                        }
                                                        aria-label={`${category.name}を削除`}
                                                        title={
                                                            isUsed
                                                                ? "支出で使用中のため削除できません"
                                                                : "削除"
                                                        }
                                                        className="flex size-10 items-center justify-center rounded-lg text-red-200 transition-colors hover:bg-red-300/10 disabled:cursor-not-allowed disabled:opacity-30"
                                                    >
                                                        <Trash2 size={17} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {categories.length === 0 && (
                                <p className="py-4 text-center text-sm text-mist">
                                    カテゴリが登録されていません。
                                </p>
                            )}
                        </div>
                    )}

                {/* カテゴリ追加 */}

                <div className="mt-6 border-t border-gold/15 pt-5">
                    <h3 className="mb-3 text-sm font-medium text-moon">
                        新しいカテゴリを追加
                    </h3>

                    <label className="block">
                        <span className="text-xs text-mist">
                            カテゴリ名
                        </span>

                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(event) => {
                                setNewCategoryName(
                                    event.target.value,
                                );
                                clearCategoryMessages();
                            }}
                            disabled={isCategoryDisabled}
                            maxLength={50}
                            placeholder="例：医療費"
                            className={inputClassName}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={() =>
                            void handleAddCategory()
                        }
                        disabled={
                            isCategoryDisabled ||
                            editingCategoryId !== null ||
                            !newCategoryName.trim()
                        }
                        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus size={18} />
                        {isCategorySaving
                            ? "保存中..."
                            : "カテゴリを追加"}
                    </button>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-mist/70">
                    支出で使用中のカテゴリは削除できません。
                    カテゴリ名を変更しても、登録済みの支出は保持されます。
                </p>
            </GlassCard>

            {/* ========================================
                設定保存
            ======================================== */}

            <GlassCard>
                <div className="space-y-3">
                    {saved && (
                        <div
                            role="status"
                            className="flex items-center gap-2 rounded-xl border border-cyan-glow/20 bg-cyan-glow/10 px-4 py-3 text-sm text-cyan-glow"
                        >
                            <Check size={17} />
                            設定を保存しました
                        </div>
                    )}

                    {actionError && !showResetConfirm && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200"
                        >
                            {actionError}
                        </div>
                    )}

                    <GoldButton
                        type="button"
                        onClick={() =>
                            void handleSave()
                        }
                        disabled={
                            isFormDisabled || !hasChanges
                        }
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Save size={18} />
                            {isSaving
                                ? "保存中..."
                                : "設定を保存"}
                        </span>
                    </GoldButton>

                    {hasChanges && (
                        <button
                            type="button"
                            onClick={handleCancelChanges}
                            disabled={isFormDisabled}
                            className="min-h-11 w-full rounded-xl border border-gold/20 px-4 py-2 text-sm text-mist transition-colors hover:bg-gold/10 hover:text-moon disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            変更を取り消す
                        </button>
                    )}
                </div>
            </GlassCard>

            {/* ========================================
                セキュリティ
            ======================================== */}

            <GlassCard>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <ShieldCheck size={20} />
                    </div>

                    <div>
                        <h2 className="font-serif text-base">
                            セキュリティ
                        </h2>

                        <p className="mt-1 text-xs text-mist">
                            アカウントと認証の管理
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-gold/10 bg-night/40 p-4">
                    <Fingerprint
                        size={24}
                        className="shrink-0 text-gold"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                            パスキー認証
                        </p>

                        <p className="mt-1 text-xs text-mist">
                            パスキーによるログインに対応しています
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-gold/20 px-2 py-1 text-[10px] text-gold">
                        対応済み
                    </span>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-mist/80">
                    パスキーの追加・削除などの管理機能は、
                    今後実装する予定です。
                </p>
            </GlassCard>

            {/* ========================================
                その他
            ======================================== */}

            <GlassCard>
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                        <Info size={20} />
                    </div>

                    <div>
                        <h2 className="font-serif text-base">
                            その他
                        </h2>
                    </div>
                </div>

                <div className="flex items-center justify-between border-b border-gold/10 py-3">
                    <span className="text-sm text-mist">
                        アプリ名
                    </span>

                    <span className="text-sm">
                        ふたりの家計簿
                    </span>
                </div>

                <div className="flex items-center justify-between border-b border-gold/10 py-3">
                    <span className="text-sm text-mist">
                        バージョン
                    </span>

                    <span className="text-sm">
                        0.1.0
                    </span>
                </div>

                <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-mist">
                        データ保存
                    </span>

                    <span className="text-sm">
                        Neon PostgreSQL
                    </span>
                </div>
            </GlassCard>

            {/* ========================================
                設定リセット
            ======================================== */}

            <GlassCard>
                <button
                    type="button"
                    onClick={() => {
                        clearMessages();
                        setShowResetConfirm(true);
                    }}
                    disabled={isFormDisabled}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/20 px-4 py-3 text-sm text-mist transition-colors hover:bg-gold/10 hover:text-moon disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RotateCcw size={17} />
                    設定を初期値に戻す
                </button>

                <p className="mt-3 text-center text-xs text-mist/70">
                    登録済みの支出データは削除されません
                </p>
            </GlassCard>

            {/* ========================================
                ログアウト
            ======================================== */}

            <button
                type="button"
                onClick={() => {
                    setLogoutError(null);
                    setShowLogoutConfirm(true);
                }}
                disabled={isBusy}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200 transition-colors hover:bg-red-300/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <LogOut size={18} />
                ログアウト
            </button>

            {/* ========================================
                カテゴリ削除確認
            ======================================== */}

            {deletingCategoryId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="category-delete-dialog-title"
                        className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[#152238] p-6 shadow-2xl"
                    >
                        <h2
                            id="category-delete-dialog-title"
                            className="font-serif text-lg"
                        >
                            カテゴリを削除しますか？
                        </h2>

                        <p className="mt-3 text-sm leading-relaxed text-mist">
                            「{deletingCategory?.name ?? "カテゴリ"}」
                            を削除します。
                            この操作は取り消せません。
                        </p>

                        {deletingCategoryIsUsed && (
                            <p className="mt-3 text-sm text-red-200">
                                このカテゴリは支出で使用中のため、
                                削除できません。
                            </p>
                        )}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setDeletingCategoryId(null)
                                }
                                disabled={isCategoryDeleting}
                                className={smallButtonClassName}
                            >
                                キャンセル
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void handleDeleteCategory()
                                }
                                disabled={
                                    isCategoryDeleting ||
                                    deletingCategoryIsUsed
                                }
                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-300/15 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-300/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Trash2 size={16} />
                                {isCategoryDeleting
                                    ? "削除中..."
                                    : "削除する"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================
                設定リセット確認
            ======================================== */}

            {showResetConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="reset-dialog-title"
                        className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[#152238] p-6 shadow-2xl"
                    >
                        <h2
                            id="reset-dialog-title"
                            className="font-serif text-lg"
                        >
                            設定を初期化しますか？
                        </h2>

                        <p className="mt-3 text-sm leading-relaxed text-mist">
                            家計簿名・表示名・デフォルト負担割合を
                            初期値に戻します。
                            支出データは削除されません。
                        </p>

                        {actionError && (
                            <div
                                role="alert"
                                className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200"
                            >
                                {actionError}
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    clearMessages();
                                    setShowResetConfirm(false);
                                }}
                                disabled={isResetting}
                                className="min-h-11 rounded-xl border border-gold/20 px-3 text-sm text-mist disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                キャンセル
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void handleReset()
                                }
                                disabled={isResetting}
                                className="min-h-11 rounded-xl bg-gold px-3 text-sm font-semibold text-night disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isResetting
                                    ? "初期化中..."
                                    : "初期化する"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================
                ログアウト確認
            ======================================== */}

            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-dialog-title"
                        className="w-full max-w-sm rounded-2xl border border-gold/25 bg-[#152238] p-6 shadow-2xl"
                    >
                        <h2
                            id="logout-dialog-title"
                            className="font-serif text-lg"
                        >
                            ログアウトしますか？
                        </h2>

                        <p className="mt-3 text-sm leading-relaxed text-mist">
                            現在のログインセッションを終了します。
                            再度利用する際はパスキー認証が必要です。
                        </p>

                        {logoutError && (
                            <div
                                role="alert"
                                className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200"
                            >
                                {logoutError}
                            </div>
                        )}

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setLogoutError(null);
                                    setShowLogoutConfirm(false);
                                }}
                                disabled={isLoggingOut}
                                className="min-h-11 rounded-xl border border-gold/20 px-3 text-sm text-mist transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                キャンセル
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void handleLogout()
                                }
                                disabled={isLoggingOut}
                                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-300/30 bg-red-300/15 px-3 text-sm font-medium text-red-200 transition-colors hover:bg-red-300/25 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <LogOut size={16} />
                                {isLoggingOut
                                    ? "処理中..."
                                    : "ログアウト"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
