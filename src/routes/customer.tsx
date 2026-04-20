import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { ArrowRight, CreditCard, History, Lock, Plane, Plus, Settings, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TravelerShell } from "@/components/traveler-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatCurrency, formatDate, formatDateTime, titleCaseStatus } from "@/lib/format"
import { type FlightOption, getCustomerDashboardFn, purchaseTicketFn, searchFlightsFn, submitReviewFn } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/customer")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff" })

    return getCustomerDashboardFn({
      data: { destination: "", endDate: "", source: "", startDate: "" },
    })
  },
  component: CustomerPage,
})

function CustomerPage() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()
  const [dashboardData, setDashboardData] = useState(loaderData)
  const [activeSection, setActiveSection] = useState<"flights" | "payments" | "security" | "preferences">("flights")
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchResults, setSearchResults] = useState<{ outbound: FlightOption[]; returnOptions: FlightOption[]; tripType: "one-way" | "round-trip" } | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null)
  const [reviewingKey, setReviewingKey] = useState<string | null>(null)

  const searchForm = useForm({
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
      } finally { setSearchBusy(false) }
    },
  })

  const purchaseForm = useForm({
    defaultValues: { cardExpiration: "", cardNumber: "", cardType: "credit", nameOnCard: "" },
    onSubmit: async ({ value }) => {
      if (!selectedFlight) return
      const response = await purchaseTicketFn({
        data: {
          airlineName: selectedFlight.airlineName,
          cardExpiration: value.cardExpiration,
          cardNumber: value.cardNumber,
          cardType: value.cardType as "credit" | "debit",
          departureDatetime: selectedFlight.departureDatetime,
          flightNumber: selectedFlight.flightNumber,
          nameOnCard: value.nameOnCard,
        },
      })
      toast.success(response.message)
      setSelectedFlight(null)
      purchaseForm.reset()
      setDashboardData(await getCustomerDashboardFn({ data: { destination: "", endDate: "", source: "", startDate: "" } }))
    },
  })

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  async function handleReviewSubmit(flight: (typeof dashboardData.pastFlights)[number], values: { comment: string; rating: string }) {
    if (!values.rating) { toast.error("Choose a rating first."); return }
    const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
    setReviewingKey(key)
    try {
      const result = await submitReviewFn({
        data: { airlineName: flight.airlineName, comment: values.comment, departureDatetime: flight.departureDatetime, flightNumber: flight.flightNumber, rating: Number(values.rating) },
      })
      if (result?.error) { toast.error(result.error); return }
      toast.success(result?.message ?? "Review saved.")
      setDashboardData(await getCustomerDashboardFn({ data: { destination: "", endDate: "", source: "", startDate: "" } }))
    } finally { setReviewingKey(null) }
  }

  const sidebarItems = [
    { icon: Plane, key: "flights" as const, label: "My Trips" },
    { icon: CreditCard, key: "payments" as const, label: "Payment Methods" },
    { icon: Lock, key: "security" as const, label: "Security" },
    { icon: Settings, key: "preferences" as const, label: "Preferences" },
  ]

  return (
    <TravelerShell currentUser={{ displayName: dashboardData.currentUser.displayName, email: dashboardData.currentUser.email }} onLogout={handleLogout} section="bookings">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-1">
        {/* Sidebar — matches Stitch traveler_my_trips_hub */}
        <aside className="hidden w-64 shrink-0 border-r-0 bg-slate-50 p-4 md:flex md:flex-col md:sticky md:top-16 md:h-[calc(100vh-4rem)]">
          <div className="mb-8 px-2 pt-4">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <span className="text-sm font-bold">{dashboardData.currentUser.displayName.split(" ").map((n: string) => n[0]).join("")}</span>
              </div>
              <div>
                <h2 className="font-bold text-slate-900 font-['Manrope'] leading-tight">Traveler Hub</h2>
                <p className="text-xs text-slate-500">Silver Status</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 text-sm font-medium">
            {sidebarItems.map((item) => (
              <button
                className={cn(
                  "flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors text-left",
                  activeSection === item.key
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-200/50",
                )}
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                type="button"
              >
                <item.icon className="size-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content — matches Stitch content area */}
        <main className="flex-1 p-6 md:p-12">
          <div className="mx-auto max-w-4xl">
            {activeSection === "flights" ? (
              <FlightsSection
                dashboardData={dashboardData}
                handleReviewSubmit={handleReviewSubmit}
                purchaseForm={purchaseForm}
                reviewingKey={reviewingKey}
                searchBusy={searchBusy}
                searchForm={searchForm}
                searchResults={searchResults}
                selectedFlight={selectedFlight}
                setSelectedFlight={setSelectedFlight}
              />
            ) : null}
            {activeSection === "payments" ? <PaymentsSection /> : null}
            {activeSection === "security" ? <SecuritySection /> : null}
            {activeSection === "preferences" ? <PreferencesSection /> : null}
          </div>
        </main>
      </div>
    </TravelerShell>
  )
}

/* ─── Flights Section — Stitch traveler_my_trips_hub ─── */

function FlightsSection({
  dashboardData,
  handleReviewSubmit,
  purchaseForm,
  reviewingKey,
  searchBusy,
  searchForm,
  searchResults,
  selectedFlight,
  setSelectedFlight,
}: {
  dashboardData: Awaited<ReturnType<typeof getCustomerDashboardFn>>
  handleReviewSubmit: (flight: (typeof dashboardData.pastFlights)[number], values: { comment: string; rating: string }) => Promise<void>
  purchaseForm: any
  reviewingKey: string | null
  searchBusy: boolean
  searchForm: any
  searchResults: { outbound: FlightOption[]; returnOptions: FlightOption[]; tripType: "one-way" | "round-trip" } | null
  selectedFlight: FlightOption | null
  setSelectedFlight: (flight: FlightOption | null) => void
}) {
  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950 font-['Manrope']">My Trips</h1>
          <p className="text-sm text-slate-500">Manage your upcoming itineraries and review past journeys.</p>
        </div>
      </div>

      {/* Upcoming Trips */}
      <section className="mb-12">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-950 font-['Manrope']">
          <Plane className="size-5 text-slate-950" />
          Upcoming
        </h2>
        <div className="grid gap-6">
          {dashboardData.upcomingFlights.length ? dashboardData.upcomingFlights.map((flight) => (
            <UpcomingTripCard flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`} />
          )) : (
            <div className="rounded-lg bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-slate-100">
                <Plane className="size-10 text-slate-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-950 font-['Manrope']">No upcoming flights</h3>
              <p className="mx-auto mb-8 max-w-md text-sm text-slate-500">You don't have any flights scheduled. Ready to plan your next destination?</p>
              <Button className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-950 to-slate-800 text-white hover:opacity-90" onClick={() => {}}>
                Search Flights <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Book Flights (inline search) */}
      <section className="mb-12">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-950 font-['Manrope']">
          <Plus className="size-5" />
          Book a Flight
        </h2>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_180px_180px_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); searchForm.handleSubmit() }}>
            <div className="space-y-1.5">
              <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">From</Label>
              <searchForm.Field name="source">{(field: any) => <Input className="rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="City or airport" value={field.state.value} />}</searchForm.Field>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">To</Label>
              <searchForm.Field name="destination">{(field: any) => <Input className="rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} placeholder="City or airport" value={field.state.value} />}</searchForm.Field>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Departure</Label>
              <searchForm.Field name="departureDate">{(field: any) => <Input className="rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} type="date" value={field.state.value} />}</searchForm.Field>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Return</Label>
              <searchForm.Field name="returnDate">{(field: any) => <Input className="rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} type="date" value={field.state.value} />}</searchForm.Field>
            </div>
            <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={searchBusy} type="submit">{searchBusy ? "Searching…" : "Search"}</Button>
          </form>
        </div>

        {/* Search Results */}
        {searchResults ? (
          <div className="mt-6 space-y-4">
            {searchResults.outbound.map((flight) => (
              <SearchResultCard flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`} onChoose={setSelectedFlight} />
            ))}
          </div>
        ) : null}

        {/* Purchase Form */}
        {selectedFlight ? (
          <div className="mt-6 rounded-lg bg-slate-950 p-6 text-white">
            <h3 className="mb-4 text-2xl font-bold font-['Manrope']">Complete your booking</h3>
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); purchaseForm.handleSubmit() }}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white/60">Name on Card</Label>
                    <purchaseForm.Field name="nameOnCard">{(field: any) => <Input className="rounded-lg bg-white/10 text-white placeholder:text-white/40" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} value={field.state.value} />}</purchaseForm.Field>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white/60">Card Number</Label>
                    <purchaseForm.Field name="cardNumber">{(field: any) => <Input className="rounded-lg bg-white/10 text-white placeholder:text-white/40" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} value={field.state.value} />}</purchaseForm.Field>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white/60">Expiration</Label>
                    <purchaseForm.Field name="cardExpiration">{(field: any) => <Input className="rounded-lg bg-white/10 text-white" onBlur={field.handleBlur} onChange={(e: any) => field.handleChange(e.target.value)} type="date" value={field.state.value} />}</purchaseForm.Field>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white/60">Card Type</Label>
                    <purchaseForm.Field name="cardType">{(field: any) => (
                      <Select onValueChange={(v) => field.handleChange(v ?? field.state.value)} value={field.state.value}>
                        <SelectTrigger className="w-full rounded-lg bg-white/10 text-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Credit</SelectItem>
                          <SelectItem value="debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    )}</purchaseForm.Field>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button className="rounded-lg bg-white text-slate-950 hover:bg-slate-100" type="submit">Confirm & Pay</Button>
                  <Button className="rounded-lg border-white/20 text-white hover:bg-white/10" onClick={() => setSelectedFlight(null)} type="button" variant="outline">Cancel</Button>
                </div>
              </form>
              <div className="rounded-lg bg-white/10 p-5">
                <div className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-white/45">Selected Route</div>
                <div className="mt-3 text-2xl font-bold font-['Manrope']">{selectedFlight.departureAirportCode} → {selectedFlight.arrivalAirportCode}</div>
                <div className="mt-2 text-sm text-white/70">{formatDateTime(selectedFlight.departureDatetime)}</div>
                <div className="mt-6 text-3xl font-bold font-['Manrope']">{formatCurrency(selectedFlight.basePrice)}</div>
                <div className="mt-1 text-sm text-white/70">Total per traveler</div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Past Journeys */}
      <section>
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-950 font-['Manrope']">
          <History className="size-5 text-slate-500" />
          Past Journeys
        </h2>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="flex flex-col gap-2">
            {dashboardData.pastFlights.length ? dashboardData.pastFlights.map((flight) => {
              const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
              return (
                <div className="rounded bg-white p-4 shadow-sm" key={key}>
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded bg-slate-100">
                        <Plane className="size-5 text-slate-500" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-950 font-['Manrope']">{flight.departureAirportCode} → {flight.arrivalAirportCode}</h4>
                        <p className="text-xs font-medium text-slate-500">{formatDateTime(flight.departureDatetime)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {flight.canReview ? (
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Review available</span>
                      ) : flight.rating ? (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star className={cn("size-4", i < flight.rating! ? "fill-slate-950 text-slate-950" : "text-slate-300")} key={i} />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Completed</span>
                      )}
                    </div>
                  </div>
                  {flight.canReview ? (
                    <ReviewComposer flight={flight} isSubmitting={reviewingKey === key} onSubmit={handleReviewSubmit} />
                  ) : flight.comment ? (
                    <div className="mt-4 rounded bg-slate-50 px-4 py-3 text-sm text-slate-600 italic">"{flight.comment}"</div>
                  ) : null}
                </div>
              )
            }) : (
              <div className="rounded bg-white p-8 text-center text-sm text-slate-500">No past journeys yet.</div>
            )}
          </div>
          <div className="mt-6 text-center">
            <Button className="text-slate-500 hover:text-slate-950" size="sm" variant="ghost">
              Load more history <Star className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

/* ─── Upcoming Trip Card ─── */

function UpcomingTripCard({ flight }: { flight: any }) {
  return (
    <div className="flex flex-col gap-6 rounded bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 md:flex-row">
      <div className="relative w-full shrink-0 overflow-hidden rounded md:w-48">
        <div className="flex aspect-video items-center justify-center bg-slate-200">
          <Plane className="size-8 text-slate-400" />
        </div>
        <span className="absolute bottom-2 left-2 text-lg font-bold text-white drop-shadow-md font-['Manrope']">{flight.arrivalAirportCode}</span>
      </div>
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className="rounded-sm bg-[#cde5ff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#004b74]" variant="secondary">Managed</Badge>
            <span className="text-xs font-medium text-slate-500">Confirmation: {flight.flightNumber}</span>
          </div>
          <span className="text-sm font-semibold text-slate-950">{formatDate(flight.departureDatetime)}</span>
        </div>
        <h3 className="mb-1 text-xl font-bold text-slate-950 font-['Manrope']">{flight.arrivalCity ?? flight.arrivalAirportCode}</h3>
        <p className="mb-4 text-sm text-slate-500">Direct flight · Economy</p>
        <div className="flex flex-wrap gap-2">
          <Button className="rounded bg-gradient-to-r from-slate-950 to-slate-800 text-white hover:opacity-90" size="sm">View Itinerary</Button>
          <Button className="rounded" size="sm" variant="outline">Modify Options</Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Search Result Card ─── */

function SearchResultCard({ flight, onChoose }: { flight: FlightOption; onChoose: (f: FlightOption) => void }) {
  const dep = new Date(flight.departureDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  const arr = new Date(flight.arrivalDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-sm md:flex-row">
      <div className="w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-950">{flight.airlineName} {flight.flightNumber}</span>
          <Badge className={cn("rounded-sm px-2 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em]", flight.status === "on_time" ? "bg-[#cde5ff] text-[#004b74]" : "bg-red-100 text-red-700")} variant="secondary">
            {titleCaseStatus(flight.status)}
          </Badge>
        </div>
        <div className="flex w-full items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-950 font-['Manrope']">{dep}</div>
            <div className="text-sm font-medium text-slate-500">{flight.departureAirportCode}</div>
          </div>
          <div className="flex flex-1 flex-col items-center px-8">
            <div className="flex w-full items-center">
              <div className="h-[2px] flex-1 bg-slate-200" />
              <Plane className="mx-2 size-4 rotate-90 text-slate-400" />
              <div className="h-[2px] flex-1 bg-slate-200" />
            </div>
            <div className="mt-1 text-xs text-slate-500">Nonstop</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-950 font-['Manrope']">{arr}</div>
            <div className="text-sm font-medium text-slate-500">{flight.arrivalAirportCode}</div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-row items-center justify-between md:w-auto md:flex-col md:items-end md:gap-4">
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold text-slate-950 font-['Manrope']">{formatCurrency(flight.basePrice)}</div>
          <div className="text-xs text-slate-500">Round trip</div>
        </div>
        <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" onClick={() => onChoose(flight)}>Select</Button>
      </div>
    </div>
  )
}

/* ─── Review Composer ─── */

function ReviewComposer({ flight, isSubmitting, onSubmit }: {
  flight: any
  isSubmitting: boolean
  onSubmit: (flight: any, values: { comment: string; rating: string }) => Promise<void>
}) {
  const form = useForm({
    defaultValues: { comment: flight.comment ?? "", rating: "" },
    onSubmit: async ({ value }) => onSubmit(flight, value),
  })

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-5">
      <h4 className="mb-3 text-sm font-semibold text-slate-950 font-['Manrope']">Rate your experience</h4>
      <form.Field name="rating">
        {(field: any) => (
          <div className="mb-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                className={cn("text-2xl transition-colors", Number(field.state.value) >= v ? "text-slate-950" : "text-slate-300 hover:text-slate-500")}
                key={v}
                onClick={() => field.handleChange(String(v))}
                type="button"
              >
                <Star className={cn("size-6", Number(field.state.value) >= v && "fill-slate-950")} />
              </button>
            ))}
          </div>
        )}
      </form.Field>
      <form.Field name="comment">
        {(field: any) => (
          <Textarea
            className="mb-4 resize-none"
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            placeholder="Share your feedback on the flight, crew, or amenities..."
            rows={3}
            value={field.state.value}
          />
        )}
      </form.Field>
      <Button className="rounded bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmitting} onClick={() => form.handleSubmit()} size="sm" type="button">
        {isSubmitting ? "Saving…" : "Submit Review"}
      </Button>
    </div>
  )
}

/* ─── Payments Section ─── */

function PaymentsSection() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold text-slate-950 font-['Manrope']">Payment Methods</h1>
      <p className="mb-8 text-sm text-slate-500">Manage your saved cards and billing information for seamless bookings.</p>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-950 font-['Manrope']">Saved Cards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <CreditCard className="size-5 text-slate-950" />
                <Badge className="rounded-sm bg-slate-200 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-700" variant="secondary">Default</Badge>
              </div>
              <div className="text-sm text-slate-500">Corporate Card</div>
              <div className="mt-1 text-lg font-bold tracking-wider text-slate-950 font-['Manrope']">•••• •••• •••• 4242</div>
              <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Exp: 12/26</span><span className="font-bold">Visa</span></div>
            </div>
            <div className="rounded bg-slate-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <CreditCard className="size-5 text-slate-500" />
              </div>
              <div className="text-sm text-slate-500">Personal Rewards Card</div>
              <div className="mt-1 text-lg font-bold tracking-wider text-slate-950 font-['Manrope']">•••• •••• •••• 5555</div>
              <div className="mt-2 flex justify-between text-xs text-slate-500"><span>Exp: 08/25</span><span className="font-bold">Mastercard</span></div>
            </div>
          </div>
        </div>
        <div className="rounded bg-slate-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-950 font-['Manrope']">Billing Address</h2>
          <div className="text-sm leading-relaxed text-slate-600">
            John Doe<br />
            123 Aviation Parkway<br />
            Suite 400<br />
            Seattle, WA 98101
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── Security Section ─── */

function SecuritySection() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold text-slate-950 font-['Manrope']">Security Settings</h1>
      <p className="mb-8 text-sm text-slate-500">Manage your account access and security preferences.</p>
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-950 font-['Manrope']">
            <Lock className="size-5 text-slate-400" /> Change Password
          </h2>
          <div className="space-y-5">
            <div>
              <Label className="mb-1 block text-sm font-medium text-slate-950">Current Password</Label>
              <Input className="border-b-2 border-slate-200 bg-white px-0 shadow-none focus-visible:ring-0" placeholder="••••••••" type="password" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-950">New Password</Label>
                <Input className="border-b-2 border-slate-200 bg-white px-0 shadow-none focus-visible:ring-0" placeholder="Enter new password" type="password" />
              </div>
              <div>
                <Label className="mb-1 block text-sm font-medium text-slate-950">Confirm New Password</Label>
                <Input className="border-b-2 border-slate-200 bg-white px-0 shadow-none focus-visible:ring-0" placeholder="Confirm new password" type="password" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button className="rounded-lg" variant="secondary">Cancel</Button>
              <Button className="rounded-lg bg-gradient-to-r from-slate-950 to-slate-800 text-white hover:opacity-90">Update Password</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── Preferences Section ─── */

function PreferencesSection() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold text-slate-950 font-['Manrope']">Preferences</h1>
      <p className="mb-8 text-sm text-slate-500">Customize your travel experience.</p>
      <div className="rounded-lg bg-white p-8 text-sm text-slate-500 shadow-sm">
        Preferences will be available in a future update.
      </div>
    </>
  )
}
