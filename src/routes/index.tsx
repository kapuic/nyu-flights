import { useForm } from "@tanstack/react-form"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import {
  ArrowRightLeft,
  ChevronDown,
  CircleAlert,
  Plane,
  Search,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import type { FlightOption } from "@/lib/queries"
import { TravelerShell } from "@/components/traveler-shell"
import {
  AirportAutocompleteInput,
  DatePickerButtonField,
  getFormFieldError,
} from "@/components/flight-search-panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatCurrency, titleCaseStatus } from "@/lib/format"
import { searchFlightsFn } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: PublicHomePage,
})

function validateAirportValue(label: string, value: string) {
  return value.trim() ? undefined : `Choose ${label.toLowerCase()}.`
}

function validateDifferentAirport(value: string, otherValue: string) {
  if (!value.trim() || !otherValue.trim()) return undefined
  return value === otherValue
    ? "Origin and destination must be different airports."
    : undefined
}

function validateDateValue(label: string, value: string) {
  return value ? undefined : `Choose ${label.toLowerCase()}.`
}

function validateReturnDate(
  value: string,
  departureDate: string,
  tripType: "one-way" | "round-trip"
) {
  if (tripType !== "round-trip") return undefined
  if (!value) return "Choose a return date."
  if (!departureDate) return undefined
  return new Date(value) < new Date(departureDate)
    ? "Return date must be on or after departure date."
    : undefined
}

