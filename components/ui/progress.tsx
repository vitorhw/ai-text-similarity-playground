"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
    indicatorClassName?: string
    naturalRange?: { min: number; max: number }
  }
>(({ className, value, indicatorClassName, naturalRange, ...props }, ref) => {
  const normalValue = naturalRange ? Math.min(value || 0, naturalRange.max) : value || 0
  const excessValue = naturalRange && (value || 0) > naturalRange.max ? (value || 0) - naturalRange.max : 0

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-2 w-full overflow-visible rounded-full bg-secondary flex items-center", className)}
      {...props}
    >
      <div
        className={cn(
          "absolute h-full transition-all rounded-l-full",
          excessValue > 0 ? "" : "rounded-r-full",
          indicatorClassName,
        )}
        style={{ width: `${normalValue}%` }}
      />

      {excessValue > 0 && (
        <div
          className="absolute h-full transition-all rounded-r-full"
          style={{
            left: `${naturalRange?.max}%`,
            width: `${excessValue}%`,
            background: `repeating-linear-gradient(
              45deg,
              rgba(248, 113, 113, 0.8),
              rgba(248, 113, 113, 0.8) 4px,
              rgba(239, 68, 68, 0.8) 4px,
              rgba(239, 68, 68, 0.8) 8px
            )`,
          }}
        />
      )}
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
