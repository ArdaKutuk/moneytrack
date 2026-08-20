import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "purple" | "yellow" | "secondary" | "ghost" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-accent-green text-[#07120e] hover:bg-accent-green-hover hover:shadow-[0_8px_22px_-10px_rgba(52,211,153,.75)]",
  purple:
    "bg-accent-purple text-[#100c1c] hover:bg-accent-purple-hover hover:shadow-[0_8px_22px_-10px_rgba(167,139,250,.7)]",
  yellow:
    "bg-accent-yellow text-[#1a1305] hover:bg-accent-yellow-hover hover:shadow-[0_8px_22px_-10px_rgba(251,191,36,.7)]",
  secondary:
    "bg-transparent border border-border text-text-secondary hover:border-[#3a4150] hover:text-text hover:bg-[color:var(--mt-surface-alt)]",
  ghost: "bg-transparent text-text-secondary hover:text-text",
  danger:
    "bg-transparent border border-[#5c2a34] text-accent-red hover:bg-[rgba(251,113,133,0.1)]",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-control text-[12.5px] font-extrabold cursor-pointer transition-all active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
