
import React, { memo } from "react";
import { cn } from "@/lib/utils";

interface TouchCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  id?: string;
}

const TouchCheckbox = memo(function TouchCheckbox({
  checked,
  onChange,
  disabled = false,
  className,
  label,
  id
}: TouchCheckboxProps) {
  const handleChange = React.useCallback(() => {
    if (!disabled) {
      onChange(!checked);
    }
  }, [checked, onChange, disabled]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange();
    }
  }, [handleChange]);

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        id={id}
        className={cn(
          "relative h-6 w-6 rounded border-2 cursor-pointer transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          "touch-manipulation", // Optimizes for touch devices
          checked
            ? "bg-blue-600 border-blue-600"
            : "bg-white border-gray-300 hover:border-gray-400",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={handleChange}
        onKeyDown={handleKeyDown}
      >
        {checked && (
          <svg
            className="absolute inset-0 w-full h-full text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        )}
      </div>
      {label && (
        <label
          htmlFor={id}
          className={cn(
            "text-sm font-medium leading-none cursor-pointer select-none",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleChange}
        >
          {label}
        </label>
      )}
    </div>
  );
});

export default TouchCheckbox;
