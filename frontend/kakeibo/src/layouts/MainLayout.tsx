
import { NavLink, Outlet } from "react-router-dom";
import {
    House,
    ReceiptText,
    ChartNoAxesColumn,
    Settings,
} from "lucide-react";

import FantasyBackground from "../components/ui/FantasyBackground";
import Header from "../components/Header/Header";

const navItems = [
    { to: "/", label: "ホーム", icon: House },
    { to: "/expenses", label: "支出", icon: ReceiptText },
    {
        to: "/analytics",
        label: "集計",
        icon: ChartNoAxesColumn,
    },
    { to: "/settings", label: "設定", icon: Settings },
];

export default function MainLayout() {
    return (
        <div className="relative isolate min-h-dvh text-moon">
            {/* 幻想的な背景 */}
            <FantasyBackground variant="app" />

            {/* 共通ヘッダー */}
            <Header />

            {/* 各画面 */}
            <main className="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
                <Outlet />
            </main>

            {/* ボトムナビゲーション */}
            <nav
                aria-label="メインナビゲーション"
                className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/20 bg-night/90 backdrop-blur-xl"
            >
                <div className="mx-auto grid max-w-3xl grid-cols-4 pb-[env(safe-area-inset-bottom)]">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === "/"}
                            className={({ isActive }) =>
                                `flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors ${isActive
                                    ? "text-gold"
                                    : "text-mist hover:text-moon"
                                }`
                            }
                        >
                            <Icon size={21} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </div>
    );
}
