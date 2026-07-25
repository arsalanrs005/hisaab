import { formatPKR, formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Currency } from "@/types";

interface CurrencyAmountProps {
  amount: number;
  currency?: Currency;
  hidden?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  signed?: boolean;
  muted?: boolean;
}

export function CurrencyAmount({
  amount,
  currency = "PKR",
  hidden = false,
  className,
  size = "md",
  signed = false,
  muted = false,
}: CurrencyAmountProps) {
  const formatted =
    currency === "USD" ? formatUSD(Math.abs(amount), hidden) : formatPKR(Math.abs(amount), hidden);

  const prefix = signed && !hidden ? (amount > 0 ? "+" : amount < 0 ? "−" : "") : amount < 0 && !hidden ? "−" : "";

  return (
    <span
      className={cn(
        "tabular-nums tracking-tight",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        size === "lg" && "text-2xl font-semibold",
        size === "xl" && "text-[28px] font-semibold leading-tight",
        muted && "text-muted-foreground",
        signed && amount > 0 && "text-success",
        (signed || amount < 0) && amount < 0 && "text-danger",
        className
      )}
    >
      {prefix}
      {formatted}
    </span>
  );
}
