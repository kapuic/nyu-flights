import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import {
  ArrowRight,
  CreditCard,
  History,
  Lock,
  Plane,
  Plus,
  Settings,
  Star,
  User,
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
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  titleCaseStatus,
} from "@/lib/format"
import {
  getCustomerDashboardFn,
  purchaseTicketFn,
  searchFlightsFn,
  submitReviewFn,
} from "@/lib/queries"
import { cn } from "@/lib/utils"

function normalizeDateTimeInput(value: Date | string) {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    const hours = String(value.getHours()).padStart(2, "0")
    const minutes = String(value.getMinutes()).padStart(2, "0")
    const seconds = String(value.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  return value.replace("T", " ").replace(/\.\d+Z?$/, "")
}

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

export const Route = createFileRoute("/customer")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff/app" })

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
  const [activeSection, setActiveSection] = useState<
    "profile" | "flights" | "payments" | "security" | "preferences"
  >("flights")
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchResults, setSearchResults] = useState<{
    outbound: Array<FlightOption>
    returnOptions: Array<FlightOption>
    tripType: "one-way" | "round-trip"
  } | null>(null)
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(
    null
  )
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
        if (!result.outbound.length)
          toast.message("No future flights matched those filters.")
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
      try {
        const response = await purchaseTicketFn({
          data: {
            airlineName: selectedFlight.airlineName,
            cardExpiration: value.cardExpiration,
            cardNumber: value.cardNumber,
            cardType: value.cardType as "credit" | "debit",
            departureDatetime: normalizeDateTimeInput(
              selectedFlight.departureDatetime as Date | string
            ),
            flightNumber: selectedFlight.flightNumber,
            nameOnCard: value.nameOnCard,
          },
        })
        toast.success(response.message)
        setSelectedFlight(null)
        purchaseForm.reset()
        setDashboardData(
          await getCustomerDashboardFn({
            data: { destination: "", endDate: "", source: "", startDate: "" },
          })
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "We couldn't complete that booking."
        )
      }
    },
  })

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  async function handleReviewSubmit(
    flight: (typeof dashboardData.pastFlights)[number],
    values: { comment: string; rating: string }
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
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.message ?? "Review saved.")
      setDashboardData(
        await getCustomerDashboardFn({
          data: { destination: "", endDate: "", source: "", startDate: "" },
        })
      )
    } finally {
      setReviewingKey(null)
    }
  }

  const sidebarItems = [
    { icon: User, key: "profile" as const, label: "Profile" },
    { icon: Plane, key: "flights" as const, label: "My Trips" },
    { icon: CreditCard, key: "payments" as const, label: "Payment Methods" },
    { icon: Lock, key: "security" as const, label: "Security" },
    { icon: Settings, key: "preferences" as const, label: "Preferences" },
  ]

  return (
    <TravelerShell
      currentUser={{
        displayName: dashboardData.currentUser.displayName,
        email: dashboardData.currentUser.email,
      }}
      onLogout={handleLogout}
      section="bookings"
    >
      <div className="mx-auto flex w-full max-w-screen-2xl flex-1">
        {/* Sidebar — matches Stitch traveler_my_trips_hub */}
        <aside className="hidden w-64 shrink-0 border-r-0 bg-slate-50 p-4 md:sticky md:top-16 md:flex md:h-[calc(100vh-4rem)] md:flex-col">
          <div className="mb-8 px-2 pt-4">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-600">
                <span className="text-sm font-bold">
                  {dashboardData.currentUser.displayName
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")}
                </span>
              </div>
              <div>
                <h2 className="leading-tight font-bold text-slate-900">
                  Traveler Hub
                </h2>
                <p className="text-xs text-slate-500">Silver Status</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 text-sm font-medium">
            {sidebarItems.map((item) => (
              <Button
                className={cn(
                  "justify-start gap-3 rounded-sm px-3 py-2.5 text-left transition-colors",
                  activeSection === item.key
                    ? "bg-white font-semibold text-slate-900 shadow-sm"
                    : "text-slate-500 hover:bg-slate-200/50"
                )}
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                type="button"
                variant="ghost"
              >
                <item.icon className="size-5" />
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sidebarItems.map((item) => (
              <Button
                className={cn(
                  "shrink-0 rounded-full px-4 text-sm",
                  activeSection === item.key
                    ? "bg-slate-950 text-white hover:bg-slate-800"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                )}
                key={item.key}
                onClick={() => setActiveSection(item.key)}
                size="sm"
                type="button"
                variant={activeSection === item.key ? "default" : "outline"}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content — matches Stitch content area */}
        <main className="flex-1 p-6 md:p-12">
          <div className="mx-auto max-w-4xl">
            {activeSection === "profile" ? (
              <ProfileSection dashboardData={dashboardData} />
            ) : null}
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

function ProfileSection({
  dashboardData,
}: {
  dashboardData: Awaited<ReturnType<typeof getCustomerDashboardFn>>
}) {
  const initials = dashboardData.currentUser.displayName
    .split(" ")
    .map((name: string) => name[0])
    .join("")

  return (
    <>
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950">Profile</h1>
          <p className="text-sm text-slate-500">
            Review your traveler identity, account summary, and booking activity
            from one place.
          </p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-700">
              {initials}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950">
                {dashboardData.currentUser.displayName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {dashboardData.currentUser.email}
              </p>
              <div className="mt-3 inline-flex items-center rounded-sm bg-slate-100 px-2.5 py-1 text-xs font-semibold tracking-wider text-slate-600 uppercase">
                Traveler account
              </div>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <ProfileMetric
              description="Flights already booked and still ahead of you."
              label="Upcoming trips"
              value={String(dashboardData.upcomingFlights.length)}
            />
            <ProfileMetric
              description="Journeys that have already landed and can inform future planning."
              label="Past trips"
              value={String(dashboardData.pastFlights.length)}
            />
            <ProfileMetric
              description="Primary account identity used across booking and review flows."
              label="Sign-in email"
              value={dashboardData.currentUser.email}
            />
            <ProfileMetric
              description="Current traveler tier shown throughout the customer shell."
              label="Status tier"
              value="Silver"
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">Traveler Summary</h2>
          <div className="mt-6 space-y-4">
            <ProfileSummaryRow
              label="Most recent upcoming route"
              value={
                dashboardData.upcomingFlights[0]
                  ? `${dashboardData.upcomingFlights[0].departureAirportCode} → ${dashboardData.upcomingFlights[0].arrivalAirportCode}`
                  : "No upcoming trips"
              }
            />
            <ProfileSummaryRow
              label="Latest purchase"
              value={
                dashboardData.upcomingFlights[0]
                  ? formatDate(
                      dashboardData.upcomingFlights[0].purchaseDatetime
                    )
                  : "No recent purchase"
              }
            />
            <ProfileSummaryRow
              label="Reviewable journeys"
              value={String(
                dashboardData.pastFlights.filter((flight) => flight.canReview)
                  .length
              )}
            />
            <ProfileSummaryRow
              label="Saved payment surface"
              value="Available in Payment Methods"
            />
          </div>
          <div className="mt-8 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Profile editing remains intentionally read-only until the product
            has a supported customer-profile update flow and matching backend
            model.
          </div>
        </div>
      </div>
    </>
  )
}

function ProfileMetric({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold break-words text-slate-950">
        {value}
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function ProfileSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 last:border-b-0 last:pb-0">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="max-w-[60%] text-right text-sm font-semibold text-slate-950">
        {value}
      </div>
    </div>
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
  handleReviewSubmit: (
    flight: (typeof dashboardData.pastFlights)[number],
    values: { comment: string; rating: string }
  ) => Promise<void>
  purchaseForm: any
  reviewingKey: string | null
  searchBusy: boolean
  searchForm: any
  searchResults: {
    outbound: Array<FlightOption>
    returnOptions: Array<FlightOption>
    tripType: "one-way" | "round-trip"
  } | null
  selectedFlight: FlightOption | null
  setSelectedFlight: (flight: FlightOption | null) => void
}) {
  return (
    <>
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-slate-950">My Trips</h1>
          <p className="text-sm text-slate-500">
            Manage your upcoming itineraries and review past journeys.
          </p>
        </div>
      </div>

      {/* Upcoming Trips */}
      <section className="mb-12">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-950">
          <Plane className="size-5 text-slate-950" />
          Upcoming
        </h2>
        <div className="grid gap-6">
          {dashboardData.upcomingFlights.length ? (
            dashboardData.upcomingFlights.map((flight) => (
              <UpcomingTripCard
                flight={flight}
                key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`}
              />
            ))
          ) : (
            <div className="rounded-lg bg-white p-10 text-center shadow-sm">
              <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-slate-100">
                <Plane className="size-10 text-slate-400" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-slate-950">
                No upcoming flights
              </h3>
              <p className="mx-auto mb-8 max-w-md text-sm text-slate-500">
                You don't have any flights scheduled. Ready to plan your next
                destination?
              </p>
              <Button
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-950 to-slate-800 text-white hover:opacity-90"
                onClick={() => {}}
              >
                Search Flights <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Book Flights (inline search) */}
      <section className="mb-12">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-950">
          <Plus className="size-5" />
          Book a Flight
        </h2>
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_180px_180px_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              searchForm.handleSubmit()
            }}
          >
            <div className="space-y-1.5">
              <Label
                className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                htmlFor="customer-search-from"
              >
                From
              </Label>
              <searchForm.Field
                name="source"
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    validateAirportValue("an origin airport", value),
                  onSubmit: ({ value }: { value: string }) =>
                    validateAirportValue("an origin airport", value),
                }}
              >
                {(field: any) => (
                  <AirportAutocompleteInput
                    className="rounded-lg bg-slate-50"
                    error={getFormFieldError(field)}
                    id="customer-search-from"
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    placeholder="City or airport"
                    value={field.state.value}
                  />
                )}
              </searchForm.Field>
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                htmlFor="customer-search-to"
              >
                To
              </Label>
              <searchForm.Field
                name="destination"
                validators={{
                  onChange: ({
                    value,
                    fieldApi,
                  }: {
                    value: string
                    fieldApi: {
                      form: { getFieldValue: (name: string) => string }
                    }
                  }) =>
                    validateAirportValue("a destination airport", value) ??
                    validateDifferentAirport(
                      value,
                      fieldApi.form.getFieldValue("source")
                    ),
                  onChangeListenTo: ["source"],
                  onSubmit: ({
                    value,
                    fieldApi,
                  }: {
                    value: string
                    fieldApi: {
                      form: { getFieldValue: (name: string) => string }
                    }
                  }) =>
                    validateAirportValue("a destination airport", value) ??
                    validateDifferentAirport(
                      value,
                      fieldApi.form.getFieldValue("source")
                    ),
                }}
              >
                {(field: any) => (
                  <AirportAutocompleteInput
                    className="rounded-lg bg-slate-50"
                    error={getFormFieldError(field)}
                    id="customer-search-to"
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    placeholder="City or airport"
                    value={field.state.value}
                  />
                )}
              </searchForm.Field>
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                htmlFor="customer-search-departure"
              >
                Departure
              </Label>
              <searchForm.Field
                name="departureDate"
                validators={{
                  onChange: ({ value }: { value: string }) =>
                    validateDateValue("a departure date", value),
                  onSubmit: ({ value }: { value: string }) =>
                    validateDateValue("a departure date", value),
                }}
              >
                {(field: any) => (
                  <DatePickerButtonField
                    className="rounded-lg bg-slate-50"
                    error={getFormFieldError(field)}
                    id="customer-search-departure"
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    placeholder="Select date"
                    value={field.state.value}
                  />
                )}
              </searchForm.Field>
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                htmlFor="customer-search-return"
              >
                Return
              </Label>
              <searchForm.Field
                name="returnDate"
                validators={{
                  onChange: ({
                    value,
                    fieldApi,
                  }: {
                    value: string
                    fieldApi: {
                      form: {
                        getFieldValue: (
                          name: string
                        ) => "one-way" | "round-trip" | string
                      }
                    }
                  }) =>
                    validateReturnDate(
                      value,
                      String(fieldApi.form.getFieldValue("departureDate")),
                      fieldApi.form.getFieldValue("tripType") as
                        | "one-way"
                        | "round-trip"
                    ),
                  onChangeListenTo: ["departureDate", "tripType"],
                  onSubmit: ({
                    value,
                    fieldApi,
                  }: {
                    value: string
                    fieldApi: {
                      form: {
                        getFieldValue: (
                          name: string
                        ) => "one-way" | "round-trip" | string
                      }
                    }
                  }) =>
                    validateReturnDate(
                      value,
                      String(fieldApi.form.getFieldValue("departureDate")),
                      fieldApi.form.getFieldValue("tripType") as
                        | "one-way"
                        | "round-trip"
                    ),
                }}
              >
                {(field: any) => (
                  <DatePickerButtonField
                    className="rounded-lg bg-slate-50"
                    disabled={searchForm.state.values.tripType !== "round-trip"}
                    error={getFormFieldError(field)}
                    id="customer-search-return"
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                    placeholder="Select date"
                    value={field.state.value}
                  />
                )}
              </searchForm.Field>
            </div>
            <Button
              className="rounded-lg bg-slate-950 text-white hover:bg-slate-800"
              disabled={searchBusy}
              type="submit"
            >
              {searchBusy ? "Searching…" : "Search"}
            </Button>
          </form>
        </div>

        {/* Search Results */}
        {searchResults ? (
          <div className="mt-6 space-y-4">
            {searchResults.outbound.map((flight) => (
              <SearchResultCard
                flight={flight}
                key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`}
                onChoose={setSelectedFlight}
              />
            ))}
          </div>
        ) : null}

        {/* Purchase Form */}
        {selectedFlight ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-8">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-950">
                      Complete your booking
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Review passenger details and payment before confirming
                      this reservation.
                    </p>
                  </div>
                  <Button disabled type="button" variant="outline">
                    Sign in shortcut
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Passenger Details
                  </h3>
                </div>
                <div className="space-y-6">
                  <div className="border-b border-slate-200 pb-3 text-sm font-semibold text-slate-950">
                    Primary Traveler
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldPreview
                      description="Use the same legal name shown on the traveler identity document."
                      label="First Name"
                      value={
                        dashboardData.currentUser.displayName.split(" ")[0] ??
                        dashboardData.currentUser.displayName
                      }
                    />
                    <FieldPreview
                      description="Last-name capture remains UI-only until customer profile editing is supported."
                      label="Last Name"
                      value={
                        dashboardData.currentUser.displayName
                          .split(" ")
                          .slice(1)
                          .join(" ") || "Add in future profile flow"
                      }
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldPreview
                      description="Traveler birthdate is collected during registration and should eventually prefill here from supported account data."
                      label="Date of Birth"
                      value="Profile-backed later"
                    />
                    <FieldPreview
                      description="Nationality selection is shown here for checkout composition only and is not submitted in the current purchase mutation."
                      label="Nationality"
                      value="Select in future profile flow"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FieldPreview
                      description="Passport data should come from a future editable traveler profile, not a fake checkout-only store."
                      label="Passport Number"
                      value="Profile-backed later"
                    />
                    <FieldPreview
                      description="Known traveler programs remain intentionally informational until the backend model supports them."
                      label="Known Traveler #"
                      value="Optional in future"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">
                    Contact Information
                  </h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldPreview
                    description="Booking confirmation and flight updates will be sent here."
                    label="Email Address"
                    value={dashboardData.currentUser.email}
                  />
                  <FieldPreview
                    description="Phone verification and traveler-profile editing are not implemented yet, so this stays informational for now."
                    label="Phone Number"
                    value="Add in future profile flow"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">Payment</h3>
                </div>
                <form
                  className="space-y-5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    void purchaseForm.handleSubmit()
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      className="flex items-center gap-3 rounded-lg border border-slate-950 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-950"
                      type="button"
                    >
                      <CreditCard className="size-4" /> Credit Card
                    </button>
                    <button
                      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-500"
                      disabled
                      type="button"
                    >
                      <CreditCard className="size-4" /> Bank Transfer
                    </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label
                        className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                        htmlFor="purchase-card-number"
                      >
                        Card Number
                      </Label>
                      <purchaseForm.Field name="cardNumber">
                        {(field: any) => (
                          <Input
                            autoComplete="cc-number"
                            className="rounded-lg bg-slate-50 font-mono tracking-widest text-slate-950"
                            id="purchase-card-number"
                            inputMode="numeric"
                            onBlur={field.handleBlur}
                            onChange={(e: any) =>
                              field.handleChange(e.target.value)
                            }
                            placeholder="0000 0000 0000 0000"
                            value={field.state.value}
                          />
                        )}
                      </purchaseForm.Field>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                        htmlFor="purchase-card-expiration"
                      >
                        Expiration
                      </Label>
                      <purchaseForm.Field name="cardExpiration">
                        {(field: any) => (
                          <DatePickerButtonField
                            className="rounded-lg bg-slate-50"
                            id="purchase-card-expiration"
                            onChange={field.handleChange}
                            placeholder="Select date"
                            value={field.state.value}
                          />
                        )}
                      </purchaseForm.Field>
                    </div>
                    <div className="space-y-1.5">
                      <Label
                        className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                        htmlFor="purchase-card-type"
                      >
                        Card Type
                      </Label>
                      <purchaseForm.Field name="cardType">
                        {(field: any) => (
                          <Select
                            onValueChange={(v) =>
                              field.handleChange(v ?? field.state.value)
                            }
                            value={field.state.value}
                          >
                            <SelectTrigger
                              className="w-full rounded-lg bg-slate-50 text-slate-950"
                              id="purchase-card-type"
                            >
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit">Credit</SelectItem>
                              <SelectItem value="debit">Debit</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </purchaseForm.Field>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label
                        className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase"
                        htmlFor="purchase-name-on-card"
                      >
                        Name on Card
                      </Label>
                      <purchaseForm.Field name="nameOnCard">
                        {(field: any) => (
                          <Input
                            autoComplete="cc-name"
                            className="rounded-lg bg-slate-50 text-slate-950"
                            id="purchase-name-on-card"
                            onBlur={field.handleBlur}
                            onChange={(e: any) =>
                              field.handleChange(e.target.value)
                            }
                            placeholder="Full name"
                            value={field.state.value}
                          />
                        )}
                      </purchaseForm.Field>
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    This checkout keeps passenger and contact sections
                    presentation-only for now. The real purchase mutation still
                    submits only the supported payment and flight fields.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="rounded-lg bg-slate-950 text-white hover:bg-slate-800"
                      type="submit"
                    >
                      Confirm & Pay
                    </Button>
                    <Button
                      className="rounded-lg"
                      onClick={() => setSelectedFlight(null)}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
                  <div className="text-xs font-semibold tracking-wider text-white/70 uppercase">
                    Selected Itinerary
                  </div>
                  <div className="mt-2 text-2xl font-bold">
                    {selectedFlight.departureAirportCode} →{" "}
                    {selectedFlight.arrivalAirportCode}
                  </div>
                  <div className="mt-1 text-sm text-white/70">
                    {selectedFlight.departureCity} to{" "}
                    {selectedFlight.arrivalCity}
                  </div>
                </div>
                <div className="space-y-6 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                        Departure
                      </div>
                      <div className="mt-1 text-xl font-bold text-slate-950">
                        {formatDateTime(selectedFlight.departureDatetime)}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "rounded-sm px-2 py-1 text-[0.6875rem] font-bold tracking-[0.05em] uppercase",
                        selectedFlight.status === "on_time"
                          ? "bg-[#cde5ff] text-[#004b74]"
                          : "bg-red-100 text-red-700"
                      )}
                      variant="secondary"
                    >
                      {titleCaseStatus(selectedFlight.status)}
                    </Badge>
                  </div>
                  <div className="grid gap-4 border-y border-slate-200 py-4 text-sm text-slate-500">
                    <CheckoutSummaryRow
                      label="Flight"
                      value={`${selectedFlight.airlineName} ${selectedFlight.flightNumber}`}
                    />
                    <CheckoutSummaryRow label="Cabin" value="Economy" />
                    <CheckoutSummaryRow
                      label="Traveler"
                      value={dashboardData.currentUser.displayName}
                    />
                    <CheckoutSummaryRow
                      label="Available seats"
                      value={String(selectedFlight.availableSeats)}
                    />
                  </div>
                  <div className="space-y-3">
                    <CheckoutSummaryRow
                      label="Base fare"
                      value={formatCurrency(selectedFlight.basePrice)}
                    />
                    <CheckoutSummaryRow label="Taxes & fees" value="Included" />
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <div className="text-sm font-semibold text-slate-950">
                        Total per traveler
                      </div>
                      <div className="text-2xl font-bold text-slate-950">
                        {formatCurrency(selectedFlight.basePrice)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Past Journeys */}
      <section>
        <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold text-slate-950">
          <History className="size-5 text-slate-500" />
          Past Journeys
        </h2>
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="flex flex-col gap-2">
            {dashboardData.pastFlights.length ? (
              dashboardData.pastFlights.map((flight) => {
                const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
                return (
                  <div className="rounded bg-white p-4 shadow-sm" key={key}>
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded bg-slate-100">
                          <Plane className="size-5 text-slate-500" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-950">
                            {flight.departureAirportCode} →{" "}
                            {flight.arrivalAirportCode}
                          </h4>
                          <p className="text-xs font-medium text-slate-500">
                            {formatDateTime(flight.departureDatetime)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {flight.canReview ? (
                          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                            Review available
                          </span>
                        ) : flight.rating ? (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                className={cn(
                                  "size-4",
                                  i < flight.rating!
                                    ? "fill-slate-950 text-slate-950"
                                    : "text-slate-300"
                                )}
                                key={i}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                    {flight.canReview ? (
                      <ReviewComposer
                        flight={flight}
                        isSubmitting={reviewingKey === key}
                        onSubmit={handleReviewSubmit}
                      />
                    ) : flight.comment ? (
                      <div className="mt-4 rounded bg-slate-50 px-4 py-3 text-sm text-slate-600 italic">
                        "{flight.comment}"
                      </div>
                    ) : null}
                  </div>
                )
              })
            ) : (
              <div className="rounded bg-white p-8 text-center text-sm text-slate-500">
                No past journeys yet.
              </div>
            )}
          </div>
          <div className="mt-6 text-center">
            <Button
              className="text-slate-500 hover:text-slate-950"
              size="sm"
              variant="ghost"
            >
              Load more history <Star className="size-4" />
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

function FieldPreview({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-[0.6875rem] font-bold tracking-[0.05em] text-slate-500 uppercase">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function CheckoutSummaryRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-semibold text-slate-950">
        {value}
      </div>
    </div>
  )
}

/* ─── Upcoming Trip Card ─── */

function UpcomingTripCard({ flight }: { flight: any }) {
  return (
    <div className="flex flex-col gap-6 rounded bg-white p-6 shadow-sm md:flex-row">
      <div className="relative w-full shrink-0 overflow-hidden rounded md:w-48">
        <div className="flex aspect-video items-center justify-center bg-slate-200">
          <Plane className="size-8 text-slate-400" />
        </div>
        <span className="absolute bottom-2 left-2 text-lg font-bold text-white drop-shadow-md">
          {flight.arrivalAirportCode}
        </span>
      </div>
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              className="rounded-sm bg-[#cde5ff] px-2 py-0.5 text-[10px] font-bold tracking-widest text-[#004b74] uppercase"
              variant="secondary"
            >
              Managed
            </Badge>
            <span className="text-xs font-medium text-slate-500">
              Confirmation: {flight.flightNumber}
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-950">
            {formatDate(flight.departureDatetime)}
          </span>
        </div>
        <h3 className="mb-1 text-xl font-bold text-slate-950">
          {flight.arrivalCity ?? flight.arrivalAirportCode}
        </h3>
        <p className="mb-4 text-sm text-slate-500">Direct flight · Economy</p>
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded bg-slate-950 text-white hover:bg-slate-800"
            size="sm"
          >
            View Itinerary
          </Button>
          <Button className="rounded" size="sm" variant="outline">
            Modify Options
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ─── Search Result Card ─── */

function SearchResultCard({
  flight,
  onChoose,
}: {
  flight: FlightOption
  onChoose: (f: FlightOption) => void
}) {
  const dep = new Date(flight.departureDatetime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  const arr = new Date(flight.arrivalDatetime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })
  return (
    <div className="flex flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-sm md:flex-row">
      <div className="w-full flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-950">
            {flight.airlineName} {flight.flightNumber}
          </span>
          <Badge
            className={cn(
              "rounded-sm px-2 py-1 text-[0.6875rem] font-bold tracking-[0.05em] uppercase",
              flight.status === "on_time"
                ? "bg-[#cde5ff] text-[#004b74]"
                : "bg-red-100 text-red-700"
            )}
            variant="secondary"
          >
            {titleCaseStatus(flight.status)}
          </Badge>
        </div>
        <div className="flex w-full items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-950">{dep}</div>
            <div className="text-sm font-medium text-slate-500">
              {flight.departureAirportCode}
            </div>
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
            <div className="text-2xl font-bold text-slate-950">{arr}</div>
            <div className="text-sm font-medium text-slate-500">
              {flight.arrivalAirportCode}
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-row items-center justify-between md:w-auto md:flex-col md:items-end md:gap-4">
        <div className="text-left md:text-right">
          <div className="text-3xl font-bold text-slate-950">
            {formatCurrency(flight.basePrice)}
          </div>
          <div className="text-xs text-slate-500">Round trip</div>
        </div>
        <Button
          className="rounded-lg bg-slate-950 text-white hover:bg-slate-800"
          onClick={() => onChoose(flight)}
        >
          Select
        </Button>
      </div>
    </div>
  )
}

/* ─── Review Composer ─── */

function ReviewComposer({
  flight,
  isSubmitting,
  onSubmit,
}: {
  flight: any
  isSubmitting: boolean
  onSubmit: (
    flight: any,
    values: { comment: string; rating: string }
  ) => Promise<void>
}) {
  const form = useForm({
    defaultValues: { comment: flight.comment ?? "", rating: "" },
    onSubmit: async ({ value }) => onSubmit(flight, value),
  })

  return (
    <div className="mt-4 rounded-lg bg-slate-50 p-5">
      <h4 className="mb-3 text-sm font-semibold text-slate-950">
        Rate your experience
      </h4>
      <form.Field name="rating">
        {(field: any) => (
          <div className="mb-4 flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                className={cn(
                  "text-2xl transition-colors",
                  Number(field.state.value) >= v
                    ? "text-slate-950"
                    : "text-slate-300 hover:text-slate-500"
                )}
                key={v}
                onClick={() => field.handleChange(String(v))}
                type="button"
              >
                <Star
                  className={cn(
                    "size-6",
                    Number(field.state.value) >= v && "fill-slate-950"
                  )}
                />
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
      <Button
        className="rounded bg-slate-950 text-white hover:bg-slate-800"
        disabled={isSubmitting}
        onClick={() => form.handleSubmit()}
        size="sm"
        type="button"
      >
        {isSubmitting ? "Saving…" : "Submit Review"}
      </Button>
    </div>
  )
}

/* ─── Payments Section ─── */

function PaymentsSection() {
  return (
    <>
      <h1 className="mb-2 text-3xl font-bold text-slate-950">
        Payment Methods
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        Manage your saved cards and billing information for seamless bookings.
      </p>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h2 className="text-xl font-bold text-slate-950">Saved Cards</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <CreditCard className="size-5 text-slate-950" />
                <Badge
                  className="rounded-sm bg-slate-200 text-[0.6875rem] font-bold tracking-[0.05em] text-slate-700 uppercase"
                  variant="secondary"
                >
                  Default
                </Badge>
              </div>
              <div className="text-sm text-slate-500">Corporate Card</div>
              <div className="mt-1 text-lg font-bold tracking-wider text-slate-950">
                •••• •••• •••• 4242
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Exp: 12/26</span>
                <span className="font-bold">Visa</span>
              </div>
            </div>
            <div className="rounded bg-slate-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <CreditCard className="size-5 text-slate-500" />
              </div>
              <div className="text-sm text-slate-500">
                Personal Rewards Card
              </div>
              <div className="mt-1 text-lg font-bold tracking-wider text-slate-950">
                •••• •••• •••• 5555
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>Exp: 08/25</span>
                <span className="font-bold">Mastercard</span>
              </div>
            </div>
          </div>
        </div>
        <div className="rounded bg-slate-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-950">
            Billing Address
          </h2>
          <div className="text-sm leading-relaxed text-slate-600">
            John Doe
            <br />
            123 Aviation Parkway
            <br />
            Suite 400
            <br />
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
      <h1 className="mb-2 text-3xl font-bold text-slate-950">
        Security Settings
      </h1>
      <p className="mb-8 text-sm text-slate-500">
        Manage your account access and security preferences.
      </p>
      <div className="space-y-8">
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-950">
            <Lock className="size-5 text-slate-400" /> Change Password
          </h2>
          <form className="space-y-5">
            <div>
              <Label
                className="mb-1 block text-sm font-medium text-slate-950"
                htmlFor="customer-current-password"
              >
                Current Password
              </Label>
              <Input
                autoComplete="current-password"
                className="border-b-2 border-slate-200 bg-white px-0 shadow-none focus-visible:ring-0"
                id="customer-current-password"
                placeholder="••••••••"
                type="password"
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label
                  className="mb-1 block text-sm font-medium text-slate-950"
                  htmlFor="customer-new-password"
                >
                  New Password
                </Label>
                <Input
                  autoComplete="new-password"
                  className="border-b-2 border-slate-200 bg-white px-0 shadow-none focus-visible:ring-0"
                  id="customer-new-password"
                  placeholder="Enter new password"
                  type="password"
                />
              </div>
              <div>
                <Label
                  className="mb-1 block text-sm font-medium text-slate-950"
                  htmlFor="customer-confirm-password"
                >
                  Confirm New Password
                </Label>
                <Input
                  autoComplete="new-password"
                  className="border-b-2 border-slate-200 bg-white px-0 shadow-none focus-visible:ring-0"
                  id="customer-confirm-password"
                  placeholder="Confirm new password"
                  type="password"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button className="rounded-lg" type="reset" variant="secondary">
                Cancel
              </Button>
              <Button
                className="rounded-lg bg-slate-950 text-white hover:bg-slate-800"
                type="submit"
              >
                Update Password
              </Button>
            </div>
          </form>
        </div>
        <div className="rounded-lg bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-950">
                <Lock className="size-5 text-slate-400" /> Two-Factor
                Authentication
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                This setup surface is intentionally informational for now. The
                current PostgreSQL-backed product model does not yet support
                storing second-factor enrollment state.
              </p>
            </div>
            <span className="inline-flex items-center rounded-sm bg-slate-100 px-2.5 py-1 text-xs font-semibold tracking-wider text-slate-600 uppercase">
              Unavailable
            </span>
          </div>
          <div className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Authenticator app
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Prepare app-based verification once enrollment, challenge, and
                  recovery flows exist on the backend.
                </p>
              </div>
              <Button disabled type="button" variant="outline">
                Setup
              </Button>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Recovery codes, device trust, and SMS fallback remain intentionally
            disabled until the server model and auth flows support them.
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
      <h1 className="mb-2 text-3xl font-bold text-slate-950">Preferences</h1>
      <p className="mb-8 text-sm text-slate-500">
        Customize your travel experience.
      </p>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Traveler Preferences
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            These controls are prepared in the UI now. They are not wired to
            persistent storage because the current PostgreSQL schema does not
            model traveler preference records.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <PreferenceTile
              description="Prefer nonstop and shorter itineraries when available."
              title="Route priority"
              value="Fastest routes"
            />
            <PreferenceTile
              description="Keep seat requests ready once trip-level seat selection is implemented."
              title="Seat preference"
              value="Aisle seat"
            />
            <PreferenceTile
              description="Prepare meal intent without inventing unsupported backend tables."
              title="Meal preference"
              value="Standard meal"
            />
            <PreferenceTile
              description="Default cabin used to prefill future search and booking flows."
              title="Cabin preference"
              value="Economy"
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Notification Defaults
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            These controls intentionally remain informational and disabled until
            notification channels exist in the real product model.
          </p>
          <div className="mt-8 space-y-4">
            <PreferenceToggleRow
              description="Email trip reminders and schedule-change summaries."
              label="Email alerts"
            />
            <PreferenceToggleRow
              description="SMS disruption alerts after phone verification exists."
              label="SMS alerts"
            />
            <PreferenceToggleRow
              description="Price-watch alerts once watchlists are implemented."
              label="Fare watches"
            />
          </div>
        </div>
      </div>
    </>
  )
}

function PreferenceTile({
  description,
  title,
  value,
}: {
  description: string
  title: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
        {title}
      </div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  )
}

function PreferenceToggleRow({
  description,
  label,
}: {
  description: string
  label: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
      <div>
        <div className="text-sm font-semibold text-slate-950">{label}</div>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      <button
        aria-disabled="true"
        className="mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-slate-200 p-1 opacity-70"
        disabled
        type="button"
      >
        <span className="block size-4 rounded-full bg-white shadow-sm" />
      </button>
    </div>
  )
}
