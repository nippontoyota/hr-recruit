import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: ReactNode;
  rightElement?: ReactNode;
  rounded?: "md" | "lg" | "xl" | "full";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, rightElement, rounded = "md", ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-secondary">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-12 w-full border border-border bg-surface px-4 py-2 text-base font-semibold text-text-primary placeholder:text-sm placeholder:font-normal placeholder:text-text-secondary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors tracking-wide",
            rounded === "full"
              ? "rounded-full"
              : rounded === "xl"
                ? "rounded-xl"
                : rounded === "lg"
                  ? "rounded-lg"
                  : "rounded-md",
            icon ? "pl-11" : "",
            rightElement ? "pr-11" : "",
            error && "border-danger focus:ring-danger",
            className,
          )}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3.5">
            {rightElement}
          </div>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
