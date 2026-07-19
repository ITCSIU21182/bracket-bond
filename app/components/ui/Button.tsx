import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "brand" | "success" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// primary = APECHAIN white-fill CTA; brand = ape-blue; success = green (Buy/money action).
const VARIANTS: Record<Variant, string> = {
  primary: "bg-white text-[#04070f] hover:shadow-glow-white font-semibold",
  brand: "bg-brand text-white hover:bg-brand-2 hover:shadow-glow-blue font-semibold",
  success: "bg-accent text-[#04110a] hover:bg-accent/90 hover:shadow-glow font-semibold",
  secondary: "bg-panel-2 text-text border border-line hover:border-brand-2",
  ghost: "text-muted hover:text-text hover:bg-panel-2",
  danger: "bg-danger/10 text-danger border border-danger/40 hover:bg-danger/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg",
  md: "h-10 px-4 text-sm rounded-xl",
  lg: "h-12 px-6 text-[15px] rounded-xl",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-2/50",
        "disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});
