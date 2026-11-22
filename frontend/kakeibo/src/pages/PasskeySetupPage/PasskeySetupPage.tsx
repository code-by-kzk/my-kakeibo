
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, KeyRound } from "lucide-react";

import FantasyBackground from "../../components/ui/FantasyBackground";

type RegistrationBeginResponse = {
    challengeId: string;
    options: {
        publicKey: PublicKeyCredentialCreationOptionsJSON;
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

function convertCreationOptions(
    options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
    return {
        challenge: base64URLToBytes(options.challenge),
        rp: options.rp,
        user: {
            id: base64URLToBytes(options.user.id),
            name: options.user.name,
            displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map(
            (param) => ({
                type: "public-key" as const,
                alg: param.alg,
            }),
        ),
        timeout: options.timeout,
        attestation:
            options.attestation as AttestationConveyancePreference | undefined,
        authenticatorSelection: options.authenticatorSelection
            ? {
                authenticatorAttachment:
                    options.authenticatorSelection
                        .authenticatorAttachment as
                    AuthenticatorAttachment | undefined,
                residentKey:
                    options.authenticatorSelection
                        .residentKey as ResidentKeyRequirement | undefined,
                requireResidentKey:
                    options.authenticatorSelection.requireResidentKey,
                userVerification:
                    options.authenticatorSelection
                        .userVerification as
                    UserVerificationRequirement | undefined,
            }
            : undefined,
        excludeCredentials: options.excludeCredentials?.map(
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

function serializeRegistrationCredential(
    credential: PublicKeyCredential,
) {
    const response =
        credential.response as AuthenticatorAttestationResponse;

    return {
        id: credential.id,
        rawId: bytesToBase64URL(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: bytesToBase64URL(
                response.clientDataJSON,
            ),
            attestationObject: bytesToBase64URL(
                response.attestationObject,
            ),
            transports: response.getTransports(),
        },
        clientExtensionResults:
            credential.getClientExtensionResults(),
        authenticatorAttachment:
            credential.authenticatorAttachment,
    };
}

async function readError(response: Response): Promise<string> {
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
        // JSON以外の場合は既定メッセージを使用
    }

    return `登録に失敗しました（HTTP ${response.status}）`;
}

export default function PasskeySetupPage() {
    const navigate = useNavigate();

    const [setupToken, setSetupToken] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const handleRegister = async () => {
        if (isRegistering) return;

        setErrorMessage("");
        setIsRegistering(true);

        try {
            if (!window.PublicKeyCredential) {
                throw new Error(
                    "このブラウザはパスキーに対応していません。",
                );
            }

            const token = setupToken.trim();

            if (!token) {
                throw new Error("初期登録トークンを入力してください。");
            }

            // 1. 登録開始
            const beginResponse = await fetch(
                "/api/auth/passkey/register/begin",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        setupToken: token,
                    }),
                },
            );

            if (!beginResponse.ok) {
                throw new Error(await readError(beginResponse));
            }

            const beginData: RegistrationBeginResponse =
                await beginResponse.json();

            // 2. WebAuthnオプションをブラウザ用に変換
            const publicKey = convertCreationOptions(
                beginData.options.publicKey,
            );

            // 3. Touch ID / Face IDなどでパスキー作成
            const credential = await navigator.credentials.create({
                publicKey,
            });

            if (!(credential instanceof PublicKeyCredential)) {
                throw new Error(
                    "パスキーの作成を完了できませんでした。",
                );
            }

            // 4. 登録結果をバックエンドに送信
            const finishResponse = await fetch(
                "/api/auth/passkey/register/finish",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        setupToken: token,
                        challengeId: beginData.challengeId,
                        credential: serializeRegistrationCredential(
                            credential,
                        ),
                    }),
                },
            );

            if (!finishResponse.ok) {
                throw new Error(await readError(finishResponse));
            }

            // 登録完了後、ログイン画面へ
            setSetupToken("");
            navigate("/login", { replace: true });
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
                        : "パスキー登録中にエラーが発生しました。",
                );
            }
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12 text-moon">
            <FantasyBackground variant="login" />

            <div className="relative z-10 w-full max-w-sm">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-night/60 shadow-[0_0_35px_rgba(220,195,151,0.18)]">
                        <KeyRound
                            size={36}
                            className="text-gold"
                            strokeWidth={1.3}
                        />
                    </div>

                    <h1 className="font-serif text-2xl tracking-widest text-moon">
                        パスキー初期登録
                    </h1>

                    <p className="mt-3 text-xs tracking-wider text-mist">
                        ふたりの家計簿
                    </p>
                </div>

                <section className="rounded-2xl border border-gold/30 bg-[#142238]/85 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                    <label
                        htmlFor="setup-token"
                        className="mb-3 block text-sm tracking-wider text-gold"
                    >
                        初期登録トークン
                    </label>

                    <input
                        id="setup-token"
                        type="password"
                        value={setupToken}
                        onChange={(event) =>
                            setSetupToken(event.target.value)
                        }
                        autoComplete="off"
                        spellCheck={false}
                        disabled={isRegistering}
                        placeholder="発行したトークンを入力"
                        className="w-full rounded-xl border border-gold/30 bg-night/60 px-4 py-3 text-sm text-moon outline-none placeholder:text-mist/60 focus:border-gold"
                    />

                    <p className="mt-3 text-xs leading-relaxed text-mist">
                        管理用コマンドで発行した30分間有効な
                        トークンを入力してください。
                    </p>

                    {errorMessage && (
                        <p
                            role="alert"
                            className="mt-5 rounded-lg border border-red-300/30 bg-red-950/30 px-3 py-3 text-sm text-red-200"
                        >
                            {errorMessage}
                        </p>
                    )}

                    <button
                        type="button"
                        onClick={handleRegister}
                        disabled={isRegistering || !setupToken.trim()}
                        className="mt-7 flex w-full items-center justify-center gap-3 rounded-xl border border-gold/60 bg-gold/15 px-5 py-4 text-sm font-medium tracking-wider text-gold transition hover:bg-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Fingerprint size={21} />
                        {isRegistering
                            ? "パスキーを登録しています..."
                            : "パスキーを登録"}
                    </button>

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-xs text-mist underline-offset-4 hover:text-gold hover:underline"
                        >
                            ログイン画面に戻る
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
