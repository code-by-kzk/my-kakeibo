
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fingerprint, UserRound } from "lucide-react";

import FantasyBackground from "../../components/ui/FantasyBackground";
import GoldButton from "../../components/ui/GoldButton";
import { useAuth } from "../../contexts/AuthContext";

type UserId = "A" | "B";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

type LoginBeginResponse = {
    challengeId: string;
    options: {
        publicKey: PublicKeyCredentialRequestOptionsJSON;
    };
};

function base64URLToBytes(value: string): ArrayBuffer {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
        Math.ceil(base64.length / 4) * 4,
        "=",
    );

    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes.buffer;
}

function bytesToBase64URL(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}


function convertRequestOptions(
    options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
    return {
        challenge: base64URLToBytes(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,

        userVerification:
            options.userVerification as UserVerificationRequirement | undefined,

        allowCredentials: options.allowCredentials?.map(
            (credential): PublicKeyCredentialDescriptor => ({
                type: "public-key",
                id: base64URLToBytes(credential.id),
                transports: credential.transports as
                    | AuthenticatorTransport[]
                    | undefined,
            }),
        ),
    };
}

function serializeCredential(
    credential: PublicKeyCredential,
) {
    const response =
        credential.response as AuthenticatorAssertionResponse;

    return {
        id: credential.id,
        rawId: bytesToBase64URL(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: bytesToBase64URL(
                response.clientDataJSON,
            ),
            authenticatorData: bytesToBase64URL(
                response.authenticatorData,
            ),
            signature: bytesToBase64URL(response.signature),
            userHandle: response.userHandle
                ? bytesToBase64URL(response.userHandle)
                : null,
        },
        clientExtensionResults:
            credential.getClientExtensionResults(),
        authenticatorAttachment:
            credential.authenticatorAttachment,
    };
}

async function readErrorMessage(
    response: Response,
    fallback: string,
): Promise<string> {
    try {
        const data: unknown = await response.json();

        if (
            typeof data === "object" &&
            data !== null &&
            "error" in data &&
            typeof data.error === "string"
        ) {
            return data.error;
        }
    } catch {
        // エラー本文がJSON以外の場合は既定メッセージを使用
    }

    return fallback;
}

export default function LoginPage() {
    const [selectedUser, setSelectedUser] =
        useState<UserId>("A");

    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();
    const { refreshAuth } = useAuth();

    const handleLogin = async () => {
        if (isLoggingIn) return;

        setIsLoggingIn(true);
        setErrorMessage("");

        try {
            if (!window.PublicKeyCredential) {
                throw new Error(
                    "このブラウザはパスキー認証に対応していません。",
                );
            }

            // 1. 認証開始
            const beginResponse = await fetch(
                `${API_BASE_URL}/api/auth/passkey/login/begin`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        memberCode: selectedUser,
                    }),
                },
            );

            if (!beginResponse.ok) {
                throw new Error(
                    await readErrorMessage(
                        beginResponse,
                        "パスキー認証を開始できませんでした。",
                    ),
                );
            }

            const beginData: LoginBeginResponse =
                await beginResponse.json();

            // 2. WebAuthn認証オプションを変換
            const publicKey = convertRequestOptions(
                beginData.options.publicKey,
            );

            // 3. Face ID / Touch IDなどによる認証
            const credential = await navigator.credentials.get({
                publicKey,
            });

            if (!(credential instanceof PublicKeyCredential)) {
                throw new Error(
                    "パスキー認証を完了できませんでした。",
                );
            }

            // 4. 認証結果をサーバーに送信
            const finishResponse = await fetch(
                `${API_BASE_URL}/api/auth/passkey/login/finish`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        challengeId: beginData.challengeId,
                        credential: serializeCredential(credential),
                    }),
                },
            );

            if (!finishResponse.ok) {
                throw new Error(
                    await readErrorMessage(
                        finishResponse,
                        "パスキー認証に失敗しました。",
                    ),
                );
            }

            // 5. セッションCookieから認証状態を更新
            await refreshAuth();

            // 6. ホーム画面へ移動
            navigate("/", { replace: true });
        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === "NotAllowedError"
            ) {
                setErrorMessage(
                    "認証がキャンセルされたか、許可されませんでした。",
                );
            } else {
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "ログイン中にエラーが発生しました。",
                );
            }
        } finally {
            setIsLoggingIn(false);
        }
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
                                    disabled={isLoggingIn}
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
                    disabled:cursor-not-allowed
                    disabled:opacity-60
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

                    {/* エラー表示 */}
                    {errorMessage && (
                        <p
                            role="alert"
                            className="mt-5 rounded-lg border border-red-300/30 bg-red-950/30 px-3 py-3 text-sm text-red-200"
                        >
                            {errorMessage}
                        </p>
                    )}

                    {/* ログインボタン */}
                    <GoldButton
                        className="mt-7"
                        onClick={handleLogin}
                    >
                        <Fingerprint size={21} />
                        {isLoggingIn
                            ? "認証しています..."
                            : "パスキーでログイン"}
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
