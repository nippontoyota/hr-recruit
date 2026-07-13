import * as React from "react"
import { cn } from "../../lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "teal" | "indigo"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-white shadow hover:bg-primary/80",
    secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80",
    destructive: "border-transparent bg-danger text-white shadow hover:bg-danger/80",
    outline: "text-text-primary",
    success: "border-transparent bg-success/10 text-success hover:bg-success/20",
    warning: "border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200",
    info: "border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200",
    teal: "border-transparent bg-teal-100 text-teal-700 hover:bg-teal-200",
    indigo: "border-transparent bg-indigo-100 text-indigo-700 hover:bg-indigo-200",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
