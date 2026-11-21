
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import GlassCard from "../../components/ui/GlassCard";
import GoldButton from "../../components/ui/GoldButton";

export default function HomePage() {
    return (
        <div className="space-y-5">
            <GlassCard>
                <p className="text-sm text-mist">今月の支出</p>
                <p className="mt-3 text-4xl font-semibold tracking-wide">
                    ¥142,500
                </p>
                <div className="mt-4 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
                <p className="mt-4 text-sm text-gold">
                    前月比 -12.4%
                </p>
            </GlassCard>

            <GlassCard>
                <h2 className="mb-4 text-lg text-gold">
                    カテゴリ別支出
                </h2>

                {[
                    ["食費", "¥49,800"],
                    ["住居", "¥38,000"],
                    ["交通", "¥12,900"],
                    ["日用品", "¥11,200"],
                ].map(([name, amount]) => (
                    <div
                        key={name}
                        className="flex justify-between border-b border-white/10 py-3 last:border-0"
                    >
                        <span>{name}</span>
                        <span className="text-moon">{amount}</span>
                    </div>
                ))}
            </GlassCard>

            <Link to="/expenses/new" className="block">
                <GoldButton className="pointer-events-none">
                    <Plus size={20} />
                    支出を登録する
                </GoldButton>
            </Link>
        </div>
    );
}
