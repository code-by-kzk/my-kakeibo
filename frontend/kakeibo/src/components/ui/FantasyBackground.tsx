
type BackgroundProps = {
    variant?: "login" | "app";
};

const petals = [
    { left: "8%", delay: "-2s", duration: "19s" },
    { left: "25%", delay: "-10s", duration: "23s" },
    { left: "54%", delay: "-5s", duration: "21s" },
    { left: "78%", delay: "-14s", duration: "25s" },
    { left: "92%", delay: "-8s", duration: "20s" },
];

export default function FantasyBackground({ variant = "app", }: BackgroundProps) {
    const isLogin = variant === "login";

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night"
        >
            {/* 背景画像 */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage:
                        "url('/background.webp')",
                }}
            />

            {/* 文字の読みやすさを確保 */}
            <div
                className={`absolute inset-0 ${isLogin
                    ? "bg-night/45"
                    : "bg-night/75"
                    }`}
            />

            {/* 月光のような淡い発光 */}
            <div
                className={`
          moon-glow absolute -right-32 -top-40
          h-[450px] w-[450px]
          rounded-full
          bg-cyan-glow/20 blur-[100px]
          ${isLogin ? "" : "opacity-40"}
        `}
            />

            {/* 下部の金色の光 */}
            <div
                className="
          absolute -bottom-40 left-1/2
          h-80 w-[600px] -translate-x-1/2
          rounded-full bg-gold/10
          blur-[100px]
        "
            />

            {/* ログイン画面のみ花びらを表示 */}
            {isLogin &&
                petals.map((petal, index) => (
                    <span
                        key={index}
                        className="
              petal-drift absolute -top-8
              h-3 w-2 rounded-[80%_0_80%_0]
              bg-moon/70 shadow-[0_0_10px_#dcc39755]
            "
                        style={{
                            left: petal.left,
                            animationDelay: petal.delay,
                            animationDuration: petal.duration,
                        }}
                    />
                ))}
        </div>
    );
}
