import { useState } from "react"
import { Link, createFileRoute, redirect } from "@tanstack/react-router"
import {
  Clock,
  Plane,
  PlaneLanding,
  Star,
} from "lucide-react"

import type { CustomerFlight } from "@/lib/queries"

import { AppNavbar } from "@/components/app-navbar"
import { ReviewDialog } from "@/components/review-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getCurrentUserFn } from "@/lib/auth"
import { getCustomerDashboardFn } from "@/lib/queries"

export const Route = createFileRoute("/trips")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff" })

    const dashboard = await getCustomerDashboardFn({
      data: { destination: "", endDate: "", source: "", startDate: "" },
    })
    return { ...dashboard, currentUser }
  },
  component: TripsPage,
})

function formatDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    year: d.getFullYear(),

    time: d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  }
}

function StatusBadge({ status }: { status: "on_time" | "delayed" }) {
  if (status === "delayed") {
    return (
      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
        Delayed
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
      Confirmed
    </Badge>
  )
}

function FilledStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-3.5 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground/20"
          }`}
        />
      ))}
    </div>
  )
}

function TripCard({
  flight,
  onReview,
}: {
  flight: CustomerFlight
  onReview: (flight: CustomerFlight) => void
}) {
  const dep = formatDate(flight.departureDatetime)
  const arr = formatDate(flight.arrivalDatetime)

  return (
    <Card size="sm" className="@container overflow-hidden">
      <CardContent className="flex gap-0">
        {/* Date sidebar — shown when card is wide enough */}
        <div className="hidden @min-sm:flex flex-col items-center justify-center border-r border-border/50 pr-5 mr-5 min-w-20">
          <span className="text-xs font-medium tracking-wider text-muted-foreground">
            {dep.month}
          </span>
          <span className="text-3xl font-semibold tabular-nums leading-tight">
            {dep.day}
          </span>
          <span className="text-xs text-muted-foreground">{dep.year}</span>
        </div>

        {/* Card body */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Top row: status + flight number + airline + date (narrow) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusBadge status={flight.status} />
              <span className="text-sm font-semibold">{flight.flightNumber}</span>
              <span className="text-xs text-muted-foreground">
                {flight.airlineName}
              </span>
            </div>
            <span className="text-xs text-muted-foreground @min-sm:hidden">
              {dep.month} {dep.day}, {dep.year}
            </span>
          </div>

          {/* Route: two-column departure → arrival */}
          <div className="flex items-center gap-3">
            {/* Departure */}
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-semibold tracking-tight leading-none">
                {flight.departureAirportCode}
              </p>
              <p className="mt-1 text-sm text-muted-foreground truncate">
                {flight.departureCity}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{dep.time}</p>
            </div>

            {/* Arrow connector */}
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="h-px w-8 bg-muted-foreground/25" />
              <Plane className="size-3.5 text-muted-foreground/50" />
              <div className="h-px w-8 bg-muted-foreground/25" />
            </div>

            {/* Arrival */}
            <div className="flex-1 min-w-0 text-right">
              <p className="text-2xl font-semibold tracking-tight leading-none">
                {flight.arrivalAirportCode}
              </p>
              <p className="mt-1 text-sm text-muted-foreground truncate">
                {flight.arrivalCity}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">{arr.time}</p>
            </div>
          </div>

          {/* Bottom row: price on left, action/rating/ticket ID on right */}
          <div className="flex items-center gap-3 border-t border-border/50 pt-3">
            <span className="text-sm tabular-nums text-muted-foreground">
              ${flight.basePrice.toFixed(2)}
            </span>

            <div className="ml-auto flex items-center gap-3">
              {flight.rating !== null && (
                <div className="flex items-center gap-2">
                  <FilledStars rating={flight.rating} />
                  {flight.comment && (
                    <p className="max-w-40 truncate text-xs text-muted-foreground italic">
                      &ldquo;{flight.comment}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {flight.canReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(flight)}
                  className="border-white/10 bg-white/[0.04] text-white hover:bg-white/10"
                >
                  Review Flight
                </Button>
              )}

              <span className="text-xs tabular-nums text-muted-foreground/60">
                {flight.ticketId}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FlightList({
  flights,
  onReview,
  emptyMessage,
  emptyAction,
}: {
  emptyAction?: { href: string; label: string }
  emptyMessage: string
  flights: Array<CustomerFlight>
  onReview: (flight: CustomerFlight) => void
}) {
  if (flights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <PlaneLanding className="size-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        {emptyAction && (
          <Link
            to={emptyAction.href}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted hover:text-foreground"
          >
            {emptyAction.label}
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {flights.map((flight) => (
        <TripCard
          key={`${flight.flightNumber}-${flight.departureDatetime}`}
          flight={flight}
          onReview={onReview}
        />
      ))}
    </div>
  )
}

function TripsPage() {
  const { currentUser, upcomingFlights, pastFlights } = Route.useLoaderData()
  const [reviewFlight, setReviewFlight] = useState<CustomerFlight | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)

  function openReview(flight: CustomerFlight) {
    setReviewFlight(flight)
    setReviewOpen(true)
  }

  const hasNoFlights = upcomingFlights.length === 0 && pastFlights.length === 0

  return (
    <div className="dark min-h-screen bg-black text-white">
      <AppNavbar activeTab="trips" currentUser={currentUser} />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">My Trips</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your upcoming flights and review past journeys.
          </p>
        </div>

        {hasNoFlights ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16 text-center">
            <Plane className="size-12 text-muted-foreground/30" />
            <div>
              <p className="font-medium">You haven&apos;t booked any flights yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ready to plan your next adventure?
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Search Flights
            </Link>
          </div>
        ) : (
          <Tabs defaultValue="all">
            <TabsList variant="line" className="mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="upcoming">
                Upcoming
                {upcomingFlights.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-xs tabular-nums text-white/70">
                    {upcomingFlights.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-8">
                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    <Plane className="size-4" />
                    Upcoming
                  </h2>
                  <FlightList
                    flights={upcomingFlights}
                    onReview={openReview}
                    emptyMessage="No upcoming flights. Ready to plan your next trip?"
                    emptyAction={{ href: "/", label: "Explore Flights" }}
                  />
                </section>

                <section>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    <Clock className="size-4" />
                    Past Journeys
                  </h2>
                  <FlightList
                    flights={pastFlights}
                    onReview={openReview}
                    emptyMessage="No past journeys yet."
                  />
                </section>
              </div>
            </TabsContent>

            <TabsContent value="upcoming">
              <FlightList
                flights={upcomingFlights}
                onReview={openReview}
                emptyMessage="No upcoming flights. Ready to plan your next trip?"
                emptyAction={{ href: "/", label: "Explore Flights" }}
              />
            </TabsContent>

            <TabsContent value="past">
              <FlightList
                flights={pastFlights}
                onReview={openReview}
                emptyMessage="No past journeys yet."
              />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        flight={reviewFlight}
      />
    </div>
  )
}
