import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-white/10 bg-white/[0.07] text-white/78",
        mint: "border-calm-mint/25 bg-calm-mint/10 text-calm-mint",
        amber: "border-calm-amber/25 bg-calm-amber/10 text-calm-amber",
        rose: "border-calm-rose/25 bg-calm-rose/10 text-calm-rose",
        cyan: "border-calm-cyan/25 bg-calm-cyan/10 text-calm-cyan",
        violet: "border-calm-violet/25 bg-calm-violet/10 text-calm-violet"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
