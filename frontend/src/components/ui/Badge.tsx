import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-white",
    secondary: "border-border bg-muted text-text-secondary",
    destructive: "border-transparent bg-danger/10 text-danger",
    outline: "border-border text-text-primary",
    success: "border-transparent bg-success/10 text-success",
    warning: "border-transparent bg-warning/10 text-warning",
    info: "border-transparent bg-info/10 text-info",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
