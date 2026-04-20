import { useForm } from "@tanstack/react-form"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { ArrowRight, CalendarDays, CircleAlert, Search, Ticket } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TravelerShell } from "@/components/traveler-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatCurrency, titleCaseStatus } from "@/lib/format"
import { searchFlightsFn, type FlightOption } from "@/lib/queries"

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
    <TravelerShell currentUser={currentUser ? { displayName: currentUser.displayName, role: currentUser.role } : null} onLogout={handleLogout} section="explore">
      <div className="space-y-8">
        <section className="rounded-[24px] border border-slate-200/80 bg-[#f1f5fa] px-8 py-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-center">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-balance text-5xl font-semibold tracking-[-0.06em] text-slate-950">Where to next?</h1>
              <p className="max-w-2xl text-xl leading-8 text-slate-600">Precision routing for the modern traveler.</p>
            </div>
            <div className="hidden min-h-[220px] rounded-[26px] bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.02))] lg:block" />
          </div>
          <form className="mt-10 space-y-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); form.handleSubmit() }}>
            <div className="grid gap-3 rounded-[18px] bg-white p-3 shadow-sm lg:grid-cols-[1fr_52px_1fr_1.2fr_170px] lg:items-center">
              <form.Field name="source">{(field) => <Field className="gap-2"><FieldLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">From</FieldLabel><Input className="h-12 rounded-[14px] border-0 bg-transparent px-0 text-xl shadow-none placeholder:text-slate-300" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="JFK - New York" value={field.state.value} /></Field>}</form.Field>
              <div className="hidden items-center justify-center rounded-[16px] bg-slate-100 text-slate-500 lg:flex"><ArrowRight className="size-4" /></div>
              <form.Field name="destination">{(field) => <Field className="gap-2 border-t border-slate-200 pt-3 lg:border-t-0 lg:border-l lg:ps-5 lg:pt-0"><FieldLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">To</FieldLabel><Input className="h-12 rounded-[14px] border-0 bg-transparent px-0 text-xl shadow-none placeholder:text-slate-300" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="LHR - London" value={field.state.value} /></Field>}</form.Field>
              <form.Field name="departureDate">{(field) => <Field className="gap-2 border-t border-slate-200 pt-3 lg:border-t-0 lg:border-l lg:ps-5 lg:pt-0"><FieldLabel className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Dates</FieldLabel><div className="flex items-center gap-3"><CalendarDays className="size-5 text-slate-400" /><Input className="h-12 rounded-[14px] border-0 bg-transparent px-0 text-xl shadow-none" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></div></Field>}</form.Field>
              <Button className="h-14 rounded-[14px] bg-slate-950 text-lg text-white hover:bg-slate-800" disabled={searchBusy} type="submit"><Search className="size-5" data-icon="inline-start" />{searchBusy ? "Searching…" : "Search"}</Button>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <form.Field name="tripType">{(field) => <Select onValueChange={(value) => field.handleChange(value as "one-way" | "round-trip")} value={field.state.value}><SelectTrigger className="h-9 rounded-[12px] border-0 bg-transparent px-0 text-sm shadow-none"><SelectValue placeholder="Trip type" /></SelectTrigger><SelectContent><SelectItem value="round-trip">Round Trip</SelectItem><SelectItem value="one-way">One Way</SelectItem></SelectContent></Select>}</form.Field>
              <span className="text-slate-300">|</span>
              <span>1 Passenger</span>
              <span className="text-slate-300">|</span>
              <span>Economy</span>
            </div>
          </form>
        </section>

        <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-7 pt-2">
            <div>
              <div className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">Filters</div>
              <div className="mt-6 space-y-6 text-sm text-slate-600">
                <div>
                  <div className="font-medium text-slate-950">Stops</div>
                  <div className="mt-4 space-y-3">
                    <FilterLine label="Nonstop" value="$450" />
                    <FilterLine label="1 Stop" value="$380" />
                  </div>
                </div>
                <div>
                  <div className="font-medium text-slate-950">Airlines</div>
                  <div className="mt-4 space-y-3">
                    <FilterLine label="AeroPrecision" value="Preferred" />
                    <FilterLine label="Global Airways" value="Available" />
                    <FilterLine label="SkyNet Connect" value="Available" />
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950">{searchResults?.outbound.length ? `${searchResults.outbound[0].departureCity} to ${searchResults.outbound[0].arrivalCity}` : "Future flights"}</h2>
                <p className="mt-2 text-base text-slate-500">{searchResults?.outbound.length ? "Compare real schedules, seat inventory, and next available departures." : "Search by route and date to view live future departures."}</p>
              </div>
              <div className="text-sm text-slate-500">Sort by: <span className="font-medium text-slate-700">Best</span></div>
            </div>
            {searchResults ? (
              <div className="space-y-4">
                {searchResults.outbound.length ? searchResults.outbound.map((flight) => <FlightRow currentUser={currentUser} flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`} />) : <NoResultsCard />}
                {searchResults.tripType === "round-trip" && searchResults.returnOptions.length ? (
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Return</div>
                    {searchResults.returnOptions.map((flight) => <FlightRow currentUser={currentUser} flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}-return`} />)}
                  </div>
                ) : null}
              </div>
            ) : <div className="rounded-[18px] border border-slate-200/80 bg-white px-8 py-16 text-center text-slate-500">Run a search to compare future departures.</div>}
          </section>
        </div>
      </div>
    </TravelerShell>
  )
}

function FlightRow({ currentUser, flight }: { currentUser: Awaited<ReturnType<typeof getCurrentUserFn>>; flight: FlightOption }) {
  return (
    <Card className="rounded-[24px] border-0 bg-slate-50 shadow-none">
      <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_140px] lg:items-center lg:gap-8">
          <div>
            <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{new Date(flight.departureDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="mt-1 text-sm text-slate-500">{flight.departureAirportCode}</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><Ticket className="size-4" /> {flight.airlineName} {flight.flightNumber}</span><Badge className="rounded-full bg-white px-2.5 py-1 text-slate-600 hover:bg-white" variant="secondary">{titleCaseStatus(flight.status)}</Badge></div>
            <div className="flex items-center gap-3 text-sm text-slate-500"><span className="h-px flex-1 bg-slate-200" /><span>Nonstop</span><span className="h-px flex-1 bg-slate-200" /></div>
            <div className="text-sm text-slate-500">{flight.departureAirportName} → {flight.arrivalAirportName}</div>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{new Date(flight.arrivalDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="mt-1 text-sm text-slate-500">{flight.arrivalAirportCode}</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:min-w-[170px] lg:items-end">
          <div className="text-right"><div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{formatCurrency(flight.basePrice)}</div><div className="mt-1 text-sm text-slate-500">{flight.availableSeats} seats left</div></div>
          <Link className="inline-flex h-10 items-center justify-center rounded-[14px] bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800" to={currentUser?.role === "customer" ? "/customer" : "/login"}>Select</Link>
        </div>
      </CardContent>
    </Card>
  )
}

function FilterLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between rounded-[16px] bg-slate-50 px-4 py-3"><span>{label}</span><span className="text-slate-400">{value}</span></div>
}

function NoResultsCard() {
  return (
    <div className="rounded-[28px] bg-slate-50 p-8 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><CircleAlert className="size-6" /></div>
      <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">No flights found</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">We were unable to locate active flight schedules for the current search parameters. Adjust your filters and try again.</p>
    </div>
  )
}
