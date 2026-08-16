'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, style, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--soft-text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            // Base pixel styles
            'w-full h-12 px-4 rounded-none',
            'bg-[var(--soft-bg-base)] text-[var(--soft-text-primary)]',
            'placeholder:text-[var(--soft-text-tertiary)]',
            'border-2 border-[hsl(var(--pixel-border-color))]',
            // Focus state
            'focus:outline-none focus:ring-2 focus:ring-ring',
            // Transition
            'transition-colors',
            // Disabled state
            'disabled:opacity-50 disabled:cursor-not-allowed',
            // Error state
            error && 'border-[hsl(var(--soft-danger))]',
            className
          )}
          style={{
            WebkitTextFillColor: 'currentColor',
            ...style,
          }}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-[var(--soft-danger)]">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-sm text-[var(--soft-text-tertiary)]">{hint}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export type { InputProps };
