
import type { ReactNode } from "react";

type GlassCardProps = {
    children: ReactNode;
    className?: string;
};

export default function GlassCard({
    children,
    className = "",
}: GlassCardProps) {
    return (
        <section
            className={`
        rounded-2xl
        border border-[#dcc397]/25
        bg-[#142238]/85
        p-5
        shadow-[0_12px_40px_rgba(0,0,0,0.22)]
        backdrop-blur-xl
        ${className}
      `}
        >
            {children}
        </section>
    );
}
