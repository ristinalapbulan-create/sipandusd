import { ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Note: I need `class-variance-authority` (cva) for cleaner variants
// I should install it: npm install class-variance-authority

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
    {
        variants: {
            variant: {
                default: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100",
                destructive: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-100",
                outline: "border border-slate-300 text-slate-700 hover:bg-slate-50",
                secondary: "bg-teal-500 text-white hover:bg-teal-600 shadow-md shadow-teal-100",
                ghost: "hover:bg-slate-100 text-slate-600",
                link: "underline-offset-4 hover:underline text-blue-600",
            },
            size: {
                default: "h-10 py-2 px-4",
                sm: "h-9 px-3 rounded-md",
                lg: "h-11 px-8 rounded-md",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, loading, children, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={props.disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
