import { useCallback, useEffect, useMemo, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar as CalendarIcon,
  RotateCcw,
  Search,
} from "lucide-react"

import { listDbAirportsFn, searchFlightsFn } from "@/lib/queries"
import type { FlightOption, FlightSearchResponse } from "@/lib/queries"
type SortKey = "price" | "duration" | "departure" | "arrival"
type SortDir = "asc" | "desc"
type SortState = { key: SortKey; dir: SortDir }

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "price", label: "Price" },
  { key: "duration", label: "Duration" },
  { key: "departure", label: "Departure Time" },
  { key: "arrival", label: "Arrival Time" },
]

const SORT_LABELS: Record<SortKey, { asc: string; desc: string }> = {
  price: { asc: "cheapest first", desc: "most expensive first" },
  duration: { asc: "shortest first", desc: "longest first" },
  departure: { asc: "earliest departure", desc: "latest departure" },
  arrival: { asc: "earliest arrival", desc: "latest arrival" },
}

function sortFlights(flights: FlightOption[], sort: SortState): FlightOption[] {
  const sorted = [...flights].sort((a, b) => {
    let cmp = 0
    switch (sort.key) {
      case "price":
        cmp = a.basePrice - b.basePrice
        break
      case "duration": {
        const dA =
          new Date(a.arrivalDatetime).getTime() -
          new Date(a.departureDatetime).getTime()
        const dB =
          new Date(b.arrivalDatetime).getTime() -
          new Date(b.departureDatetime).getTime()
        cmp = dA - dB
        break
      }
      case "departure":
        cmp =
          new Date(a.departureDatetime).getTime() -
          new Date(b.departureDatetime).getTime()
        break
      case "arrival":
        cmp =
          new Date(a.arrivalDatetime).getTime() -
          new Date(b.arrivalDatetime).getTime()
        break
    }
    return sort.dir === "asc" ? cmp : -cmp
  })
  return sorted
}
import { useBookingStore } from "@/lib/booking-store"
import type { AirportSelection } from "@/lib/booking-store"
import { AirportCombobox } from "@/components/airport-combobox"
import { FlightResultCard } from "@/components/flight-result-card"
import { formatCurrency } from "@/lib/format"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_globe/")({
  component: PublicHomePage,
})

type SearchFormValues = {
  departureDate: string
  destination: string
  returnDate: string
  source: string
  tripType: "one-way" | "round-trip"
}
function getRouteError(
  searchFrom: AirportSelection | null,
  searchTo: AirportSelection | null
) {
  return searchFrom && searchTo && searchFrom.code === searchTo.code
    ? "Origin and destination must differ."
    : null
}

