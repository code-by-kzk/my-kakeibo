
import type {
    ButtonHTMLAttributes,
    ReactNode,
} from "react";

type GoldButtonProps =
    ButtonHTMLAttributes<HTMLButtonElement> & {
        children: ReactNode;
        loading?: boolean;
    };

export default function GoldButton({
    children,
    loading = false,
    disabled,
    className = "",
    type = "button",
    ...props
}: GoldButtonProps) {
    return (
        <button
            {...props}
            type={type}
            disabled={disabled || loading}
            className={`
        flex min-h-12 w-full items-center
        justify-center gap-2
        rounded-xl
        border border-[#f0dcad]
        bg-gradient-to-r
        from-[#b9a079]
        via-[#f0dcad]
        to-[#b9a079]
        px-5 py-3
        font-semibold text-[#182235]
        shadow-[0_0_22px_rgba(220,195,151,0.18)]
        transition-all duration-200
        hover:brightness-110
        active:scale-[0.98]
        focus-visible:outline-2
        focus-visible:outline-offset-2
        focus-visible:outline-gold
        disabled:cursor-not-allowed
        disabled:opacity-60
        motion-reduce:transition-none
        ${className}
      `}
        >
            {loading ? "処理中..." : children}
        </button>
    );
}
