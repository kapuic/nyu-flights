import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { searchAirportsFn } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

function getFieldErrorMessage(meta: {
  errors?: unknown[]
  isTouched?: boolean
  isValid?: boolean
}) {
  if (meta.isValid) return null
  const firstError = meta.errors?.[0]
  return typeof firstError === "string" ? firstError : null
}

function formatDateTimeLocalValue(value: string) {
  if (!value) return ""
  return value.slice(0, 16)
}

function parseDateTimeLocalValue(value: string) {
  if (!value) return ""
  return `${value}:00`
}

export type FlightSearchValues = {
  departureDate: string
  destination: string
  returnDate: string
  source: string
  tripType: "one-way" | "round-trip"
}

type AirportSuggestion = {
  city: string
  code: string
  country: string
}

type FlightSearchPanelProps = {
  busy?: boolean
  defaultValues?: Partial<FlightSearchValues>
  onSubmit: (values: FlightSearchValues) => Promise<void> | void
}

function parseDateValue(value: string) {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDateValue(date: Date | undefined) {
  if (!date) return ""
  return format(date, "yyyy-MM-dd")
}

export function DatePickerButtonField({
  className,
  disabled,
  error,
  id,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  className?: string
  disabled?: boolean
  error?: string | null
  id: string
  onBlur?: () => void
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  const selectedDate = parseDateValue(value)

  return (
    <div className="space-y-1.5">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              id={id}
              disabled={disabled}
              onBlur={onBlur}
              variant="outline"
              data-empty={!selectedDate}
              className={cn(
                "w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground",
                error
                  ? "border-destructive focus-visible:ring-destructive/20"
                  : undefined,
                className
              )}
            />
          }
        >
          <CalendarIcon data-icon="inline-start" />
          {selectedDate ? (
            format(selectedDate, "PPP")
          ) : (
            <span>{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            captionLayout="dropdown"
            mode="single"
            selected={selectedDate}
            onSelect={(date) => onChange(formatDateValue(date))}
          />
        </PopoverContent>
      </Popover>
      <InlineFieldError error={error} />
    </div>
  )
}

export function AirportAutocompleteInput({
  className,
  error,
  id,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  className?: string
  error?: string | null
  id: string
  onBlur?: () => void
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<AirportSuggestion[]>([])

  useEffect(() => {
    const query = value.trim()
    if (!query) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    let active = true
    const timeout = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const nextSuggestions = await searchAirportsFn({ data: { query } })
        if (active) setSuggestions(nextSuggestions)
      } finally {
        if (active) setIsLoading(false)
      }
    }, 300)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [value])

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          autoComplete="off"
          className={cn(
            error
              ? "border-destructive focus-visible:ring-destructive/20"
              : undefined,
            className
          )}
          id={id}
          onBlur={() => {
            onBlur?.()
            window.setTimeout(() => setIsOpen(false), 120)
          }}
          onChange={(event) => {
            onChange(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          value={value}
        />
        {isOpen && (value.trim() || suggestions.length || isLoading) ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                Searching airports…
              </div>
            ) : null}
            {!isLoading && suggestions.length ? (
              <div className="max-h-64 overflow-y-auto py-1">
                {suggestions.map((suggestion) => (
                  <button
                    className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
                    key={`${suggestion.code}-${suggestion.city}`}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onChange(suggestion.code)
                      setIsOpen(false)
                    }}
                    type="button"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-950">
                        {suggestion.city}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {suggestion.country}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-600">
                      {suggestion.code}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
            {!isLoading && value.trim() && !suggestions.length ? (
              <div className="px-3 py-2 text-sm text-slate-500">
                No airport suggestions found.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <InlineFieldError error={error} />
    </div>
  )
}

export function InlineFieldError({
  className,
  error,
}: {
  className?: string
  error?: string | null
}) {
  if (!error) return null

  return <p className={cn("text-xs text-destructive", className)}>{error}</p>
}

export function DateTimePickerButtonField({
  className,
  disabled,
  error,
  id,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  className?: string
  disabled?: boolean
  error?: string | null
  id: string
  onBlur?: () => void
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  const localValue = formatDateTimeLocalValue(value)

  return (
    <div className="space-y-1.5">
      <Input
        className={cn(
          error
            ? "border-destructive focus-visible:ring-destructive/20"
            : undefined,
          className
        )}
        disabled={disabled}
        id={id}
        onBlur={onBlur}
        onChange={(event) =>
          onChange(parseDateTimeLocalValue(event.target.value))
        }
        placeholder={placeholder}
        type="datetime-local"
        value={localValue}
      />
      <InlineFieldError error={error} />
    </div>
  )
}

export function FormFieldError({
  className,
  field,
}: {
  className?: string
  field: {
    state: {
      meta: { errors?: unknown[]; isTouched?: boolean; isValid?: boolean }
    }
  }
}) {
  return (
    <InlineFieldError
      className={className}
      error={getFieldErrorMessage(field.state.meta)}
    />
  )
}

export function getFormFieldError(field: {
  state: {
    meta: { errors?: unknown[]; isTouched?: boolean; isValid?: boolean }
  }
}) {
  return getFieldErrorMessage(field.state.meta)
}

export function getFormError(
  errorMap: Record<string, unknown> | undefined,
  key: string
) {
  const error = errorMap?.[key]
  return typeof error === "string" ? error : null
}

export function FlightSearchPanel({
  busy,
  defaultValues,
  onSubmit,
}: FlightSearchPanelProps) {
  const [values, setValues] = useState<FlightSearchValues>({
    departureDate: defaultValues?.departureDate ?? "",
    destination: defaultValues?.destination ?? "",
    returnDate: defaultValues?.returnDate ?? "",
    source: defaultValues?.source ?? "",
    tripType: defaultValues?.tripType ?? "one-way",
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <form
      className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[140px_1fr_1fr_190px_190px_auto] xl:items-end">
        <div className="space-y-2">
          <Label htmlFor="tripType">Trip</Label>
          <Select
            onValueChange={(value) =>
              setValues((current) => ({
                ...current,
                tripType: value as FlightSearchValues["tripType"],
              }))
            }
            value={values.tripType}
          >
            <SelectTrigger className="w-full" id="tripType">
              <SelectValue placeholder="Trip type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-way">One way</SelectItem>
              <SelectItem value="round-trip">Round trip</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">From</Label>
          <AirportAutocompleteInput
            id="source"
            onChange={(source) =>
              setValues((current) => ({ ...current, source }))
            }
            placeholder="City or airport code"
            value={values.source}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <AirportAutocompleteInput
            id="destination"
            onChange={(destination) =>
              setValues((current) => ({ ...current, destination }))
            }
            placeholder="City or airport code"
            value={values.destination}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="departureDate">Departure</Label>
          <DatePickerButtonField
            id="departureDate"
            onChange={(departureDate) =>
              setValues((current) => ({ ...current, departureDate }))
            }
            placeholder="Select date"
            value={values.departureDate}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="returnDate">Return</Label>
          <DatePickerButtonField
            disabled={values.tripType !== "round-trip"}
            id="returnDate"
            onChange={(returnDate) =>
              setValues((current) => ({ ...current, returnDate }))
            }
            placeholder="Select date"
            value={values.returnDate}
          />
        </div>
        <Button
          className="h-10 rounded-[14px] bg-slate-950 text-white hover:bg-slate-800"
          disabled={busy}
          type="submit"
        >
          {busy ? "Searching…" : "Search flights"}
        </Button>
      </div>
    </form>
  )
}
