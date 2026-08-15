import { forwardRef } from "react";
import { cn } from "../../lib/cn.ts";
import "./Button.css";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <button ref={ref} className={cn(`btn btn-${variant} btn-${size}`, className)} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
