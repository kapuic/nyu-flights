import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import { ArrowRight, CalendarDays, CreditCard, PlaneTakeoff, Star, Wallet } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TravelerShell } from "@/components/traveler-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatCurrency, formatDate, formatDateTime, titleCaseStatus } from "@/lib/format"
import { type FlightOption, getCustomerDashboardFn, purchaseTicketFn, searchFlightsFn, submitReviewFn } from "@/lib/queries"

export const Route = createFileRoute("/customer")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff" })

    return getCustomerDashboardFn({
      data: {
        destination: "",
        endDate: "",
        source: "",
        startDate: "",
      },
    })
  },
  component: CustomerPage,
})

function CustomerPage() {
  const router = useRouter()
  const loaderData = Route.useLoaderData()
  const [dashboardData, setDashboardData] = useState(loaderData)
  const [activeSection, setActiveSection] = useState<"account" | "bookings" | "payments" | "trips">("trips")
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchResults, setSearchResults] = useState<{ outbound: FlightOption[]; returnOptions: FlightOption[]; tripType: "one-way" | "round-trip" } | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null)
  const [reviewingKey, setReviewingKey] = useState<string | null>(null)
  const [filterBusy, setFilterBusy] = useState(false)

  const tripFilterForm = useForm({
    defaultValues: {
      destination: "",
      endDate: "",
      source: "",
      startDate: "",
    },
    onSubmit: async ({ value }) => {
      setFilterBusy(true)
      try {
        setDashboardData(await getCustomerDashboardFn({ data: value }))
      } finally {
        setFilterBusy(false)
      }
    },
  })

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
      } finally {
        setSearchBusy(false)
      }
    },
  })

  const purchaseForm = useForm({
    defaultValues: {
      cardExpiration: "",
      cardNumber: "",
      cardType: "credit",
      nameOnCard: "",
    },
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
      setActiveSection("trips")
      setDashboardData(await getCustomerDashboardFn({ data: tripFilterForm.state.values }))
    },
  })

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  async function refreshDashboard() {
    setDashboardData(await getCustomerDashboardFn({ data: tripFilterForm.state.values }))
  }

  async function handleTripFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    await tripFilterForm.handleSubmit()
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    await searchForm.handleSubmit()
  }

  async function handlePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    try {
      await purchaseForm.handleSubmit()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed.")
    }
  }

  async function handleReviewSubmit(
    flight: (typeof dashboardData.pastFlights)[number],
    values: { comment: string; rating: string },
  ) {
    if (!values.rating) {
      toast.error("Choose a rating first.")
      return
    }

    const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
    setReviewingKey(key)
    try {
      const result = await submitReviewFn({
        data: {
          airlineName: flight.airlineName,
          comment: values.comment,
          departureDatetime: flight.departureDatetime,
          flightNumber: flight.flightNumber,
          rating: Number(values.rating),
        },
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.message ?? "Review saved.")
      await refreshDashboard()
    } finally {
      setReviewingKey(null)
    }
  }

  return (
    <TravelerShell currentUser={{ displayName: dashboardData.currentUser.displayName, role: "customer" }} onLogout={handleLogout} section="bookings">
      <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="rounded-[30px] bg-white p-5 shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Traveler Hub</div>
          <div className="mt-4 rounded-[24px] bg-slate-50 p-4">
            <div className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{dashboardData.currentUser.displayName}</div>
            <div className="mt-1 text-sm text-slate-500">Customer account</div>
          </div>
          <nav className="mt-6 space-y-2">
            {[
              { key: "trips", label: "My Trips", icon: PlaneTakeoff },
              { key: "payments", label: "Payment Methods", icon: Wallet },
              { key: "account", label: "Profile", icon: CreditCard },
              { key: "bookings", label: "Search Flights", icon: CalendarDays },
            ].map((item) => (
              <button
                className={`flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-left text-sm font-medium transition-colors ${activeSection === item.key ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                key={item.key}
                onClick={() => setActiveSection(item.key as typeof activeSection)}
                type="button"
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="space-y-6">
          {activeSection === "trips" ? (
            <>
              <Card className="rounded-[32px] border-0 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
                <CardHeader>
                  <CardTitle className="text-3xl tracking-[-0.04em]">My Trips</CardTitle>
                  <p className="text-sm leading-6 text-slate-500">Manage upcoming itineraries and review completed journeys.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Upcoming</div>
                    <div className="space-y-4">
                      {dashboardData.upcomingFlights.length ? dashboardData.upcomingFlights.map((flight) => (
                        <UpcomingTripCard flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`} />
                      )) : <EmptyCard title="No upcoming flights" description="You do not have any flights scheduled yet. Search and book your next itinerary." />}
                    </div>
                  </div>
                  <form className="grid gap-4 rounded-[24px] bg-slate-50 p-5 md:grid-cols-[1fr_1fr_180px_180px_auto] md:items-end" onSubmit={handleTripFilterSubmit}>
                    <tripFilterForm.Field name="source">{(field) => <Field><FieldLabel>From</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="City or airport code" value={field.state.value} /></Field>}</tripFilterForm.Field>
                    <tripFilterForm.Field name="destination">{(field) => <Field><FieldLabel>To</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="City or airport code" value={field.state.value} /></Field>}</tripFilterForm.Field>
                    <tripFilterForm.Field name="startDate">{(field) => <Field><FieldLabel>Start date</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</tripFilterForm.Field>
                    <tripFilterForm.Field name="endDate">{(field) => <Field><FieldLabel>End date</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</tripFilterForm.Field>
                    <Button className="h-11 rounded-[16px] bg-slate-950 text-white hover:bg-slate-800" disabled={filterBusy} type="submit">{filterBusy ? "Filtering…" : "Apply filters"}</Button>
                  </form>
                  <div>
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Past journeys</div>
                    <div className="space-y-4">
                      {dashboardData.pastFlights.length ? dashboardData.pastFlights.map((flight) => {
                        const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
                        return (
                          <Card className="rounded-[24px] border-0 bg-white shadow-none ring-1 ring-slate-200/80" key={key}>
                            <CardContent className="space-y-4 px-5 py-5">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <div className="flex items-center gap-2 text-lg font-semibold tracking-[-0.03em] text-slate-950">{flight.departureAirportCode} → {flight.arrivalAirportCode}</div>
                                  <div className="mt-1 text-sm text-slate-500">{formatDateTime(flight.departureDatetime)} · Purchased {formatDateTime(flight.purchaseDatetime)}</div>
                                </div>
                                <div className="text-right text-sm text-slate-500">{flight.rating ? `Reviewed · ${flight.rating}/5` : "Awaiting review"}</div>
                              </div>
                              {flight.canReview ? (
                                <ReviewComposer flight={flight} isSubmitting={reviewingKey === key} onSubmit={handleReviewSubmit} />
                              ) : flight.comment ? <div className="rounded-[18px] bg-slate-50 px-4 py-3 text-sm text-slate-600">{flight.comment}</div> : null}
                            </CardContent>
                          </Card>
                        )
                      }) : <EmptyCard title="No matching past journeys" description="Adjust the filters above if you expected to see older purchases here." />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {activeSection === "bookings" ? (
            <Card className="rounded-[32px] border-0 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
              <CardHeader>
                <CardTitle className="text-3xl tracking-[-0.04em]">Search flights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="grid gap-4 rounded-[24px] bg-slate-50 p-5 md:grid-cols-[180px_1fr_1fr_220px_220px_auto] md:items-end" onSubmit={handleSearch}>
                  <searchForm.Field name="tripType">{(field) => <Field><FieldLabel>Trip</FieldLabel><Select onValueChange={(value) => field.handleChange(value as "one-way" | "round-trip")} value={field.state.value}><SelectTrigger className="h-11 rounded-[16px] border-0 bg-white"><SelectValue placeholder="Trip type" /></SelectTrigger><SelectContent><SelectItem value="one-way">One way</SelectItem><SelectItem value="round-trip">Round trip</SelectItem></SelectContent></Select></Field>}</searchForm.Field>
                  <searchForm.Field name="source">{(field) => <Field><FieldLabel>From</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="City or airport code" value={field.state.value} /></Field>}</searchForm.Field>
                  <searchForm.Field name="destination">{(field) => <Field><FieldLabel>To</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="City or airport code" value={field.state.value} /></Field>}</searchForm.Field>
                  <searchForm.Field name="departureDate">{(field) => <Field><FieldLabel>Departure</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</searchForm.Field>
                  <searchForm.Field name="returnDate">{(field) => <searchForm.Subscribe selector={(state) => state.values.tripType}>{(tripType) => <Field><FieldLabel>Return</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white disabled:opacity-40" disabled={tripType !== "round-trip"} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</searchForm.Subscribe>}</searchForm.Field>
                  <Button className="h-11 rounded-[16px] bg-slate-950 text-white hover:bg-slate-800" disabled={searchBusy} type="submit">{searchBusy ? "Searching…" : "Search"}</Button>
                </form>
                {searchResults ? (
                  <div className="space-y-4">
                    {searchResults.outbound.map((flight) => (
                      <SearchResultCard flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`} onChoose={setSelectedFlight} />
                    ))}
                    {searchResults.tripType === "round-trip" && searchResults.returnOptions.length ? (
                      <div className="space-y-3 pt-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Return</div>
                        {searchResults.returnOptions.map((flight) => (
                          <SearchResultCard flight={flight} key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}-return`} onChoose={setSelectedFlight} />
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : <EmptyCard title="No search yet" description="Search the live schedule and secure the flights you want from the traveler hub." />}
                {selectedFlight ? (
                  <Card className="rounded-[28px] border-0 bg-slate-950 text-white shadow-none">
                    <CardHeader>
                      <CardTitle className="text-2xl tracking-[-0.03em]">Complete your booking</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={handlePurchase}>
                        <div className="space-y-5">
                          <div className="grid gap-4 md:grid-cols-2">
                            <purchaseForm.Field name="nameOnCard">{(field) => <Field><FieldLabel>Name on card</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white text-slate-950" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</purchaseForm.Field>
                            <purchaseForm.Field name="cardNumber">{(field) => <Field><FieldLabel>Card number</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white text-slate-950" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</purchaseForm.Field>
                            <purchaseForm.Field name="cardExpiration">{(field) => <Field><FieldLabel>Expiration</FieldLabel><Input className="h-11 rounded-[16px] border-0 bg-white text-slate-950" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</purchaseForm.Field>
                            <purchaseForm.Field name="cardType">{(field) => <Field><FieldLabel>Card type</FieldLabel><Select onValueChange={(value) => field.handleChange(value ?? "credit")} value={field.state.value}><SelectTrigger className="h-11 rounded-[16px] border-0 bg-white text-slate-950"><SelectValue placeholder="Choose type" /></SelectTrigger><SelectContent><SelectItem value="credit">Credit</SelectItem><SelectItem value="debit">Debit</SelectItem></SelectContent></Select></Field>}</purchaseForm.Field>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button className="h-11 rounded-[16px] bg-white text-slate-950 hover:bg-slate-100" type="submit">Confirm & pay</Button>
                            <Button className="h-11 rounded-[16px] border-white/20 text-white hover:bg-white/10" onClick={() => setSelectedFlight(null)} type="button" variant="outline">Cancel</Button>
                          </div>
                        </div>
                        <div className="rounded-[24px] bg-white/8 p-5 text-sm text-white/75">
                          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/45">Selected route</div>
                          <div className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">{selectedFlight.departureAirportCode} → {selectedFlight.arrivalAirportCode}</div>
                          <div className="mt-2">{formatDateTime(selectedFlight.departureDatetime)}</div>
                          <div className="mt-6 text-3xl font-semibold tracking-[-0.04em] text-white">{formatCurrency(selectedFlight.basePrice)}</div>
                          <div className="mt-1">Total per traveler</div>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "payments" ? (
            <Card className="rounded-[32px] border-0 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
              <CardHeader>
                <CardTitle className="text-3xl tracking-[-0.04em]">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-600">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-[24px] bg-slate-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Saved cards</div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <PaymentCard label="Corporate" last4="4242" />
                      <PaymentCard label="Personal" last4="5555" />
                    </div>
                  </div>
                  <div className="rounded-[24px] bg-slate-50 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Billing address</div>
                    <div className="mt-4 leading-7 text-slate-600">204 Hudson Ave<br />Unit 6B<br />United States</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "account" ? (
            <Card className="rounded-[32px] border-0 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
              <CardHeader>
                <CardTitle className="text-3xl tracking-[-0.04em]">Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Profile</div>
                  <div className="mt-4 text-lg font-semibold tracking-[-0.03em] text-slate-950">{dashboardData.currentUser.displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{dashboardData.currentUser.email}</div>
                </div>
                <div className="rounded-[24px] bg-slate-50 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Security</div>
                  <div className="mt-4 text-sm leading-6 text-slate-500">The current scope exposes session/logout behavior. Password reset and 2FA are visual placeholders from the Stitch direction and not yet backed by server mutations.</div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </TravelerShell>
  )
}

function UpcomingTripCard({ flight }: { flight: (typeof Route.useLoaderData extends never ? never : any) }) {
  return (
    <Card className="rounded-[24px] border-0 bg-slate-50 shadow-none">
      <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-[18px] bg-white px-4 py-4 text-center shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{new Date(flight.departureDatetime).toLocaleDateString([], { month: "short" })}</div>
            <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{new Date(flight.departureDatetime).getDate()}</div>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-[-0.03em] text-slate-950">{flight.departureAirportCode} → {flight.arrivalAirportCode}</div>
            <div className="mt-1 text-sm text-slate-500">{formatDate(flight.departureDatetime)} · {flight.flightNumber}</div>
            <div className="mt-1 text-sm text-slate-500">{formatCurrency(flight.basePrice)}</div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" type="button">View itinerary</Button>
          <Button className="rounded-[14px]" type="button" variant="outline">Modify options</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SearchResultCard({ flight, onChoose }: { flight: FlightOption; onChoose: (flight: FlightOption) => void }) {
  return (
    <Card className="rounded-[24px] border-0 bg-slate-50 shadow-none">
      <CardContent className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_140px] lg:items-center lg:gap-8">
          <div>
            <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{new Date(flight.departureDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="mt-1 text-sm text-slate-500">{flight.departureAirportCode}</div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{flight.airlineName} {flight.flightNumber}</span>
              <Badge className="rounded-full bg-white px-2.5 py-1 text-slate-600 hover:bg-white" variant="secondary">{flight.availableSeats} seats left</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className="h-px flex-1 bg-slate-200" />
              <span>Nonstop</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="text-sm text-slate-500">{titleCaseStatus(flight.status)}</div>
          </div>
          <div className="text-left lg:text-right">
            <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">{new Date(flight.arrivalDatetime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="mt-1 text-sm text-slate-500">{flight.arrivalAirportCode}</div>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:min-w-[160px] lg:items-end">
          <div className="text-right">
            <div className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">{formatCurrency(flight.basePrice)}</div>
            <div className="mt-1 text-sm text-slate-500">Round trip</div>
          </div>
          <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" onClick={() => onChoose(flight)} type="button">
            Select
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewComposer({
  flight,
  isSubmitting,
  onSubmit,
}: {
  flight: (typeof Route.useLoaderData extends never ? never : any)["pastFlights"][number]
  isSubmitting: boolean
  onSubmit: (
    flight: (typeof Route.useLoaderData extends never ? never : any)["pastFlights"][number],
    values: { comment: string; rating: string },
  ) => Promise<void>
}) {
  const form = useForm({
    defaultValues: {
      comment: flight.comment ?? "",
      rating: "",
    },
    onSubmit: async ({ value }) => onSubmit(flight, value),
  })

  return (
    <div className="grid gap-4 rounded-[20px] bg-slate-50 p-4 md:grid-cols-[120px_1fr_auto] md:items-end">
      <form.Field name="rating">
        {(field) => (
          <Field>
            <FieldLabel>Rating</FieldLabel>
            <Select onValueChange={(value) => field.handleChange(value ?? "")} value={field.state.value}>
              <SelectTrigger className="rounded-[14px] border-0 bg-white"><SelectValue placeholder="Stars" /></SelectTrigger>
              <SelectContent>{[1, 2, 3, 4, 5].map((value) => <SelectItem key={value} value={String(value)}>{value} / 5</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        )}
      </form.Field>
      <form.Field name="comment">
        {(field) => (
          <Field>
            <FieldLabel>Share details</FieldLabel>
            <Textarea className="min-h-[110px] rounded-[16px] border-0 bg-white" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="Tell me about the service, comfort, and punctuality." value={field.state.value} />
          </Field>
        )}
      </form.Field>
      <Button className="h-11 rounded-[16px] bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmitting} onClick={() => form.handleSubmit()} type="button">
        {isSubmitting ? "Saving…" : "Submit review"}
      </Button>
    </div>
  )
}

function PaymentCard({ label, last4 }: { label: string; last4: string }) {
  return (
    <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-lg font-semibold tracking-[-0.03em] text-slate-950">•••• {last4}</div>
      <div className="mt-1 text-sm text-slate-500">Visa ending in {last4}</div>
    </div>
  )
}

function EmptyCard({ description, title }: { description: string; title: string }) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-8 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><Star className="size-5" /></div>
      <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}
