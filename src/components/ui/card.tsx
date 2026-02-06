import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn("bg-white rounded-xl shadow-sm border border-slate-200", className)}
            {...props}
        />
    )
);
Card.displayName = "Card";

export { Card };
