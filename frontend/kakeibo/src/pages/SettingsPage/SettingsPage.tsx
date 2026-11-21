
import { useEffect, useState } from "react";
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
import { useSettings } from "../../contexts/SettingsContext";
import { defaultSettings } from "../../types/settings";

export default function SettingsPage() {
    const { settings, updateSettings, resetSettings } =
        useSettings();

    // フォームの入力値
    const [householdName, setHouseholdName] = useState(
        settings.householdName
    );

    const [memberAName, setMemberAName] = useState(
        settings.memberNames.A
    );

    const [memberBName, setMemberBName] = useState(
        settings.memberNames.B
    );

    const [defaultShareA, setDefaultShareA] = useState(
        settings.defaultSharePercentA
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

    // 保存
    const handleSave = () => {
        const trimmedHouseholdName = householdName.trim();
        const trimmedMemberAName = memberAName.trim();
        const trimmedMemberBName = memberBName.trim();

        if (
            !trimmedHouseholdName ||
            !trimmedMemberAName ||
            !trimmedMemberBName
        ) {
            alert("すべての名前を入力してください。");
            return;
        }

        if (
            !Number.isFinite(defaultShareA) ||
            defaultShareA < 0 ||
            defaultShareA > 100
        ) {
            alert("負担割合は0〜100%で指定してください。");
            return;
        }

        updateSettings({
            householdName: trimmedHouseholdName,
            memberNames: {
                A: trimmedMemberAName,
                B: trimmedMemberBName,
            },
            defaultSharePercentA: defaultShareA,
        });

        setSaved(true);
    };

    // 保存前の変更を取り消す
    const handleCancelChanges = () => {
        setHouseholdName(settings.householdName);
        setMemberAName(settings.memberNames.A);
        setMemberBName(settings.memberNames.B);
        setDefaultShareA(settings.defaultSharePercentA);
        setSaved(false);
    };

    // 設定を初期値に戻す
    const handleReset = () => {
        resetSettings();

        setHouseholdName(defaultSettings.householdName);
        setMemberAName(defaultSettings.memberNames.A);
        setMemberBName(defaultSettings.memberNames.B);
        setDefaultShareA(
            defaultSettings.defaultSharePercentA
        );

        setShowResetConfirm(false);
        setSaved(false);
    };

    const handleShareChange = (value: number) => {
        setDefaultShareA(value);
        setSaved(false);
    };

    // 入力欄の共通スタイル
    const inputClassName =
        "mt-2 w-full min-w-0 rounded-xl " +
        "border border-gold/20 bg-night/60 " +
        "px-4 py-3 text-sm text-moon " +
        "placeholder:text-mist/50 " +
        "outline-none transition-colors " +
        "focus:border-gold/60 focus:ring-1 " +
        "focus:ring-gold/20";

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
                            setSaved(false);
                        }}
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
                                setSaved(false);
                            }}
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
                                setSaved(false);
                            }}
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
                        onChange={(event) =>
                            handleShareChange(
                                Number(event.target.value)
                            )
                        }
                        aria-label="メンバーAのデフォルト負担割合"
                        className="w-full cursor-pointer accent-[#dcc397]"
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
                    className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/10"
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

                    <GoldButton
                        type="button"
                        onClick={handleSave}
                        disabled={!hasChanges}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Save size={18} />
                            設定を保存
                        </span>
                    </GoldButton>

                    {hasChanges && (
                        <button
                            type="button"
                            onClick={handleCancelChanges}
                            className="min-h-11 w-full rounded-xl border border-gold/20 px-4 py-2 text-sm text-mist transition-colors hover:bg-gold/10 hover:text-moon"
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
                            パスキー管理
                        </p>

                        <p className="mt-1 text-xs text-mist">
                            バックエンド連携時に実装予定
                        </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-gold/20 px-2 py-1 text-[10px] text-mist">
                        準備中
                    </span>
                </div>
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
                        ローカル
                    </span>
                </div>
            </GlassCard>

            {/* 設定リセット */}
            <GlassCard>
                <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-gold/20 px-4 py-3 text-sm text-mist transition-colors hover:bg-gold/10 hover:text-moon"
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
                onClick={() => setShowLogoutConfirm(true)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-300/20 bg-red-300/5 px-4 py-3 text-sm text-red-200 transition-colors hover:bg-red-300/10"
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

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowResetConfirm(false)
                                }
                                className="min-h-11 rounded-xl border border-gold/20 px-3 text-sm text-mist"
                            >
                                キャンセル
                            </button>

                            <button
                                type="button"
                                onClick={handleReset}
                                className="min-h-11 rounded-xl bg-gold px-3 text-sm font-semibold text-night"
                            >
                                初期化する
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
                            ログアウト
                        </h2>

                        <p className="mt-3 text-sm leading-relaxed text-mist">
                            現在は認証機能の実装前のため、
                            ログアウト処理は利用できません。
                            パスキー認証の実装時に対応します。
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                setShowLogoutConfirm(false)
                            }
                            className="mt-6 min-h-11 w-full rounded-xl border border-gold/20 px-4 text-sm text-moon"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
