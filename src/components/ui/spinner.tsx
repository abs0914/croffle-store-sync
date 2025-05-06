
import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  /**
   * The size of the spinner
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
}

export function Spinner({ className, size = "md", ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 border-t-transparent border-croffle-primary ${sizeClasses[size]} ${className || ""}`}
      {...props}
    ></div>
  );
}