function formatDateKey(d: Date | undefined) {
  if (!d) return ""
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parseDateKey(s: string): Date | undefined {
  if (!s) return undefined
  const d = new Date(s + "T00:00:00")
  return isNaN(d.getTime()) ? undefined : d
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function PublicHomePage() {
  const navigate = useNavigate()
  const { currentUser } = Route.useRouteContext()
  // DB airports for combobox
  const dbAirportsQuery = useQuery({
    queryKey: ["db-airports"],
    queryFn: () => listDbAirportsFn(),
    staleTime: 5 * 60 * 1000,
  })
  const dbAirports = dbAirportsQuery.data ?? []

  // Booking store
  const searchFrom = useBookingStore((s) => s.searchFrom)
  const searchTo = useBookingStore((s) => s.searchTo)
  const setSearch = useBookingStore((s) => s.setSearch)
  const setResultRoutes = useBookingStore((s) => s.setResultRoutes)
  const setShowAuthModal = useBookingStore((s) => s.setShowAuthModal)
  const selectOutbound = useBookingStore((s) => s.selectOutbound)
  const selectReturn = useBookingStore((s) => s.selectReturn)
  const routeError = getRouteError(searchFrom, searchTo)

  // Round-trip phase 2: outbound selected, picking return
  const [pickingReturn, setPickingReturn] = useState<FlightOption | null>(null)

  // Whether a search has been triggered
  const [hasSearched, setHasSearched] = useState(false)
  // Sort state
  const [sort, setSort] = useState<SortState>({ key: "price", dir: "asc" })
  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    )
  }

  // TanStack Form
  const form = useForm({
    defaultValues: {
      source: searchFrom ? `${searchFrom.city} (${searchFrom.code})` : "",
      destination: searchTo ? `${searchTo.city} (${searchTo.code})` : "",
      departureDate: "",
      returnDate: "",
      tripType: "one-way" as "one-way" | "round-trip",
    } satisfies SearchFormValues,
    onSubmit: async () => {
      if (searchFrom || searchTo) {
        if (getRouteError(searchFrom, searchTo)) return
        setHasSearched(true)
      }
    },
  })

  // Track search-driving values as state (reactive for useQuery)
  const [departureDateValue, setDepartureDateValue] = useState("")
  const [returnDateValue, setReturnDateValue] = useState("")
  const [tripTypeValue, setTripTypeValue] = useState<"one-way" | "round-trip">(
    "one-way"
  )

  // Auto-trigger search if store has airports (restoration after navigation)
  useEffect(() => {
    if ((searchFrom || searchTo) && !hasSearched) {
      setHasSearched(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Search query
  const searchEnabled = hasSearched && (!!searchFrom || !!searchTo)

  const searchQuery = useQuery({
    queryKey: [
      "flight-search",
      searchFrom?.code,
      searchTo?.code,
      departureDateValue,
      returnDateValue,
      tripTypeValue,
    ],
    queryFn: () =>
      searchFlightsFn({
        data: {
          source: searchFrom?.code ?? "",
          destination: searchTo?.code ?? "",
          departureDate: departureDateValue,
          returnDate: returnDateValue,
          tripType: tripTypeValue,
        },
      }),
    enabled: searchEnabled,
  })

  const results = searchQuery.data as FlightSearchResponse | undefined
  const isLoading =
    (searchQuery.isLoading || searchQuery.isFetching) && searchEnabled
  const searchError = searchQuery.error
  const sortedOutbound = useMemo(() => {
    if (!results) return []
    return sortFlights(results.outbound, sort)
  }, [results, sort])

  // Sync result routes to store for globe display
  const resultRoutes = useMemo(() => {
    if (!results) return []
    const seen = new Set<string>()
    return results.outbound
      .map((f) => ({
        departureCode: f.departureAirportCode,
        arrivalCode: f.arrivalAirportCode,
      }))
      .filter((r) => {
        const key = `${r.departureCode}-${r.arrivalCode}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [results])

  useEffect(() => {
    setResultRoutes(resultRoutes)
  }, [resultRoutes, setResultRoutes])

  // Eligible return flights for a given outbound
  const eligibleReturns = useMemo(() => {
    if (!results || tripTypeValue !== "round-trip") return []
    if (!pickingReturn) return results.returnOptions
    // Filter returns that depart after the selected outbound arrives
    const outboundArrival = new Date(pickingReturn.arrivalDatetime).getTime()
    return results.returnOptions.filter(
      (r) => new Date(r.departureDatetime).getTime() > outboundArrival
    )
  }, [results, tripTypeValue, pickingReturn])

  // Return flight previews for an outbound card
  const getReturnPreview = useCallback(
    (outbound: FlightOption) => {
      if (!results || tripTypeValue !== "round-trip") return null
      const arrivalTime = new Date(outbound.arrivalDatetime).getTime()
      const eligible = results.returnOptions.filter(
        (r) => new Date(r.departureDatetime).getTime() > arrivalTime
      )
      if (eligible.length === 0) return null
      const cheapest = Math.min(...eligible.map((r) => r.basePrice))
      return { count: eligible.length, cheapest, preview: eligible.slice(0, 3) }
    },
    [results, tripTypeValue]
  )

  // Airport selection handlers
  const handleFromSelect = useCallback(
    (airport: AirportSelection) => {
      setPickingReturn(null)
      if (searchTo && airport.code === searchTo.code) {
        return
      }
      setSearch({ searchFrom: airport })
      form.setFieldValue("source", `${airport.city} (${airport.code})`)
      if (searchTo) setHasSearched(true)
    },
    [searchTo, form, setSearch]
  )

  const handleToSelect = useCallback(
    (airport: AirportSelection) => {
      setPickingReturn(null)
      if (searchFrom && airport.code === searchFrom.code) {
        return
      }
      setSearch({ searchTo: airport })
      form.setFieldValue("destination", `${airport.city} (${airport.code})`)
      if (searchFrom) setHasSearched(true)
    },
    [searchFrom, form, setSearch]
  )

  const handleSwap = useCallback(() => {
    const prevFrom = searchFrom
    const prevTo = searchTo
    const prevSource = form.getFieldValue("source")
    const prevDest = form.getFieldValue("destination")
    setSearch({ searchFrom: prevTo, searchTo: prevFrom })
    form.setFieldValue("source", prevDest)
    form.setFieldValue("destination", prevSource)
    if (prevFrom && prevTo) setHasSearched(true)
  }, [searchFrom, searchTo, form, setSearch])

  const handleBook = useCallback(
    (flight: FlightOption) => {
      // Round-trip: first click selects outbound, show return picker
      if (tripTypeValue === "round-trip" && !pickingReturn) {
        setPickingReturn(flight)
        return
      }

      // One-way or return already picked: go to checkout
      if (!currentUser) {
        selectOutbound(pickingReturn ?? flight)
        if (pickingReturn) selectReturn(flight)
        setShowAuthModal(true)
        return
      }
      selectOutbound(pickingReturn ?? flight)
      if (pickingReturn) selectReturn(flight)
      void navigate({ to: "/checkout" })
    },
    [
      currentUser,
      navigate,
      selectOutbound,
      selectReturn,
      setShowAuthModal,
      tripTypeValue,
      pickingReturn,
    ]
  )

  const handleFromClear = useCallback(() => {
    setPickingReturn(null)
    setSearch({ searchFrom: null })
    if (!searchTo) setHasSearched(false)
  }, [searchTo, setSearch])

  const handleToClear = useCallback(() => {
    setPickingReturn(null)
    setSearch({ searchTo: null })
    if (!searchFrom) setHasSearched(false)
  }, [searchFrom, setSearch])

  const showResults = hasSearched && (!!results || isLoading || !!searchError)

  return (
    <main
      className={cn(
        "relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 transition-all duration-500",
        showResults ? "pt-4" : "pt-[20vh] md:pt-[25vh]"
      )}
      style={{
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <div className="w-full">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <div className="flex flex-col gap-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl backdrop-saturate-150 md:flex-row md:items-stretch">
            <div className="flex-[1.4] border-b border-white/[0.06] py-3 md:border-r md:border-b-0">
              <label className="mb-1 block px-3 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                From
              </label>
              <form.Field name="source">
                {(field) => (
                  <AirportCombobox
                    items={dbAirports}
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v)
                      if (
                        searchFrom &&
                        v !== `${searchFrom.city} (${searchFrom.code})`
                      ) {
                        handleFromClear()
                      }
                    }}
                    onSelect={handleFromSelect}
                    placeholder={searchTo ? "Any origin" : "Select origin"}
                  />
                )}
              </form.Field>
            </div>

            <div className="relative z-10 flex items-center justify-center md:-mx-4">
              <button
                type="button"
                onClick={handleSwap}
                className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/40 backdrop-blur-md transition-colors hover:bg-white/15 hover:text-white active:scale-95"
              >
                <ArrowLeftRight className="size-3.5" />
              </button>
            </div>

            <div className="flex-[1.4] border-b border-white/[0.06] py-3 md:border-r md:border-b-0">
              <label className="mb-1 block px-3 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                To
              </label>
              <form.Field name="destination">
                {(field) => (
                  <AirportCombobox
                    items={dbAirports}
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v)
                      if (
                        searchTo &&
                        v !== `${searchTo.city} (${searchTo.code})`
                      ) {
                        handleToClear()
                      }
                    }}
                    onSelect={handleToSelect}
                    placeholder={
                      searchFrom ? "Any destination" : "Select destination"
                    }
                  />
                )}
              </form.Field>
            </div>

            <div className="flex-1 border-b border-white/[0.06] py-3 md:border-r md:border-b-0">
              <label className="mb-1 block px-3 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                Depart
              </label>
              <form.Field name="departureDate">
                {(field) => (
                  <DatePickerField
                    value={parseDateKey(field.state.value)}
                    onChange={(d) => {
                      const key = formatDateKey(d)
                      field.handleChange(key)
                      setDepartureDateValue(key)
                      const ret = parseDateKey(form.getFieldValue("returnDate"))
                      if (d && ret && ret < d) {
                        form.setFieldValue("returnDate", "")
                        setReturnDateValue("")
                      }
                    }}
                    placeholder="Select date"
                    minDate={new Date()}
                  />
                )}
              </form.Field>
            </div>

            <form.Subscribe selector={(s) => s.values.tripType}>
              {(tripType) =>
                tripType === "round-trip" ? (
                  <div className="flex-1 border-b border-white/[0.06] py-3 md:border-r md:border-b-0">
                    <label className="mb-1 block px-3 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                      Return
                    </label>
                    <form.Field name="returnDate">
                      {(field) => (
                        <DatePickerField
                          value={parseDateKey(field.state.value)}
                          onChange={(d) => {
                            const key = formatDateKey(d)
                            field.handleChange(key)
                            setReturnDateValue(key)
                          }}
                          placeholder="Any date"
                          minDate={
                            parseDateKey(form.getFieldValue("departureDate")) ??
                            new Date()
                          }
                        />
                      )}
                    </form.Field>
                  </div>
                ) : null
              }
            </form.Subscribe>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-b-2xl border-t border-white/[0.06] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] active:scale-[0.98] md:rounded-r-2xl md:rounded-bl-none md:border-t-0 md:border-l md:border-white/[0.06]"
            >
              <Search className="size-4" />
              <span className="md:hidden">Search</span>
            </button>
          </div>
        </form>

        {routeError && (
          <div className="mt-2 text-center text-sm text-red-400">
            {routeError}
          </div>
        )}

        <div className="mt-3 flex items-center justify-center gap-1">
          <form.Subscribe selector={(s) => s.values.tripType}>
            {(tripType) => (
              <>
                <button
                  type="button"
                  onClick={() => {
                    form.setFieldValue("tripType", "one-way")
                    form.setFieldValue("returnDate", "")
                    setTripTypeValue("one-way")
                    setReturnDateValue("")
                    setPickingReturn(null)
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition-colors",
                    tripType === "one-way"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  One way
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setFieldValue("tripType", "round-trip")
                    setTripTypeValue("round-trip")
                  }}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm transition-colors",
                    tripType === "round-trip"
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  Round trip
                </button>
              </>
            )}
          </form.Subscribe>
        </div>
      </div>

      {showResults && (
        <div className="mt-8 w-full pb-24">
          {isLoading && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
                />
              ))}
            </div>
          )}
          {searchError && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="text-white/30">Something went wrong</div>
              <button
                type="button"
                onClick={() => searchQuery.refetch()}
                className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
              >
                Try again
              </button>
            </div>
          )}

          {pickingReturn && results ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.06] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-widest text-white/60 uppercase">
                      Outbound
                    </span>
                    <span className="text-sm font-medium text-white">
                      {pickingReturn.departureAirportCode} →{" "}
                      {pickingReturn.arrivalAirportCode}
                    </span>
                    <span className="text-xs text-white/40">
                      {formatTime(pickingReturn.departureDatetime)} –{" "}
                      {formatTime(pickingReturn.arrivalDatetime)}
                    </span>
                    <span className="text-sm text-white/60">
                      {formatCurrency(pickingReturn.basePrice)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickingReturn(null)}
                    className="flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70"
                  >
                    <RotateCcw className="size-3" />
                    Change
                  </button>
                </div>
              </div>

              <div className="mb-2 text-xs font-medium tracking-widest text-white/30 uppercase">
                Select your return flight
                {eligibleReturns.length > 0 &&
                  ` · ${eligibleReturns.length} option${eligibleReturns.length !== 1 ? "s" : ""}`}
              </div>

              {eligibleReturns.length > 0 ? (
                <div className="space-y-3">
                  {eligibleReturns.map((flight, i) => (
                    <FlightResultCard
                      key={`return-${flight.flightNumber}-${flight.departureDatetime}`}
                      flight={flight}
                      index={i}
                      onBook={handleBook}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-white/30">
                  No return flights available after your outbound arrival.
                </div>
              )}
            </div>
          ) : null}

          {!pickingReturn && results && results.outbound.length > 0 && (
            <div className="@container space-y-3">
              <div className="mb-2 flex flex-col gap-2 @sm:flex-row @sm:items-center @sm:justify-between">
                <span className="text-xs font-medium tracking-widest text-white/30 uppercase">
                  {results.outbound.length} flight
                  {results.outbound.length !== 1 ? "s" : ""}
                  {" · "}
                  {SORT_LABELS[sort.key][sort.dir]}
                </span>
                <div className="flex items-center gap-1">
                  {SORT_OPTIONS.map((opt) => {
                    const active = sort.key === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => toggleSort(opt.key)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[10px] font-medium tracking-wide transition-colors",
                          active
                            ? "bg-white/10 text-white/70"
                            : "text-white/25 hover:text-white/40"
                        )}
                      >
                        {opt.label}
                        {active && (
                          <span className="ml-0.5">
                            {sort.dir === "asc" ? "\u2191" : "\u2193"}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              {sortedOutbound.map((flight, i) => {
                const returnInfo =
                  tripTypeValue === "round-trip"
                    ? getReturnPreview(flight)
                    : null
                return (
                  <div
                    key={`${flight.flightNumber}-${flight.departureDatetime}`}
                  >
                    <FlightResultCard
                      flight={flight}
                      index={i}
                      onBook={handleBook}
                    />

                    {returnInfo && (
                      <div className="mx-2 -mt-1 rounded-b-lg border border-t-0 border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
                        <div className="mb-1.5 text-[10px] font-medium tracking-widest text-white/30 uppercase">
                          {returnInfo.count} return
                          {returnInfo.count !== 1 ? "s" : ""} from{" "}
                          {formatCurrency(returnInfo.cheapest)}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          {returnInfo.preview.map((ret) => (
                            <div
                              key={`preview-${ret.flightNumber}-${ret.departureDatetime}`}
                              className="flex items-center justify-between rounded-md bg-white/[0.04] px-3 py-1.5 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-white/60">
                                  {formatTime(ret.departureDatetime)}
                                </span>
                                <ArrowRight className="size-2.5 text-white/20" />
                                <span className="text-white/60">
                                  {formatTime(ret.arrivalDatetime)}
                                </span>
                              </div>
                              <span className="text-white/40">
                                {formatCurrency(ret.basePrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {returnInfo.count > 3 && (
                          <div className="mt-1 text-[10px] text-white/20">
                            +{returnInfo.count - 3} more
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!pickingReturn &&
            results &&
            results.outbound.length === 0 &&
            !isLoading && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="text-white/30">No flights found</div>
                <div className="text-sm text-white/20">
                  Try different airports or dates
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasSearched(false)
                    setSearch({ searchFrom: null, searchTo: null })
                  }}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                >
                  Clear search
                </button>
              </div>
            )}
        </div>
      )}
    </main>
  )
}

function DatePickerField({
  value,
  onChange,
  placeholder,
  minDate,
}: {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  placeholder: string
  minDate?: Date
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-full items-center gap-2 px-3 text-sm"
          />
        }
      >
        <CalendarIcon className="size-4 shrink-0 text-white/40" />
        <span className={cn("text-sm", value ? "text-white" : "text-white/30")}>
          {value
            ? value.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : placeholder}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto border-white/10 bg-white/[0.06] p-0 text-white backdrop-blur-2xl"
        align="start"
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d)
            setOpen(false)
          }}
          disabled={{ before: minDate ?? new Date() }}
          className="text-white [--cell-size:--spacing(9)]"
        />
      </PopoverContent>
    </Popover>
  )
}
