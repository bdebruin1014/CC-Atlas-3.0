"use client"

import React from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowDown, ArrowUp } from "lucide-react"

import { cn } from "@/lib/utils/format"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  title: string
  value?: string
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    direction: "up" | "down"
  }
  loading?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            {loading ? (
              <>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3.5 w-32" />
              </>
            ) : (
              <>
                <p className="text-2xl font-bold tracking-tight">
                  {value ?? "--"}
                </p>
                {(description || trend) && (
                  <div className="flex items-center gap-1.5">
                    {trend && (
                      <span
                        className={cn(
                          "inline-flex items-center text-xs font-medium",
                          trend.direction === "up"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        )}
                      >
                        {trend.direction === "up" ? (
                          <ArrowUp className="mr-0.5 h-3 w-3" />
                        ) : (
                          <ArrowDown className="mr-0.5 h-3 w-3" />
                        )}
                        {Math.abs(trend.value)}%
                      </span>
                    )}
                    {description && (
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
