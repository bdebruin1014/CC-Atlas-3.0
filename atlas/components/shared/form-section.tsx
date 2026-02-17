"use client"

import * as React from "react"
import { cn } from "@/lib/utils/format"

// ---------------------------------------------------------------------------
// FormSection
// ---------------------------------------------------------------------------

interface FormSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn("mt-6", className)}>
      <div className="mb-4 border-b border-[#E5E7EB] pb-2">
        <h3 className="text-base font-semibold text-[#1F2937]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-[13px] text-[#5A6B75]">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormGrid
// ---------------------------------------------------------------------------

interface FormGridProps {
  children: React.ReactNode
  cols?: number
  className?: string
}

export function FormGrid({ children, cols = 2, className }: FormGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 md:grid-cols-2",
        cols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FormField
// ---------------------------------------------------------------------------

interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function FormField({ label, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[11px] font-medium uppercase tracking-[0.3px] text-[#6B7280]">
        {label}
        {required && <span className="ml-0.5 text-[#ef4444]">*</span>}
      </label>
      {children}
    </div>
  )
}
