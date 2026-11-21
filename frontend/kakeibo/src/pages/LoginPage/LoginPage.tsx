
import { useState } from "react";
import { Fingerprint, UserRound } from "lucide-react";

import FantasyBackground from "../../components/ui/FantasyBackground";
import GoldButton from "../../components/ui/GoldButton";

type UserId = "A" | "B";

export default function LoginPage() {
    const [selectedUser, setSelectedUser] =
        useState<UserId>("A");

    const handleLogin = () => {
        // TODO: GoのWebAuthn認証APIに接続
        console.log(`${selectedUser}さんを選択しました`);
    };

    return (
        <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12 text-moon">
            {/* 幻想的な背景 */}
            <FantasyBackground variant="login" />

            {/* ログイン画面本体 */}
            <div className="relative z-10 flex w-full max-w-sm flex-col items-center">

                {/* オリジナルアイコン */}
                <div className="login-appear mb-5 rounded-full border border-gold/40 bg-night/60 p-2 shadow-[0_0_35px_rgba(220,195,151,0.18)] backdrop-blur-md">
                    <img
                        src="/icon.png"
                        alt="ふたりの家計簿のアイコン"
                        className="h-20 w-20 rounded-full object-cover"
                    />
                </div>

                {/* タイトル */}
                <div className="login-appear mb-7 text-center">
                    <h1 className="font-serif text-3xl font-medium tracking-[0.12em] text-moon drop-shadow-lg">
                        ふたりの家計簿
                    </h1>

                    <p className="mt-3 text-xs tracking-[0.15em] text-mist">
                        ふたりの支出を、ひとつに。
                    </p>
                </div>

                {/* 装飾ライン */}
                <div
                    aria-hidden="true"
                    className="mb-6 flex w-full items-center gap-3"
                >
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" />
                    <span className="text-xs text-gold">✦</span>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" />
                </div>

                {/* ログインカード */}
                <section className="login-card-appear w-full rounded-2xl border border-gold/30 bg-[#142238]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <h2 className="mb-4 text-sm tracking-widest text-gold">
                        アカウントを選択
                    </h2>

                    {/* Aさん・Bさん */}
                    <div className="grid grid-cols-2 gap-3">
                        {(["A", "B"] as const).map((user) => {
                            const isSelected = selectedUser === user;

                            return (
                                <button
                                    key={user}
                                    type="button"
                                    aria-pressed={isSelected}
                                    onClick={() => setSelectedUser(user)}
                                    className={`
                    flex min-h-28 flex-col
                    items-center justify-center gap-3
                    rounded-xl border
                    transition-all duration-300
                    active:scale-[0.97]
                    focus-visible:outline-2
                    focus-visible:outline-offset-2
                    focus-visible:outline-gold
                    motion-reduce:transition-none
                    ${isSelected
                                            ? "border-gold bg-gold/10 text-gold shadow-[0_0_20px_rgba(220,195,151,0.18)]"
                                            : "border-white/20 bg-night/40 text-mist hover:border-gold/50"
                                        }
                  `}
                                >
                                    <UserRound size={29} strokeWidth={1.4} />

                                    <span className="text-base tracking-wider text-moon">
                                        {user}さん
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* ログインボタン */}
                    <GoldButton
                        className="mt-7"
                        onClick={handleLogin}
                    >
                        <Fingerprint size={21} />
                        パスキーでログイン
                    </GoldButton>

                    <p className="mt-5 text-center text-xs text-mist">
                        パスワード不要の安全なログイン
                    </p>
                </section>

                {/* フッター装飾 */}
                <div
                    aria-hidden="true"
                    className="mt-8 flex items-center gap-3 text-gold/60"
                >
                    <span className="h-px w-12 bg-gold/30" />
                    <span className="text-xs">✧</span>
                    <span className="h-px w-12 bg-gold/30" />
                </div>
            </div>
        </main>
    );
}
