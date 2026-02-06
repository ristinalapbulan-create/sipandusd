import { HTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-slate-900 text-slate-50",
                secondary: "border-transparent bg-slate-100 text-slate-900",
                destructive: "border-transparent bg-red-500 text-slate-50",
                outline: "text-slate-950",
                approved: "bg-teal-100 text-teal-700 border-teal-200",
                pending: "bg-amber-100 text-amber-700 border-amber-200",
                rejected: "bg-red-100 text-red-700 border-red-200",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
