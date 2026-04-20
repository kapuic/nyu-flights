import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { FlightResults } from "@/components/flight-results"
import { FlightSearchPanel, type FlightSearchValues } from "@/components/flight-search-panel"
import { SiteShell } from "@/components/site-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatCurrency, formatDateTime, titleCaseStatus } from "@/lib/format"
import {
  type FlightOption,
  getCustomerDashboardFn,
  purchaseTicketFn,
  searchFlightsFn,
  submitReviewFn,
} from "@/lib/queries"

export const Route = createFileRoute("/customer")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff" })

    return getCustomerDashboardFn()
  },
  component: CustomerHomePage,
})

function CustomerHomePage() {
  const router = useRouter()
  const dashboard = Route.useLoaderData()
  const [searchResults, setSearchResults] = useState<{ outbound: FlightOption[]; returnOptions: FlightOption[]; tripType: "one-way" | "round-trip" } | null>(null)
  const [searchBusy, setSearchBusy] = useState(false)
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null)
  const [purchaseState, setPurchaseState] = useState({ cardExpiration: "", cardNumber: "", cardType: "credit", nameOnCard: "" })
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { comment: string; rating: string }>>({})
  const [submittingPurchase, setSubmittingPurchase] = useState(false)
  const [reviewingKey, setReviewingKey] = useState<string | null>(null)

  async function handleSearch(values: FlightSearchValues) {
    setSearchBusy(true)
    try {
      const result = await searchFlightsFn({ data: values })
      setSearchResults(result)
      if (!result.outbound.length) toast.message("No future flights matched those filters.")
    } finally {
      setSearchBusy(false)
    }
  }

  async function handlePurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFlight) return

    setSubmittingPurchase(true)
    try {
      const response = await purchaseTicketFn({
        data: {
          airlineName: selectedFlight.airlineName,
          cardExpiration: purchaseState.cardExpiration,
          cardNumber: purchaseState.cardNumber,
          cardType: purchaseState.cardType as "credit" | "debit",
          departureDatetime: selectedFlight.departureDatetime,
          flightNumber: selectedFlight.flightNumber,
          nameOnCard: purchaseState.nameOnCard,
        },
      })

      toast.success(response.message)
      setSelectedFlight(null)
      setPurchaseState({ cardExpiration: "", cardNumber: "", cardType: "credit", nameOnCard: "" })
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed.")
    } finally {
      setSubmittingPurchase(false)
    }
  }

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  async function handleReviewSubmit(flight: (typeof dashboard.pastFlights)[number]) {
    const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
    const draft = reviewDrafts[key]
    if (!draft?.rating) {
      toast.error("Choose a rating first.")
      return
    }

    setReviewingKey(key)
    try {
      const result = await submitReviewFn({
        data: {
          airlineName: flight.airlineName,
          comment: draft.comment,
          departureDatetime: flight.departureDatetime,
          flightNumber: flight.flightNumber,
          rating: Number(draft.rating),
        },
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(result?.message ?? "Review saved.")
      await router.invalidate()
    } finally {
      setReviewingKey(null)
    }
  }

  return (
    <SiteShell
      active="customer"
      currentUser={{ displayName: dashboard.currentUser.displayName, role: "customer" }}
      summary={
        <>
          <SummaryMetric label="Upcoming trips" value={String(dashboard.upcomingFlights.length)} />
          <SummaryMetric label="Past trips" value={String(dashboard.pastFlights.length)} />
          <SummaryMetric label="Review-ready flights" value={String(dashboard.pastFlights.filter((flight) => flight.canReview).length)} />
        </>
      }
      title="Customer home"
    >
      <Tabs className="space-y-5" defaultValue="my-flights">
        <TabsList className="grid w-full grid-cols-3 rounded-[18px] bg-slate-100 p-1">
          <TabsTrigger className="rounded-[14px]" value="my-flights">My flights</TabsTrigger>
          <TabsTrigger className="rounded-[14px]" value="search">Search & book</TabsTrigger>
          <TabsTrigger className="rounded-[14px]" value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="my-flights">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Upcoming flights</CardTitle>
            </CardHeader>
            <CardContent>
              <FlightTable flights={dashboard.upcomingFlights} />
            </CardContent>
          </Card>

          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Past flights and feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.pastFlights.length ? (
                dashboard.pastFlights.map((flight) => {
                  const key = `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`
                  const draft = reviewDrafts[key] ?? { comment: "", rating: "" }

                  return (
                    <div className="rounded-[20px] border border-slate-200 p-4" key={key}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-slate-950">{flight.flightNumber}</div>
                            <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100" variant="secondary">{titleCaseStatus(flight.status)}</Badge>
                          </div>
                          <div className="mt-1 text-sm text-slate-500">{flight.departureAirportName} → {flight.arrivalAirportName}</div>
                          <div className="mt-1 text-sm text-slate-500">{formatDateTime(flight.departureDatetime)} · Purchased {formatDateTime(flight.purchaseDatetime)}</div>
                        </div>
                        {flight.rating ? (
                          <div className="text-sm text-slate-600">You rated this {flight.rating}/5.</div>
                        ) : null}
                      </div>
                      {flight.comment ? <div className="mt-3 rounded-[16px] bg-slate-50 px-4 py-3 text-sm text-slate-600">{flight.comment}</div> : null}
                      {flight.canReview ? (
                        <div className="mt-4 grid gap-4 rounded-[18px] bg-slate-50/80 p-4 md:grid-cols-[120px_1fr_auto] md:items-end">
                          <div className="space-y-2">
                            <Label>Rating</Label>
                            <Select onValueChange={(value) => setReviewDrafts((current) => ({ ...current, [key]: { ...draft, rating: value ?? "" } }))} value={draft.rating}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Stars" />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((value) => (
                                  <SelectItem key={value} value={String(value)}>{value} / 5</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Comment</Label>
                            <Textarea onChange={(event) => setReviewDrafts((current) => ({ ...current, [key]: { ...draft, comment: event.target.value } }))} placeholder="What stood out on this trip?" value={draft.comment} />
                          </div>
                          <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={reviewingKey === key} onClick={() => handleReviewSubmit(flight)} type="button">
                            {reviewingKey === key ? "Saving…" : "Submit review"}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No completed trips yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-5" value="search">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Search the live schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <FlightSearchPanel busy={searchBusy} onSubmit={handleSearch} />
              {searchResults ? (
                <div className="space-y-5">
                  <section className="space-y-3">
                    <div className="text-sm font-medium text-slate-700">Outbound options</div>
                    <FlightResults emptyMessage="No outbound results matched that search." flights={searchResults.outbound} onChoose={setSelectedFlight} />
                  </section>
                  {searchResults.tripType === "round-trip" ? (
                    <section className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">Return options</div>
                      <FlightResults emptyMessage="No return results matched that search." flights={searchResults.returnOptions} onChoose={setSelectedFlight} />
                    </section>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {selectedFlight ? (
            <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
              <CardHeader>
                <CardTitle>Purchase {selectedFlight.flightNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handlePurchase}>
                  <div className="rounded-[18px] bg-slate-50 p-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-950">{selectedFlight.departureAirportName} → {selectedFlight.arrivalAirportName}</div>
                    <div className="mt-1">{formatDateTime(selectedFlight.departureDatetime)} · {formatCurrency(selectedFlight.basePrice)}</div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="cardType">Card type</Label>
                      <Select onValueChange={(value) => setPurchaseState((current) => ({ ...current, cardType: value ?? "credit" }))} value={purchaseState.cardType}>
                        <SelectTrigger className="w-full" id="cardType"><SelectValue placeholder="Choose card type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit">Credit</SelectItem>
                          <SelectItem value="debit">Debit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="Name on card"><Input onChange={(event) => setPurchaseState((current) => ({ ...current, nameOnCard: event.target.value }))} value={purchaseState.nameOnCard} /></Field>
                    <Field label="Card number"><Input onChange={(event) => setPurchaseState((current) => ({ ...current, cardNumber: event.target.value }))} value={purchaseState.cardNumber} /></Field>
                    <Field label="Expiration"><Input onChange={(event) => setPurchaseState((current) => ({ ...current, cardExpiration: event.target.value }))} type="date" value={purchaseState.cardExpiration} /></Field>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={submittingPurchase} type="submit">
                      {submittingPurchase ? "Booking…" : "Confirm purchase"}
                    </Button>
                    <Button onClick={() => setSelectedFlight(null)} type="button" variant="outline">Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent className="space-y-5" value="account">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Session and identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div>
                <div className="font-medium text-slate-950">{dashboard.currentUser.displayName}</div>
                <div>{dashboard.currentUser.email}</div>
              </div>
              <Separator />
              <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" onClick={handleLogout} type="button">Log out</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SiteShell>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function FlightTable({ flights }: { flights: Array<(typeof Route.useLoaderData extends never ? never : any)> }) {
  if (!flights.length) {
    return <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No flights in this section yet.</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Flight</TableHead>
          <TableHead>Route</TableHead>
          <TableHead>Departure</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {flights.map((flight: any) => (
          <TableRow key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`}>
            <TableCell className="font-medium text-slate-950">{flight.flightNumber}</TableCell>
            <TableCell>{flight.departureAirportCode} → {flight.arrivalAirportCode}</TableCell>
            <TableCell>{formatDateTime(flight.departureDatetime)}</TableCell>
            <TableCell>{titleCaseStatus(flight.status)}</TableCell>
            <TableCell className="text-right">{formatCurrency(flight.basePrice)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/6 p-4">
      <div className="text-sm text-white/70">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">{value}</div>
    </div>
  )
}
