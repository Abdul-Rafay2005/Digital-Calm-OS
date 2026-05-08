import * as React from "react";
import { cn, clamp } from "@/lib/utils";

type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value: number;
  tone?: "mint" | "cyan" | "amber" | "rose" | "violet";
};

const toneClass = {
  mint: "from-calm-mint to-calm-cyan",
  cyan: "from-calm-cyan to-white",
  amber: "from-calm-amber to-calm-mint",
  rose: "from-calm-rose to-calm-amber",
  violet: "from-calm-violet to-calm-cyan"
};

function Progress({ className, value, tone = "mint", ...props }: ProgressProps) {
  const width = clamp(value, 0, 100);

  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-white/[0.08]", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r shadow-[0_0_24px_rgba(120,255,214,0.18)] transition-all duration-700",
          toneClass[tone]
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export { Progress };
