"use client"

import { useRef, useEffect, useState, useCallback } from "react"

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error"

interface UseAutoSaveOptions {
  debounceMs?: number
  savedDurationMs?: number
}

/**
 * Watches form data for changes and auto-saves via debounced mutation.
 * Returns the current save status for display in the UI.
 */
export function useAutoSave<T extends Record<string, unknown>>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options?: UseAutoSaveOptions
) {
  const { debounceMs = 800, savedDurationMs = 2000 } = options ?? {}
  const [status, setStatus] = useState<AutoSaveStatus>("idle")
  const [error, setError] = useState<string | undefined>()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevRef = useRef<string>("")
  const saveFnRef = useRef(saveFn)
  const mountedRef = useRef(false)
  saveFnRef.current = saveFn

  // Serialize data for comparison
  const serialized = JSON.stringify(data)

  useEffect(() => {
    // Skip the very first render — we don't want to save on mount
    if (!mountedRef.current) {
      mountedRef.current = true
      prevRef.current = serialized
      return
    }

    // If data hasn't changed, skip
    if (serialized === prevRef.current) return
    prevRef.current = serialized

    // Clear any pending save
    if (timerRef.current) clearTimeout(timerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)

    timerRef.current = setTimeout(async () => {
      setStatus("saving")
      setError(undefined)
      try {
        await saveFnRef.current(data)
        setStatus("saved")
        savedTimerRef.current = setTimeout(() => {
          setStatus("idle")
        }, savedDurationMs)
      } catch (err) {
        setStatus("error")
        setError(err instanceof Error ? err.message : "Save failed")
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, debounceMs, savedDurationMs])

  const retry = useCallback(async () => {
    setStatus("saving")
    setError(undefined)
    try {
      await saveFnRef.current(data)
      setStatus("saved")
      savedTimerRef.current = setTimeout(() => {
        setStatus("idle")
      }, savedDurationMs)
    } catch (err) {
      setStatus("error")
      setError(err instanceof Error ? err.message : "Save failed")
    }
  }, [data, savedDurationMs])

  return { status, error, retry }
}
