import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-calm-mint/70 focus-visible:ring-offset-2 focus-visible:ring-offset-calm-black disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-white text-black shadow-[0_0_36px_rgba(255,255,255,0.18)] hover:bg-calm-mint hover:shadow-[0_0_42px_rgba(120,255,214,0.22)]",
        calm:
          "border border-white/10 bg-white/[0.07] text-white hover:border-white/20 hover:bg-white/[0.11]",
        ghost: "text-white/72 hover:bg-white/[0.08] hover:text-white",
        signal:
          "border border-calm-mint/30 bg-calm-mint/10 text-calm-mint shadow-[0_0_34px_rgba(120,255,214,0.12)] hover:bg-calm-mint/16",
        danger:
          "border border-calm-rose/25 bg-calm-rose/10 text-calm-rose hover:bg-calm-rose/16"
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-7 text-base",
        icon: "h-10 w-10 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
