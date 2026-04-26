"use client"

import { useCallback, useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeftRight,
  Calendar as CalendarIcon,
  Search,
  User,
} from "lucide-react"

import { getCurrentUserFn } from "@/lib/auth"
import { listGlobeRoutesFn, searchFlightsFn } from "@/lib/queries"
import type { FlightOption, FlightSearchResponse } from "@/lib/queries"
import { GlobeBackground } from "@/components/globe-background"
import { AirportCombobox } from "@/components/airport-combobox"
import { FlightResultCard } from "@/components/flight-result-card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/app-config"
import airportCoordinates from "@/data/airport-coordinates.json"

const coords = airportCoordinates as Record<
  string,
  { lat: number; lng: number }
>

export const Route = createFileRoute("/")({
  loader: async () => {
    const [currentUser, routes] = await Promise.all([
      getCurrentUserFn(),
      listGlobeRoutesFn(),
    ])
    return { currentUser, routes }
  },
  component: PublicHomePage,
})

type AirportSelection = {
  city: string
  code: string
  country: string
}

type CameraState =
  | { type: "idle" }
  | { type: "origin-focus"; lat: number; lng: number }
  | {
      type: "route-focus"
      originLat: number
      originLng: number
      destLat: number
      destLng: number
    }

type SearchFormValues = {
  departureDate: string
  destination: string
  returnDate: string
  source: string
  tripType: "one-way" | "round-trip"
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

function PublicHomePage() {
  const { currentUser, routes } = Route.useLoaderData()
  const navigate = useNavigate()

  // Airport selections (not part of the text form values)
  const [fromAirport, setFromAirport] = useState<AirportSelection | null>(null)
  const [toAirport, setToAirport] = useState<AirportSelection | null>(null)

  // Camera state
  const [camera, setCamera] = useState<CameraState>({ type: "idle" })

  // Whether a search has been triggered
  const [hasSearched, setHasSearched] = useState(false)

  // TanStack Form
  const form = useForm({
    defaultValues: {
      source: "",
      destination: "",
      departureDate: "",
      returnDate: "",
      tripType: "one-way" as "one-way" | "round-trip",
    } satisfies SearchFormValues,
    onSubmit: async () => {
      if (fromAirport || toAirport) {
        setHasSearched(true)
      }
    },
  })

  // Track search-driving values as state (reactive for useQuery)
  const [departureDateValue, setDepartureDateValue] = useState("")
  const [returnDateValue, setReturnDateValue] = useState("")
  const [tripTypeValue, setTripTypeValue] = useState<"one-way" | "round-trip">("one-way")

  // Search query — driven by form values + airport selections
  const searchEnabled = hasSearched && (!!fromAirport || !!toAirport)

  const searchQuery = useQuery({
    queryKey: [
      "flight-search",
      fromAirport?.code,
      toAirport?.code,
      departureDateValue,
      returnDateValue,
      tripTypeValue,
    ],
    queryFn: () =>
      searchFlightsFn({
        data: {
          source: fromAirport?.code ?? "",
          destination: toAirport?.code ?? "",
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

  // Derive result routes for globe
  const resultRoutes = useMemo(() => {
    if (!results) return undefined
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

  // Airport selection handlers (update form + camera)
  const handleFromSelect = useCallback(
    (airport: AirportSelection) => {
      setFromAirport(airport)
      form.setFieldValue("source", `${airport.city} (${airport.code})`)
      const c = coords[airport.code]
      if (toAirport) {
        const tc = coords[toAirport.code]
        if (c && tc) {
          setCamera({
            type: "route-focus",
            originLat: c.lat,
            originLng: c.lng,
            destLat: tc.lat,
            destLng: tc.lng,
          })
        }
        setHasSearched(true)
        return
      }
      if (c) {
        setCamera({ type: "origin-focus", lat: c.lat, lng: c.lng })
      }
    },
    [toAirport, form]
  )

  const handleToSelect = useCallback(
    (airport: AirportSelection) => {
      setToAirport(airport)
      form.setFieldValue("destination", `${airport.city} (${airport.code})`)
      if (fromAirport) {
        const fc = coords[fromAirport.code]
        const tc = coords[airport.code]
        if (fc && tc) {
          setCamera({
            type: "route-focus",
            originLat: fc.lat,
            originLng: fc.lng,
            destLat: tc.lat,
            destLng: tc.lng,
          })
        }
        setHasSearched(true)
      } else {
        const c = coords[airport.code]
        if (c) {
          setCamera({ type: "origin-focus", lat: c.lat, lng: c.lng })
        }
      }
    },
    [fromAirport, form]
  )

  const handleSwap = useCallback(() => {
    const prevFromAirport = fromAirport
    const prevToAirport = toAirport
    const prevSource = form.getFieldValue("source")
    const prevDest = form.getFieldValue("destination")
    setFromAirport(prevToAirport)
    setToAirport(prevFromAirport)
    form.setFieldValue("source", prevDest)
    form.setFieldValue("destination", prevSource)
    if (prevFromAirport && prevToAirport) {
      const fc = coords[prevToAirport.code]
      const tc = coords[prevFromAirport.code]
      if (fc && tc) {
        setCamera({
          type: "route-focus",
          originLat: fc.lat,
          originLng: fc.lng,
          destLat: tc.lat,
          destLng: tc.lng,
        })
      }
      setHasSearched(true)
    }
  }, [fromAirport, toAirport, form])

  const handleBook = useCallback(
    (_flight: FlightOption) => {
      if (!currentUser) {
        void navigate({ to: "/login" })
      }
    },
    [currentUser, navigate]
  )

  const showResults = hasSearched && (!!results || isLoading || !!searchError)

  return (
    <div className="dark relative min-h-screen bg-black text-white">
      {/* Globe */}
      <GlobeBackground
        camera={camera}
        routes={routes}
        resultRoutes={resultRoutes}
      />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          {APP_NAME}
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-md">
          <Link
            to="/"
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white"
          >
            Search
          </Link>
          {currentUser ? (
            <Link
              to="/customer"
              className="rounded-full px-4 py-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
            >
              Trips
            </Link>
          ) : null}
        </div>

        <div>
          {currentUser ? (
            <div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <User className="size-4 text-white/60" />
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main
        className={cn(
          "relative z-10 mx-auto flex max-w-3xl flex-col items-center px-4 transition-all duration-500",
          showResults ? "pt-4" : "pt-[20vh] md:pt-[25vh]"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* Search cluster */}
        <div className="w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
          >
            {/* Glass search bar */}
            <div className="flex flex-col gap-0 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl backdrop-saturate-150 md:flex-row md:items-stretch">
              {/* From */}
              <div className="flex-[1.4] border-b border-white/[0.06] py-3 md:border-b-0 md:border-r">
                <label className="mb-1 block px-3 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                  From
                </label>
                <form.Field name="source">
                  {(field) => (
                    <AirportCombobox
                      value={field.state.value}
                      onValueChange={(v) => {
                        field.handleChange(v)
                        if (
                          fromAirport &&
                          v !==
                            `${fromAirport.city} (${fromAirport.code})`
                        ) {
                          setFromAirport(null)
                          if (!toAirport) {
                            setCamera({ type: "idle" })
                            setHasSearched(false)
                          }
                        }
                      }}
                      onSelect={handleFromSelect}
                      placeholder="Select origin"
                    />
                  )}
                </form.Field>
              </div>

              {/* Swap button */}
              <div className="relative z-10 flex items-center justify-center md:-mx-4">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/40 backdrop-blur-md transition-colors hover:bg-white/15 hover:text-white active:scale-95"
                >
                  <ArrowLeftRight className="size-3.5" />
                </button>
              </div>

              {/* To */}
              <div className="flex-[1.4] border-b border-white/[0.06] py-3 md:border-b-0 md:border-r">
                <label className="mb-1 block px-3 text-[10px] font-medium tracking-widest text-white/40 uppercase">
                  To
                </label>
                <form.Field name="destination">
                  {(field) => (
                    <AirportCombobox
                      value={field.state.value}
                      onValueChange={(v) => {
                        field.handleChange(v)
                        if (
                          toAirport &&
                          v !== `${toAirport.city} (${toAirport.code})`
                        ) {
                          setToAirport(null)
                          if (!fromAirport) {
                            setCamera({ type: "idle" })
                            setHasSearched(false)
                          }
                        }
                      }}
                      onSelect={handleToSelect}
                      placeholder="Select destination"
                    />
                  )}
                </form.Field>
              </div>

              {/* Depart */}
              <div className="flex-1 border-b border-white/[0.06] py-3 md:border-b-0 md:border-r">
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
                        // Clamp return date
                        const ret = parseDateKey(
                          form.getFieldValue("returnDate")
                        )
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

              {/* Return */}
              <form.Subscribe selector={(s) => s.values.tripType}>
                {(tripType) =>
                  tripType === "round-trip" ? (
                    <div className="flex-1 border-b border-white/[0.06] py-3 md:border-b-0 md:border-r">
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
                            placeholder="Select date"
                            minDate={
                              parseDateKey(
                                form.getFieldValue("departureDate")
                              ) ?? new Date()
                            }
                          />
                        )}
                      </form.Field>
                    </div>
                  ) : null
                }
              </form.Subscribe>

              {/* Search button */}
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-b-2xl border-t border-white/[0.06] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.06] active:scale-[0.98] md:rounded-r-2xl md:rounded-bl-none md:border-t-0 md:border-l md:border-white/[0.06]"
              >
                <Search className="size-4" />
                <span className="md:hidden">Search</span>
              </button>
            </div>
          </form>

          {/* Trip type toggle */}
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

        {/* Results */}
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

            {results && results.outbound.length > 0 && (
              <div className="space-y-3">
                <div className="mb-2 text-xs font-medium tracking-widest text-white/30 uppercase">
                  {results.outbound.length} flight
                  {results.outbound.length !== 1 ? "s" : ""} found
                </div>
                {results.outbound.map((flight, i) => (
                  <FlightResultCard
                    key={`${flight.flightNumber}-${flight.departureDatetime}`}
                    flight={flight}
                    index={i}
                    onBook={handleBook}
                  />
                ))}
              </div>
            )}

            {results && results.outbound.length === 0 && !isLoading && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="text-white/30">No flights found</div>
                <div className="text-sm text-white/20">
                  Try different airports or dates
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHasSearched(false)
                    setCamera({ type: "idle" })
                  }}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-sm text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                >
                  Clear search
                </button>
              </div>
            )}

            {/* Round trip return flights */}
            <form.Subscribe selector={(s) => s.values.tripType}>
              {(tripType) =>
                results &&
                tripType === "round-trip" &&
                results.returnOptions.length > 0 ? (
                  <div className="mt-8 space-y-3">
                    <div className="mb-2 text-xs font-medium tracking-widest text-white/30 uppercase">
                      Return flights
                    </div>
                    {results.returnOptions.map((flight, i) => (
                      <FlightResultCard
                        key={`return-${flight.flightNumber}-${flight.departureDatetime}`}
                        flight={flight}
                        index={i}
                        onBook={handleBook}
                      />
                    ))}
                  </div>
                ) : null
              }
            </form.Subscribe>
          </div>
        )}
      </main>
    </div>
  )
}

// Date picker field for the glass search bar
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
        <span
          className={cn("text-sm", value ? "text-white" : "text-white/30")}
        >
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

