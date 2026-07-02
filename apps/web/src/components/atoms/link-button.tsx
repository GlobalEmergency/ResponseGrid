"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary";

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: Variant;
  fullWidth?: boolean;
}

const BASE =
  "flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2";

const VARIANTS: Record<Variant, string> = {
  primary: "text-white bg-navy hover:bg-navy-700",
  secondary: "text-ink bg-white border-2 border-navy hover:bg-surface",
};

const SIZE_CLASSES = "px-6 py-4 text-base";

export function LinkButton({
  variant = "primary",
  fullWidth = false,
  className = "",
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      {...props}
      className={[
        BASE,
        VARIANTS[variant],
        SIZE_CLASSES,
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}
