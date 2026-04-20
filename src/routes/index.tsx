import { useForm } from "@tanstack/react-form"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { ArrowRight, CalendarDays, ChevronDown, CircleAlert, Plane, Search } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TravelerShell } from "@/components/traveler-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatCurrency, titleCaseStatus } from "@/lib/format"
import { searchFlightsFn, type FlightOption } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: PublicHomePage,
})

function PublicHomePage() {
  const router = useRouter()
  const { currentUser } = Route.useLoaderData()
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchResults, setSearchResults] = useState<{ outbound: FlightOption[]; returnOptions: FlightOption[]; tripType: "one-way" | "round-trip" } | null>(null)

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
        if (!result.outbound.length) toast.message("No future flights matched those filters.")
      } finally {
        setSearchBusy(false)
      }
    },
  })

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  return (
    <TravelerShell currentUser={currentUser ? { displayName: currentUser.displayName, email: currentUser.email } : null} onLogout={handleLogout} section="explore">
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 md:px-8 md:py-12">
        <section className="relative overflow-hidden rounded-xl bg-[#f2f4f6] p-8 md:p-12">
          <div className="relative z-10 mx-auto max-w-4xl text-center md:text-left">
            <h1 className="mb-4 font-['Manrope'] text-[3.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-slate-950">Where to next?</h1>
            <p className="mb-8 text-lg text-slate-500">Precision routing for the modern traveler.</p>

            <form className="relative z-20 flex w-full flex-col items-center gap-2 rounded-lg bg-white p-2 shadow-[0_20px_40px_-10px_rgba(25,28,30,0.08)] md:flex-row md:gap-4 md:p-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>
              <div className="w-full flex-1 border-b-2 border-slate-100 px-2 pb-2 md:border-b-0 md:border-r-2 md:px-4 md:pb-0">
                <Label className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">From</Label>
                <div className="flex items-center gap-2">
                  <Plane className="size-4 text-slate-400" />
                  <form.Field name="source">{(field) => <Input className="h-auto border-0 bg-transparent px-0 py-1 shadow-none" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="JFK - New York" value={field.state.value} />}</form.Field>
                </div>
              </div>

              <Button className="relative z-30 -my-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 md:-mx-6 md:my-0" size="icon" type="button" variant="ghost">
                <ArrowRight className="size-4 rotate-[-90deg] md:rotate-0" />
              </Button>

              <div className="w-full flex-1 border-b-2 border-slate-100 px-2 pb-2 pt-4 md:border-b-0 md:border-r-2 md:px-4 md:pb-0 md:pt-0">
                <Label className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">To</Label>
                <div className="flex items-center gap-2">
                  <Plane className="size-4 rotate-90 text-slate-400" />
                  <form.Field name="destination">{(field) => <Input className="h-auto border-0 bg-transparent px-0 py-1 shadow-none" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="LHR - London" value={field.state.value} />}</form.Field>
                </div>
              </div>

              <div className="w-full flex-1 px-2 pt-4 md:px-4 md:pt-0">
                <Label className="mb-1 block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Dates</Label>
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-slate-400" />
                  <form.Field name="departureDate">{(field) => <Input className="h-auto cursor-pointer border-0 bg-transparent px-0 py-1 shadow-none" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} />}</form.Field>
                </div>
              </div>

              <Button className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-8 py-4 text-white hover:bg-slate-800 md:mt-0 md:w-auto" disabled={searchBusy} type="submit">
                <Search className="size-4" fill="currentColor" />
                {searchBusy ? "Searching…" : "Search"}
              </Button>
            </form>

            <form.Field name="tripType">
              {(field) => (
                <div className="mt-6 flex flex-wrap items-center gap-4 text-center md:justify-start">
                  <RadioGroup
                    className="flex flex-row gap-4"
                    onValueChange={(v) => field.handleChange(v as "one-way" | "round-trip")}
                    value={field.state.value}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="round-trip" value="round-trip" />
                      <Label className={cn("cursor-pointer text-sm font-medium", field.state.value === "round-trip" ? "text-slate-950" : "text-slate-500")} htmlFor="round-trip">Round Trip</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id="one-way" value="one-way" />
                      <Label className={cn("cursor-pointer text-sm font-medium", field.state.value === "one-way" ? "text-slate-950" : "text-slate-500")} htmlFor="one-way">One Way</Label>
                    </div>
                  </RadioGroup>
                  <div className="hidden h-4 w-px bg-slate-300 md:block" />
                  <Button size="sm" variant="ghost">
                    1 Passenger <ChevronDown className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    Economy <ChevronDown className="size-4" />
                  </Button>
                </div>
              )}
            </form.Field>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 hidden translate-x-1/4 translate-y-1/4 transform opacity-[0.05] md:block">
            <Plane className="size-[400px]" />
          </div>
        </section>

        <section className="mt-12 grid grid-cols-1 gap-8 md:gap-12 lg:grid-cols-12">
          <aside className="hidden space-y-8 lg:col-span-3 lg:block">
            <div>
              <h3 className="mb-4 text-lg font-bold text-slate-950 font-['Manrope']">Filters</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 text-sm font-medium text-slate-950">Stops</h4>
                  <div className="space-y-2">
                    <FilterLine label="Nonstop" price="$450" defaultChecked />
                    <FilterLine label="1 Stop" price="$380" />
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-medium text-slate-950">Airlines</h4>
                  <div className="space-y-2">
                    <FilterLine label="AeroPrecision" defaultChecked />
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
                <h2 className="text-2xl font-bold text-slate-950 font-['Manrope']">{searchResults?.outbound.length ? `${searchResults.outbound[0].departureCity} to ${searchResults.outbound[0].arrivalCity}` : "New York to London"}</h2>
                <p className="text-sm text-slate-500">{searchResults?.outbound.length ? "1 Adult • Economy" : "Search to view live future departures."}</p>
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
                {searchResults.outbound.length ? searchResults.outbound.map((flight) => (
                  <FlightCard currentUser={currentUser} flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`} />
                )) : <NoResultsCard />}
                {searchResults.tripType === "round-trip" && searchResults.returnOptions.length ? (
                  <div className="space-y-6 pt-2">
                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Return Flights</div>
                    {searchResults.returnOptions.map((flight) => (
                      <FlightCard currentUser={currentUser} flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}-return`} />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-6">
                <DemoFlightCard airline="AeroPrecision AP-102" arrivalCode="LHR" arrivalTime="06:40" departureCode="JFK" departureTime="18:30" duration="7h 10m" hasPlusOne price={450} status="ON TIME" />
                <DemoFlightCard airline="Global Airways GA-44" arrivalCode="LHR" arrivalTime="08:55" departureCode="JFK" departureTime="21:00" duration="6h 55m" hasPlusOne price={520} seatsLeft={3} variant="secondary" />
              </div>
            )}
          </div>
        </section>
      </div>
    </TravelerShell>
  )
}

