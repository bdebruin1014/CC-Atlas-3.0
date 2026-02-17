import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as US currency (e.g. "$123,456")
 */
export function formatCurrency(
  value: number | null | undefined,
  options?: { decimals?: number; compact?: boolean }
): string {
  if (value == null || isNaN(value)) return '$0'
  const decimals = options?.decimals ?? 0
  if (options?.compact && Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (options?.compact && Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format a date string or Date object (e.g. "Jan 15, 2025")
 */
export function formatDate(
  value: string | Date | null | undefined,
  options?: { includeTime?: boolean; short?: boolean }
): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (isNaN(date.getTime())) return '—'
  if (options?.short) {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    })
  }
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (options?.includeTime) {
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
    return `${formatted} ${time}`
  }
  return formatted
}

/**
 * Format a number as a percentage (e.g. "12.5%")
 */
export function formatPercent(
  value: number | null | undefined,
  decimals: number = 1
): string {
  if (value == null || isNaN(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}
