"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MapPin } from "lucide-react"

import { CountryFlag } from "@/components/country-flag"
import { getAirportDisplayValue } from "@/lib/airports"
import type { AirportOption } from "@/lib/airports"
import { cn } from "@/lib/utils"

type AirportSuggestion = AirportOption

type AirportComboboxProps = {
  className?: string
  icon?: React.ReactNode
  items?: Array<AirportSuggestion>
  onSelect: (airport: AirportSuggestion) => void
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
}

export function AirportCombobox({
  className,
  icon,
  items = [],
  onSelect,
  placeholder = "Select airport",
  value,
  onValueChange,
}: AirportComboboxProps) {
  const [suggestions, setSuggestions] = useState<Array<AirportSuggestion>>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const fetchSuggestions = useCallback(
    (query: string) => {
      const normalizedQuery = query.trim().toLowerCase()
      if (normalizedQuery.length === 0) {
        setSuggestions([])
        setOpen(false)
        setLoading(false)
        return
      }

      const nextSuggestions = items
        .filter((airport) =>
          `${airport.code} ${airport.city} ${airport.name} ${airport.country}`
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 12)

      setLoading(true)
      window.setTimeout(() => {
        setSuggestions(nextSuggestions)
        setOpen(nextSuggestions.length > 0)
        setHighlightIndex(-1)
        setLoading(false)
      }, 0)
    },
    [items]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onValueChange(newValue)

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchSuggestions(newValue), 300)
    },
    [onValueChange, fetchSuggestions]
  )

  const handleSelect = useCallback(
    (airport: AirportSuggestion) => {
      onValueChange(getAirportDisplayValue(airport))
      onSelect(airport)
      setOpen(false)
      setSuggestions([])
      inputRef.current?.blur()
    },
    [onValueChange, onSelect]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) return

      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter" && highlightIndex >= 0) {
        e.preventDefault()
        handleSelect(suggestions[highlightIndex])
      } else if (e.key === "Escape") {
        setOpen(false)
      }
    },
    [open, suggestions, highlightIndex, handleSelect]
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      <div className="flex h-9 items-center gap-2 px-3">
        {icon ?? <MapPin className="size-4 shrink-0 text-white/40" />}
        <input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true)
          }}
          placeholder={placeholder}
          className="h-9 w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          autoComplete="off"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 z-50 mt-2 max-h-72 w-64 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-white/10 bg-black/80 shadow-2xl backdrop-blur-2xl backdrop-saturate-150"
        >
          {suggestions.map((airport, i) => (
            <button
              key={airport.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(airport)}
              onMouseEnter={() => setHighlightIndex(i)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                i === highlightIndex
                  ? "bg-white/10 text-white"
                  : "text-white/70 hover:bg-white/5"
              )}
            >
              <CountryFlag countryCode={airport.countryCode} size={16} />
              <div className="min-w-0">
                <div className="truncate font-medium text-white/90">
                  {getAirportDisplayValue(airport)}
                </div>
                <div className="truncate text-xs text-white/40">
                  {airport.name} · {airport.country}
                </div>
              </div>
            </button>
          ))}
          {loading && (
            <div className="px-3 py-2 text-xs text-white/30">Searching…</div>
          )}
        </div>
      )}

      {open &&
        suggestions.length === 0 &&
        !loading &&
        value.trim().length > 0 && (
          <div className="absolute top-full left-0 z-50 mt-2 w-64 rounded-lg border border-white/10 bg-black/80 px-3 py-3 text-sm text-white/40 shadow-2xl backdrop-blur-2xl">
            No airports found
          </div>
        )}
    </div>
  )
}
