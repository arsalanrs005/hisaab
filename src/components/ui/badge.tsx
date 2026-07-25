import { cn } from "@/lib/utils";

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline" | "info";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium leading-[18px]",
        variant === "default" && "bg-primary-subtle text-primary",
        variant === "secondary" && "bg-muted text-foreground-muted",
        variant === "success" && "bg-success-subtle text-success",
        variant === "warning" && "bg-warning-subtle text-warning",
        variant === "danger" && "bg-danger-subtle text-danger",
        variant === "info" && "bg-info-subtle text-info",
        variant === "outline" && "border border-border bg-transparent text-foreground-secondary",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
