
import { MoonStar } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";

export default function Header() {
    const { settings } = useSettings();

    return (
        <header className="sticky top-0 z-40 w-full border-b border-gold/15 bg-night/25 backdrop-blur-md">
            {/* 上部の繊細な光 */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

            <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
                {/* ロゴと家計簿名 */}
                <div className="flex min-w-0 items-center gap-3">
                    <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-gold/25 bg-gradient-to-br from-gold/15 to-cyan-glow/5 shadow-[0_0_20px_rgba(220,195,151,0.08)]">
                        <MoonStar
                            size={21}
                            strokeWidth={1.5}
                            className="text-gold"
                        />
                    </div>

                    <div className="min-w-0">
                        <p className="text-[9px] tracking-[0.24em] text-gold/70">
                            OUR LITTLE WORLD
                        </p>

                        <h1 className="truncate font-serif text-base font-medium tracking-wider text-moon sm:text-lg">
                            {settings.householdName}
                        </h1>
                    </div>
                </div>

                {/* アバター（認証実装前はAさんを仮表示） */}
                <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-full border border-gold/35 bg-gradient-to-br from-[#283b55] to-[#111d31] text-sm font-medium text-gold shadow-[0_0_16px_rgba(220,195,151,0.08)]"
                    title={settings.memberNames.A}
                    aria-label={settings.memberNames.A}
                >
                    {Array.from(settings.memberNames.A)[0] ?? "A"}
                </div>
            </div>

            {/* 下部の淡い光 */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-glow/20 to-transparent" />
        </header>
    );
}