function FlightCard({ currentUser, flight }: { currentUser: Awaited<ReturnType<typeof getCurrentUserFn>>; flight: FlightOption }) {
  const dep = new Date(flight.departureDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const arr = new Date(flight.arrivalDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const plusOne = new Date(flight.arrivalDatetime) > new Date(flight.departureDatetime)

  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-transform duration-300 hover:-translate-y-1 md:flex-row">
      <div className="w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-sm bg-slate-950 text-white">
              <Plane className="size-3" />
            </div>
            <span className="text-sm font-medium text-slate-950">{flight.airlineName} {flight.flightNumber}</span>
          </div>
          <Badge className={cn("rounded-sm px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em]", flight.status === "on_time" ? "bg-[#cde5ff] text-[#004b74]" : "bg-red-100 text-red-700")}>
            {flight.status === "on_time" ? "ON TIME" : titleCaseStatus(flight.status)}
          </Badge>
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="text-left">
            <div className="text-2xl font-bold text-slate-950 font-['Manrope']">{dep}</div>
            <div className="text-sm font-medium text-slate-500">{flight.departureAirportCode}</div>
          </div>
          <div className="flex flex-1 flex-col items-center px-8">
            <div className="mb-1 text-xs text-slate-500">{flight.availableSeats} seats</div>
            <div className="flex w-full items-center">
              <div className="h-[2px] flex-1 bg-slate-200" />
              <Plane className="mx-2 size-4 rotate-90 text-slate-400" />
              <div className="h-[2px] flex-1 bg-slate-200" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Nonstop</div>
          </div>
          <div className="text-right">
            <div className="flex items-start justify-end gap-1 text-2xl font-bold text-slate-950 font-['Manrope']">{arr} {plusOne ? <sup className="mt-2 text-xs text-slate-500">+1</sup> : null}</div>
            <div className="text-sm font-medium text-slate-500">{flight.arrivalAirportCode}</div>
          </div>
        </div>
      </div>
      <div className="hidden h-24 w-[1px] bg-slate-200 md:block" />
      <div className="flex w-full flex-row items-center justify-between md:w-auto md:flex-col md:items-end md:justify-center md:gap-4">
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold text-slate-950 font-['Manrope']">{formatCurrency(flight.basePrice)}</div>
          <div className="text-xs text-slate-500">Round trip</div>
        </div>
        <Link className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800" to={currentUser?.role === "customer" ? "/customer" : "/login"}>Select</Link>
      </div>
    </div>
  )
}

function DemoFlightCard({ airline, departureCode, departureTime, arrivalCode, arrivalTime, duration, hasPlusOne, price, status, seatsLeft, variant = "primary" }: {
  airline: string; departureCode: string; departureTime: string; arrivalCode: string; arrivalTime: string
  duration: string; hasPlusOne?: boolean; price: number; status?: string; seatsLeft?: number; variant?: "primary" | "secondary"
}) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-[0_4px_16px_rgba(0,0,0,0.02)] transition-transform duration-300 hover:-translate-y-1 md:flex-row">
      <div className="w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("flex size-6 items-center justify-center rounded-sm", variant === "primary" ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-500")}>
              <Plane className="size-3" />
            </div>
            <span className="text-sm font-medium text-slate-950">{airline}</span>
          </div>
          {status ? (
            <Badge className="rounded-sm bg-[#cde5ff] px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-[#004b74]">{status}</Badge>
          ) : seatsLeft ? (
            <Badge className="flex items-center gap-1 rounded-sm bg-slate-200 px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">
              <CircleAlert className="size-[10px]" /> {seatsLeft} SEATS LEFT
            </Badge>
          ) : null}
        </div>
        <div className="flex w-full items-center justify-between">
          <div className="text-left">
            <div className="text-2xl font-bold text-slate-950 font-['Manrope']">{departureTime}</div>
            <div className="text-sm font-medium text-slate-500">{departureCode}</div>
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
            <div className="flex items-start justify-end gap-1 text-2xl font-bold text-slate-950 font-['Manrope']">{arrivalTime} {hasPlusOne ? <sup className="mt-2 text-xs text-slate-500">+1</sup> : null}</div>
            <div className="text-sm font-medium text-slate-500">{arrivalCode}</div>
          </div>
        </div>
      </div>
      <div className="hidden h-24 w-[1px] bg-slate-200 md:block" />
      <div className="flex w-full flex-row items-center justify-between md:w-auto md:flex-col md:items-end md:justify-center md:gap-4">
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold text-slate-950 font-['Manrope']">${price}</div>
          <div className="text-xs text-slate-500">Round trip</div>
        </div>
        <Link className={cn("inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium", variant === "primary" ? "bg-slate-950 text-white hover:bg-slate-800" : "bg-slate-200 text-slate-900 hover:bg-slate-300")} to="/login">Select</Link>
      </div>
    </div>
  )
}

function FilterLine({ label, price, defaultChecked }: { label: string; price?: string; defaultChecked?: boolean }) {
  return (
    <Label className="flex cursor-pointer items-center justify-between">
      <div className="flex items-center gap-2">
        <Checkbox defaultChecked={defaultChecked} />
        <span className="text-sm text-slate-500 transition-colors hover:text-slate-950">{label}</span>
      </div>
      {price ? <span className="text-xs text-slate-500">{price}</span> : null}
    </Label>
  )
}

function NoResultsCard() {
  return (
    <div className="rounded-lg bg-slate-50 p-10 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-slate-200 text-slate-400">
        <Plane className="size-10" />
      </div>
      <h3 className="mt-6 text-xl font-bold text-slate-950 font-['Manrope']">No flights found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">We are unable to locate active flight schedules for the selected route and parameters.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-4">
        <Button variant="secondary">Clear Filters</Button>
        <Button variant="outline">Return Home</Button>
      </div>
    </div>
  )
}
