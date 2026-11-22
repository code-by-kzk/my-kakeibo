
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Check,
    Fingerprint,
    House,
    Info,
    LogOut,
    RotateCcw,
    Save,
    Settings2,
    ShieldCheck,
    Users,
} from "lucide-react";

import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";
import { useAuth } from "../../contexts/AuthContext";
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

    // フォームの入力値
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

    // API通信状態
    const [isSaving, setIsSaving] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const [actionError, setActionError] = useState<string | null>(
        null,
    );

    const [logoutError, setLogoutError] = useState<string | null>(
        null,
    );

    // 保存完了メッセージ
    const [saved, setSaved] = useState(false);

    // 確認ダイアログ
    const [showResetConfirm, setShowResetConfirm] =
        useState(false);

    const [showLogoutConfirm, setShowLogoutConfirm] =
        useState(false);

    // Contextの値が変わった場合にフォームへ反映
    useEffect(() => {
        setHouseholdName(settings.householdName);
        setMemberAName(settings.memberNames.A);
        setMemberBName(settings.memberNames.B);
        setDefaultShareA(settings.defaultSharePercentA);
    }, [settings]);

    // 入力内容に変更があるか
    const hasChanges =
        householdName !== settings.householdName ||
        memberAName !== settings.memberNames.A ||
        memberBName !== settings.memberNames.B ||
        defaultShareA !== settings.defaultSharePercentA;

    // API取得失敗時や通信中は編集を防止
    const isBusy =
        isSaving || isResetting || isLoggingOut;

    const isFormDisabled =
        isLoading || loadError !== null || isBusy;

    const clearMessages = () => {
        setSaved(false);
        setActionError(null);
    };

    // 保存
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
            setActionError("すべての名前を入力してください。");
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
            setActionError("入力文字数が上限を超えています。");
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

    // 保存前の変更を取り消す
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

    // 設定を初期値に戻す
    const handleReset = async (): Promise<void> => {
        if (isFormDisabled) {
            return;
        }

        setIsResetting(true);
        clearMessages();

        try {
            await resetSettings();

            // フォームの値はContextの更新に追従する
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

    // ログアウト
    const handleLogout = async (): Promise<void> => {
        if (isBusy) {
            return;
        }

        setIsLoggingOut(true);
        setLogoutError(null);

        try {
            // サーバー側のセッションを無効化し、
            // AuthContextの認証状態を更新する
            await logout();

            setShowLogoutConfirm(false);

            // ログイン画面へ遷移
            navigate("/login", { replace: true });
        } catch {
            // ログアウトに失敗した場合は
            // ダイアログを閉じずにエラーを表示する
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

    // 入力欄の共通スタイル
    const inputClassName =
        "mt-2 w-full min-w-0 rounded-xl " +
        "border border-gold/20 bg-night/60 " +
        "px-4 py-3 text-sm text-moon " +
        "placeholder:text-mist/50 " +
        "outline-none transition-colors " +
        "focus:border-gold/60 focus:ring-1 " +
        "focus:ring-gold/20 " +
        "disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="mx-auto w-full min-w-0 max-w-xl space-y-6 pb-8 text-moon">
            {/* ページタイトル */}
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

            {/* 家計簿の設定 */}
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
                            setHouseholdName(event.target.value);
                            clearMessages();
                        }}
                        disabled={isFormDisabled}
                        maxLength={50}
                        placeholder="ふたりの家計簿"
                        className={inputClassName}
                    />
                </label>
            </GlassCard>

            {/* メンバー設定 */}
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
                    {/* Aさん */}
                    <label className="block">
                        <span className="flex items-center gap-2 text-sm text-mist">
                            <span className="size-2 rounded-full bg-gold" />
                            メンバーA
                        </span>

                        <input
                            type="text"
                            value={memberAName}
                            onChange={(event) => {
                                setMemberAName(event.target.value);
                                clearMessages();
                            }}
                            disabled={isFormDisabled}
                            maxLength={30}
                            placeholder="Aさん"
                            className={inputClassName}
                        />
                    </label>

                    {/* Bさん */}
                    <label className="block">
                        <span className="flex items-center gap-2 text-sm text-mist">
                            <span className="size-2 rounded-full bg-cyan-glow" />
                            メンバーB
                        </span>

                        <input
                            type="text"
                            value={memberBName}
                            onChange={(event) => {
                                setMemberBName(event.target.value);
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

            {/* デフォルト負担割合 */}
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

                {/* 負担割合表示 */}
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

                {/* 割合スライダー */}
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

                {/* 50:50リセット */}
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

            {/* 保存 */}
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
                        onClick={() => void handleSave()}
                        disabled={isFormDisabled || !hasChanges}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Save size={18} />
                            {isSaving ? "保存中..." : "設定を保存"}
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

            {/* セキュリティ */}
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

            {/* その他 */}
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

            {/* 設定リセット */}
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

            {/* ログアウト */}
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

            {/* 設定リセット確認 */}
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
                                onClick={() => void handleReset()}
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

            {/* ログアウト確認 */}
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
                                onClick={() => void handleLogout()}
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
