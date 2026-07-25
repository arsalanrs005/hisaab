import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-2 text-sm text-foreground tabular-nums shadow-none backdrop-blur-[var(--glass-blur)] transition-[border-color,box-shadow,background-color] duration-[var(--duration-normal)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-faint focus-visible:outline-none focus-visible:border-[var(--glass-border-strong)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-muted disabled:text-foreground-muted",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