function PublicHomePage() {
  const router = useRouter()
  const { currentUser } = Route.useLoaderData()
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    outbound: Array<FlightOption>
    returnOptions: Array<FlightOption>
    tripType: "one-way" | "round-trip"
  } | null>(null)
  const [selectedOutboundFlight, setSelectedOutboundFlight] =
    useState<FlightOption | null>(null)
  const [passengers, setPassengers] = useState("1")
  const [cabinClass, setCabinClass] = useState("economy")
  const passengerOptions = [
    { label: "1 Passenger", value: "1" },
    { label: "2 Passengers", value: "2" },
    { label: "3 Passengers", value: "3" },
    { label: "4 Passengers", value: "4" },
  ]
  const cabinClassOptions = [
    { label: "Economy", value: "economy" },
    { label: "Premium Economy", value: "premium-economy" },
    { label: "Business", value: "business" },
    { label: "First", value: "first" },
  ]

  const form = useForm({
    defaultValues: {
      departureDate: "",
      destination: "",
      returnDate: "",
      source: "",
      tripType: "one-way" as "one-way" | "round-trip",
    },
    onSubmit: async ({ value }) => {
      setSearchBusy(true)
      try {
        const result = await searchFlightsFn({ data: value })
        setSearchResults(result)
        setSelectedOutboundFlight(
          result.tripType === "round-trip" ? null : (result.outbound[0] ?? null)
        )
        if (!result.outbound.length)
          toast.message("No future flights matched those filters.")
      } finally {
        setSearchBusy(false)
      }
    },
  })

  function handleSwapAirports() {
    const currentValues = form.state.values
    form.setFieldValue("source", currentValues.destination)
    form.setFieldValue("destination", currentValues.source)
  }

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  return (
    <TravelerShell
      currentUser={
        currentUser
          ? { displayName: currentUser.displayName, email: currentUser.email }
          : null
      }
      onLogout={handleLogout}
      section="explore"
    >
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8 md:py-12">
        <section className="relative overflow-hidden rounded-xl bg-[#f2f4f6] p-8 md:p-12">
          <div className="relative z-10 mx-auto max-w-4xl text-center md:text-left">
            <h1 className="mb-4 text-[3.5rem] leading-[1.1] font-bold tracking-[-0.02em] text-slate-950">
              Where to next?
            </h1>
            <p className="mb-8 text-lg text-slate-500">
              Precision routing for the modern traveler.
            </p>

            <form
              className="relative z-20 flex w-full flex-col items-center gap-2 rounded-lg bg-white p-2 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.08)] md:flex-row md:gap-4 md:p-4"
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <div className="w-full flex-1 border-b-2 border-slate-100 px-2 pb-2 md:border-r-2 md:border-b-0 md:px-4 md:pb-0">
                <Label
                  className="mb-1 block text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                  htmlFor="search-from"
                >
                  From
                </Label>
                <div className="flex items-center gap-2">
                  <Plane className="size-4 text-slate-400" />
                  <form.Field
                    name="source"
                    validators={{
                      onChange: ({ value }) =>
                        validateAirportValue("an origin airport", value),
                      onSubmit: ({ value }) =>
                        validateAirportValue("an origin airport", value),
                    }}
                  >
                    {(field) => (
                      <AirportAutocompleteInput
                        className="h-auto border-0 bg-transparent px-0 py-1 shadow-none"
                        error={getFormFieldError(field)}
                        id="search-from"
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        placeholder="JFK - New York"
                        value={field.state.value}
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              <Button
                aria-label="Swap origin and destination"
                className="relative z-30 -my-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 md:-mx-6 md:my-0"
                onClick={handleSwapAirports}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowRightLeft className="size-4 rotate-90 md:rotate-0" />
              </Button>

              <div className="w-full flex-1 border-b-2 border-slate-100 px-2 pt-4 pb-2 md:border-r-2 md:border-b-0 md:px-4 md:pt-0 md:pb-0">
                <Label
                  className="mb-1 block text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                  htmlFor="search-to"
                >
                  To
                </Label>
                <div className="flex items-center gap-2">
                  <Plane className="size-4 rotate-90 text-slate-400" />
                  <form.Field
                    name="destination"
                    validators={{
                      onChange: ({ value, fieldApi }) =>
                        validateAirportValue("a destination airport", value) ??
                        validateDifferentAirport(
                          value,
                          fieldApi.form.getFieldValue("source")
                        ),
                      onChangeListenTo: ["source"],
                      onSubmit: ({ value, fieldApi }) =>
                        validateAirportValue("a destination airport", value) ??
                        validateDifferentAirport(
                          value,
                          fieldApi.form.getFieldValue("source")
                        ),
                    }}
                  >
                    {(field) => (
                      <AirportAutocompleteInput
                        className="h-auto border-0 bg-transparent px-0 py-1 shadow-none"
                        error={getFormFieldError(field)}
                        id="search-to"
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        placeholder="LHR - London"
                        value={field.state.value}
                      />
                    )}
                  </form.Field>
                </div>
              </div>

              <div className="w-full flex-1 px-2 pt-4 md:px-4 md:pt-0">
                <div className="space-y-3">
                  <div>
                    <Label
                      className="mb-1 block text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                      htmlFor="search-departure-date"
                    >
                      Departure
                    </Label>
                    <form.Field
                      name="departureDate"
                      validators={{
                        onChange: ({ value }) =>
                          validateDateValue("a departure date", value),
                        onSubmit: ({ value }) =>
                          validateDateValue("a departure date", value),
                      }}
                    >
                      {(field) => (
                        <DatePickerButtonField
                          className="border-0 px-0 shadow-none"
                          error={getFormFieldError(field)}
                          id="search-departure-date"
                          onBlur={field.handleBlur}
                          onChange={field.handleChange}
                          placeholder="Select departure date"
                          value={field.state.value}
                        />
                      )}
                    </form.Field>
                  </div>
                  {form.state.values.tripType === "round-trip" ? (
                    <div>
                      <Label
                        className="mb-1 block text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                        htmlFor="search-return-date"
                      >
                        Return
                      </Label>
                      <form.Field
                        name="returnDate"
                        validators={{
                          onChange: ({ value, fieldApi }) =>
                            validateReturnDate(
                              value,
                              fieldApi.form.getFieldValue("departureDate"),
                              fieldApi.form.getFieldValue("tripType")
                            ),
                          onChangeListenTo: ["departureDate", "tripType"],
                          onSubmit: ({ value, fieldApi }) =>
                            validateReturnDate(
                              value,
                              fieldApi.form.getFieldValue("departureDate"),
                              fieldApi.form.getFieldValue("tripType")
                            ),
                        }}
                      >
                        {(field) => (
                          <DatePickerButtonField
                            className="border-0 px-0 shadow-none"
                            error={getFormFieldError(field)}
                            id="search-return-date"
                            onBlur={field.handleBlur}
                            onChange={field.handleChange}
                            placeholder="Select return date"
                            value={field.state.value}
                          />
                        )}
                      </form.Field>
                    </div>
                  ) : null}
                </div>
              </div>

              <Button
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-8 py-4 text-white hover:bg-slate-800 md:mt-0 md:w-auto"
                disabled={searchBusy}
                type="submit"
              >
                <Search className="size-4" fill="currentColor" />
                {searchBusy ? "Searching…" : "Search"}
              </Button>
            </form>

            <form.Field name="tripType">
              {(field) => (
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 text-left md:flex-nowrap md:gap-3 md:overflow-x-auto md:pb-1">
                  <RadioGroup
                    className="flex shrink-0 flex-row gap-4"
                    onValueChange={(v) =>
                      field.handleChange(v as "one-way" | "round-trip")
                    }
                    value={field.state.value}
                  >
                    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <RadioGroupItem
                        aria-label="Round Trip"
                        id="round-trip"
                        value="round-trip"
                      />
                      <Label
                        className={cn(
                          "cursor-pointer text-sm font-medium whitespace-nowrap",
                          field.state.value === "round-trip"
                            ? "text-slate-950"
                            : "text-slate-500"
                        )}
                        htmlFor="round-trip"
                      >
                        Round Trip
                      </Label>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                      <RadioGroupItem
                        aria-label="One Way"
                        id="one-way"
                        value="one-way"
                      />
                      <Label
                        className={cn(
                          "cursor-pointer text-sm font-medium whitespace-nowrap",
                          field.state.value === "one-way"
                            ? "text-slate-950"
                            : "text-slate-500"
                        )}
                        htmlFor="one-way"
                      >
                        One Way
                      </Label>
                    </div>
                  </RadioGroup>
                  <div className="hidden h-4 w-px shrink-0 bg-slate-300 md:block" />
                  <Select
                    onValueChange={(value) =>
                      setPassengers(value ?? passengers)
                    }
                    value={passengers}
                  >
                    <SelectTrigger
                      aria-label="Passengers"
                      className="h-8 w-auto min-w-[142px] shrink-0 border-0 bg-transparent px-2 shadow-none hover:bg-slate-100 focus-visible:ring-2"
                    >
                      <SelectValue>
                        {passengerOptions.find(
                          (option) => option.value === passengers
                        )?.label ?? "Passengers"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {passengerOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) =>
                      setCabinClass(value ?? cabinClass)
                    }
                    value={cabinClass}
                  >
                    <SelectTrigger
                      aria-label="Cabin class"
                      className="h-8 w-auto min-w-[132px] shrink-0 border-0 bg-transparent px-2 shadow-none hover:bg-slate-100 focus-visible:ring-2"
                    >
                      <SelectValue>
                        {cabinClassOptions.find(
                          (option) => option.value === cabinClass
                        )?.label ?? "Cabin class"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {cabinClassOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          <div className="pointer-events-none absolute right-0 bottom-0 hidden translate-x-1/4 translate-y-1/4 transform opacity-[0.05] md:block">
            <Plane className="size-[400px]" />
          </div>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-8 md:gap-12 lg:grid-cols-12">
          <aside className="hidden space-y-8 lg:col-span-3 lg:block">
            <div>
              <h3 className="mb-4 text-lg font-bold text-slate-950">Filters</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 text-sm font-medium text-slate-950">
                    Stops
                  </h4>
                  <div className="space-y-2">
                    <FilterLine label="Nonstop" price="$450" defaultChecked />
                    <FilterLine label="1 Stop" price="$380" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-medium text-slate-950">
                    Airlines
                  </h4>
                  <div className="space-y-2">
                    <FilterLine label="Jet Blue" defaultChecked />
                    <FilterLine label="Global Airways" defaultChecked />
                    <FilterLine label="SkyNet Connect" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6 lg:col-span-9">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-950">
                  {searchResults?.outbound.length
                    ? `${searchResults.outbound[0].departureCity} to ${searchResults.outbound[0].arrivalCity}`
                    : "New York to London"}
                </h2>
                <p className="text-sm text-slate-500">
                  {searchResults?.outbound.length
                    ? "1 Adult • Economy"
                    : "Search to view live future departures."}
                </p>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <span className="text-sm text-slate-500">Sort by:</span>
                <Button size="sm" variant="ghost">
                  Best <ChevronDown className="size-4" />
                </Button>
              </div>
            </div>

            {searchResults ? (
              <div className="space-y-6">
                {!searchResults.outbound.length ? (
                  <NoResultsCard
                    onClear={() => {
                      form.reset()
                      setSearchResults(null)
                      setSelectedOutboundFlight(null)
                    }}
                    onReturnHome={() => {
                      form.reset()
                      setSearchResults(null)
                      setSelectedOutboundFlight(null)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                  />
                ) : null}
                {searchResults.outbound.length &&
                searchResults.tripType === "round-trip" ? (
                  <RoundTripSelectionStage
                    currentUser={currentUser}
                    outboundFlights={searchResults.outbound}
                    returnFlights={searchResults.returnOptions}
                    selectedOutboundFlight={selectedOutboundFlight}
                    setSelectedOutboundFlight={setSelectedOutboundFlight}
                  />
                ) : null}
                {searchResults.outbound.length &&
                searchResults.tripType === "one-way"
                  ? searchResults.outbound.map((flight) => (
                      <FlightCard
                        currentUser={currentUser}
                        flight={flight}
                        key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`}
                      />
                    ))
                  : null}
              </div>
            ) : (
              <div className="space-y-6">
                <DemoFlightCard
                  airline="Jet Blue JB-102"
                  arrivalCode="LHR"
                  arrivalTime="06:40"
                  departureCode="JFK"
                  departureTime="18:30"
                  duration="7h 10m"
                  hasPlusOne
                  price={450}
                  status="ON TIME"
                />
                <DemoFlightCard
                  airline="Global Airways GA-44"
                  arrivalCode="LHR"
                  arrivalTime="08:55"
                  departureCode="JFK"
                  departureTime="21:00"
                  duration="6h 55m"
                  hasPlusOne
                  price={520}
                  seatsLeft={3}
                  variant="secondary"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </TravelerShell>
  )
}

function RoundTripSelectionStage({
  currentUser,
  outboundFlights,
  returnFlights,
  selectedOutboundFlight,
  setSelectedOutboundFlight,
}: {
  currentUser: Awaited<ReturnType<typeof getCurrentUserFn>>
  outboundFlights: Array<FlightOption>
  returnFlights: Array<FlightOption>
  selectedOutboundFlight: FlightOption | null
  setSelectedOutboundFlight: (flight: FlightOption) => void
}) {
  const activeOutbound = selectedOutboundFlight ?? outboundFlights[0]

  return (
    <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
          <div className="flex items-center gap-2 text-slate-950">
            <div className="flex size-6 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
              1
            </div>
            <span>Outbound</span>
          </div>
          <div className="h-px flex-1 bg-slate-300" />
          <div className="flex items-center gap-2 text-slate-950">
            <div className="flex size-6 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-700">
              2
            </div>
            <span>Return</span>
          </div>
          <div className="h-px flex-1 bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-400">
            <div className="flex size-6 items-center justify-center rounded-full border border-slate-200 text-xs font-bold">
              3
            </div>
            <span>Review</span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h3 className="text-lg font-semibold text-slate-950">
              Selected Outbound
            </h3>
            <Button
              className="px-0 text-sm text-slate-500 hover:text-slate-950"
              onClick={() => setSelectedOutboundFlight(outboundFlights[0])}
              type="button"
              variant="ghost"
            >
              Reset
            </Button>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                  Flight
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">
                  {activeOutbound.airlineName} {activeOutbound.flightNumber}
                </div>
              </div>
              <Badge
                className={cn(
                  "rounded-sm px-2 py-1 text-[0.6875rem] font-bold tracking-[0.05em] uppercase",
                  activeOutbound.status === "on_time"
                    ? "bg-[#cde5ff] text-[#004b74]"
                    : "bg-red-100 text-red-700"
                )}
                variant="secondary"
              >
                {titleCaseStatus(activeOutbound.status)}
              </Badge>
            </div>
            <CheckoutStageRow
              label="Route"
              value={`${activeOutbound.departureAirportCode} → ${activeOutbound.arrivalAirportCode}`}
            />
            <CheckoutStageRow
              label="Departure"
              value={new Date(activeOutbound.departureDatetime).toLocaleString(
                [],
                {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }
              )}
            />
            <CheckoutStageRow
              label="Current Total"
              value={formatCurrency(activeOutbound.basePrice)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-950">
            Choose Your Outbound Flight
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Select an outbound first, then choose a matching return from the
            live results below.
          </p>
        </div>
        <div className="space-y-4">
          {outboundFlights.map((flight) => (
            <FlightCard
              currentUser={currentUser}
              flight={flight}
              key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`}
              onSelect={() => setSelectedOutboundFlight(flight)}
              selectionLabel={
                selectedOutboundFlight &&
                selectedOutboundFlight.flightNumber === flight.flightNumber &&
                selectedOutboundFlight.departureDatetime ===
                  flight.departureDatetime
                  ? "Selected"
                  : "Choose outbound"
              }
            />
          ))}
        </div>
        <div className="pt-2">
          <div className="text-xs font-bold tracking-[0.24em] text-slate-400 uppercase">
            Return Flights
          </div>
          <div className="mt-4 space-y-4">
            {returnFlights.length ? (
              returnFlights.map((flight) => (
                <FlightCard
                  currentUser={currentUser}
                  flight={flight}
                  key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}-return`}
                  selectionLabel="Choose return"
                />
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
                No return flights matched the selected dates yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckoutStageRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-semibold text-slate-950">
        {value}
      </div>
    </div>
  )
}

function FlightCard({
  currentUser,
  flight,
  onSelect,
  selectionLabel = "Select",
}: {
  currentUser: Awaited<ReturnType<typeof getCurrentUserFn>>
  flight: FlightOption
  onSelect?: () => void
  selectionLabel?: string
}) {
  const dep = new Date(flight.departureDatetime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  const arr = new Date(flight.arrivalDatetime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  const plusOne =
    new Date(flight.arrivalDatetime) > new Date(flight.departureDatetime)

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] md:flex-row">
      <div className="w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-sm bg-slate-950 text-white">
              <Plane className="size-3" />
            </div>
            <span className="text-sm font-medium text-slate-950">
              {flight.airlineName} {flight.flightNumber}
            </span>
          </div>
          <Badge
            className={cn(
              "rounded-sm px-2 py-1 text-[0.6875rem] font-bold tracking-[0.05em] uppercase",
              flight.status === "on_time"
                ? "bg-[#cde5ff] text-[#004b74]"
                : "bg-red-100 text-red-700"
            )}
          >
            {flight.status === "on_time"
              ? "ON TIME"
              : titleCaseStatus(flight.status)}
          </Badge>
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="text-left">
            <div className="text-2xl font-bold text-slate-950">{dep}</div>
            <div className="text-sm font-medium text-slate-500">
              {flight.departureAirportCode}
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center px-8">
            <div className="mb-1 text-xs text-slate-500">
              {flight.availableSeats} seats
            </div>
            <div className="flex w-full items-center">
              <div className="h-[2px] flex-1 bg-slate-200" />
              <Plane className="mx-2 size-4 rotate-90 text-slate-400" />
              <div className="h-[2px] flex-1 bg-slate-200" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Nonstop</div>
          </div>
          <div className="text-right">
            <div className="flex items-start justify-end gap-1 text-2xl font-bold text-slate-950">
              {arr}{" "}
              {plusOne ? (
                <sup className="mt-2 text-xs text-slate-500">+1</sup>
              ) : null}
            </div>
            <div className="text-sm font-medium text-slate-500">
              {flight.arrivalAirportCode}
            </div>
          </div>
        </div>
      </div>
      <div className="hidden h-24 w-[1px] bg-slate-200 md:block" />
      <div className="flex w-full flex-row items-center justify-between md:w-auto md:flex-col md:items-end md:justify-center md:gap-4">
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold text-slate-950">
            {formatCurrency(flight.basePrice)}
          </div>
          <div className="text-xs text-slate-500">Round trip</div>
        </div>
        {onSelect ? (
          <Button
            className="rounded-lg bg-slate-950 text-white hover:bg-slate-800"
            onClick={onSelect}
            type="button"
          >
            {selectionLabel}
          </Button>
        ) : (
          <Link
            className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
            to={currentUser?.role === "customer" ? "/customer" : "/login"}
          >
            {selectionLabel}
          </Link>
        )}
      </div>
    </div>
  )
}

function DemoFlightCard({
  airline,
  departureCode,
  departureTime,
  arrivalCode,
  arrivalTime,
  duration,
  hasPlusOne,
  price,
  status,
  seatsLeft,
  variant = "primary",
}: {
  airline: string
  departureCode: string
  departureTime: string
  arrivalCode: string
  arrivalTime: string
  duration: string
  hasPlusOne?: boolean
  price: number
  status?: string
  seatsLeft?: number
  variant?: "primary" | "secondary"
}) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] md:flex-row">
      <div className="w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-sm",
                variant === "primary"
                  ? "bg-slate-950 text-white"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              <Plane className="size-3" />
            </div>
            <span className="text-sm font-medium text-slate-950">
              {airline}
            </span>
          </div>
          {status ? (
            <Badge className="rounded-sm bg-[#cde5ff] px-2 py-1 text-[0.6875rem] font-bold tracking-[0.05em] text-[#004b74] uppercase">
              {status}
            </Badge>
          ) : seatsLeft ? (
            <Badge className="flex items-center gap-1 rounded-sm bg-slate-200 px-2 py-1 text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase">
              <CircleAlert className="size-[10px]" /> {seatsLeft} SEATS LEFT
            </Badge>
          ) : null}
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="text-left">
            <div className="text-2xl font-bold text-slate-950">
              {departureTime}
            </div>
            <div className="text-sm font-medium text-slate-500">
              {departureCode}
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center px-8">
            <div className="mb-1 text-xs text-slate-500">{duration}</div>
            <div className="flex w-full items-center">
              <div className="h-[2px] flex-1 bg-slate-200" />
              <Plane className="mx-2 size-4 rotate-90 text-slate-400" />
              <div className="h-[2px] flex-1 bg-slate-200" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Nonstop</div>
          </div>
          <div className="text-right">
            <div className="flex items-start justify-end gap-1 text-2xl font-bold text-slate-950">
              {arrivalTime}{" "}
              {hasPlusOne ? (
                <sup className="mt-2 text-xs text-slate-500">+1</sup>
              ) : null}
            </div>
            <div className="text-sm font-medium text-slate-500">
              {arrivalCode}
            </div>
          </div>
        </div>
      </div>
      <div className="hidden h-24 w-[1px] bg-slate-200 md:block" />
      <div className="flex w-full flex-row items-center justify-between md:w-auto md:flex-col md:items-end md:justify-center md:gap-4">
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold text-slate-950">${price}</div>
          <div className="text-xs text-slate-500">Round trip</div>
        </div>
        <Link
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium",
            variant === "primary"
              ? "bg-slate-950 text-white hover:bg-slate-800"
              : "bg-slate-200 text-slate-900 hover:bg-slate-300"
          )}
          to="/login"
        >
          Select
        </Link>
      </div>
    </div>
  )
}

function FilterLine({
  label,
  price,
  defaultChecked,
}: {
  label: string
  price?: string
  defaultChecked?: boolean
}) {
  return (
    <Label className="flex cursor-pointer items-center justify-between">
      <div className="flex items-center gap-2">
        <Checkbox defaultChecked={defaultChecked} />
        <span className="text-sm text-slate-500 transition-colors hover:text-slate-950">
          {label}
        </span>
      </div>
      {price ? <span className="text-xs text-slate-500">{price}</span> : null}
    </Label>
  )
}

function NoResultsCard({
  onClear,
  onReturnHome,
}: {
  onClear: () => void
  onReturnHome: () => void
}) {
  return (
    <div className="grid gap-6 rounded-lg bg-slate-50 p-8 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.08)] md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:p-10">
      <div className="flex justify-center md:justify-end">
        <div className="flex size-28 items-center justify-center rounded-sm bg-slate-200 text-slate-400">
          <Plane className="size-14" />
        </div>
      </div>
      <div className="text-center md:text-left">
        <h3 className="text-2xl font-bold text-slate-950">No flights found</h3>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          We are unable to locate active flight schedules for the selected route
          and parameters.
        </p>
        <div className="mt-6 rounded-sm border-l-4 border-slate-300 bg-slate-200/60 p-5 text-left">
          <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            Recommended actions
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-sm font-semibold text-slate-950">
                Adjust your travel dates
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Try searching a few days earlier or later than your current
                selection.
              </p>
            </div>
            <div className="border-t border-slate-300/70 pt-4">
              <div className="text-sm font-semibold text-slate-950">
                Try a nearby airport
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Broaden the route by using a nearby origin or destination
                airport.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
          <Button onClick={onClear} type="button" variant="secondary">
            Clear Filters
          </Button>
          <Button onClick={onReturnHome} type="button" variant="outline">
            Return Home
          </Button>
        </div>
      </div>
    </div>
  )
}
