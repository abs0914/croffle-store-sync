
import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <div
      className={`animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-croffle-primary ${className || ""}`}
      {...props}
    ></div>
  );
}
