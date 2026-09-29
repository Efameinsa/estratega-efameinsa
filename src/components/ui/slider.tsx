"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  className?: string
  min?: number
  max?: number
  step?: number
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number | number[]) => void
  disabled?: boolean
}

function Slider({
  className,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onValueChange,
  disabled,
  ...props
}: SliderProps) {
  const currentValue = value?.[0] ?? defaultValue?.[0] ?? min

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={currentValue}
      disabled={disabled}
      className={cn(
        "w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-primary disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      onChange={(e) => {
        const v = Number(e.target.value)
        onValueChange?.(v)
      }}
      {...props}
    />
  )
}

export { Slider }
