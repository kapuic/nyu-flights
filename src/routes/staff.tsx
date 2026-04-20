import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

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
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { formatDate, formatDateTime, titleCaseStatus } from "@/lib/format"
import {
  addAirplaneFn,
  createFlightFn,
  getFlightPassengersFn,
  getStaffDashboardFn,
  getStaffReportFn,
  updateFlightStatusFn,
  type PassengerRecord,
} from "@/lib/queries"

export const Route = createFileRoute("/staff")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "staff") throw redirect({ to: "/customer" })

    return getStaffDashboardFn()
  },
  component: StaffHomePage,
})

function StaffHomePage() {
  const router = useRouter()
  const dashboard = Route.useLoaderData()
  const [flightForm, setFlightForm] = useState({
    airplaneId: dashboard.airplanes[0]?.airplaneId ?? "",
    arrivalAirportCode: dashboard.airports[0]?.code ?? "",
    arrivalDatetime: "",
    basePrice: "",
    departureAirportCode: dashboard.airports[0]?.code ?? "",
    departureDatetime: "",
    flightNumber: "",
  })
  const [airplaneForm, setAirplaneForm] = useState({
    airplaneId: "",
    manufacturingCompany: "",
    manufacturingDate: "",
    numberOfSeats: "",
  })
  const [selectedPassengers, setSelectedPassengers] = useState<PassengerRecord[] | null>(null)
  const [selectedPassengerKey, setSelectedPassengerKey] = useState<string | null>(null)
  const [reportRange, setReportRange] = useState({ endDate: "", startDate: "" })
  const [rangeResult, setRangeResult] = useState<{ endDate: string; startDate: string; ticketsSold: number } | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  async function refresh() {
    await router.invalidate()
  }

  async function handleStatusToggle(airlineName: string, departureDatetime: string, flightNumber: string, status: "on_time" | "delayed") {
    setBusyAction(`status:${flightNumber}:${departureDatetime}`)
    try {
      const nextStatus = status === "on_time" ? "delayed" : "on_time"
      const result = await updateFlightStatusFn({ data: { airlineName, departureDatetime, flightNumber, status: nextStatus } })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.message ?? "Status updated.")
      await refresh()
    } finally {
      setBusyAction(null)
    }
  }

  async function handlePassengers(airlineName: string, departureDatetime: string, flightNumber: string) {
    const key = `${flightNumber}:${departureDatetime}`
    setSelectedPassengerKey(key)
    const passengers = await getFlightPassengersFn({ data: { airlineName, departureDatetime, flightNumber } })
    setSelectedPassengers(passengers)
  }

  async function handleCreateFlight(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyAction("create-flight")
    try {
      const result = await createFlightFn({
        data: {
          airplaneId: flightForm.airplaneId,
          arrivalAirportCode: flightForm.arrivalAirportCode,
          arrivalDatetime: flightForm.arrivalDatetime,
          basePrice: Number(flightForm.basePrice),
          departureAirportCode: flightForm.departureAirportCode,
          departureDatetime: flightForm.departureDatetime,
          flightNumber: flightForm.flightNumber,
        },
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.message ?? "Flight created.")
      setFlightForm((current) => ({ ...current, arrivalDatetime: "", basePrice: "", departureDatetime: "", flightNumber: "" }))
      await refresh()
    } finally {
      setBusyAction(null)
    }
  }

  async function handleAddAirplane(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyAction("add-airplane")
    try {
      const result = await addAirplaneFn({
        data: {
          airplaneId: airplaneForm.airplaneId,
          manufacturingCompany: airplaneForm.manufacturingCompany,
          manufacturingDate: airplaneForm.manufacturingDate,
          numberOfSeats: Number(airplaneForm.numberOfSeats),
        },
      })
      toast.success(result.message)
      setAirplaneForm({ airplaneId: "", manufacturingCompany: "", manufacturingDate: "", numberOfSeats: "" })
      await refresh()
    } finally {
      setBusyAction(null)
    }
  }

  async function handleRangeReport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyAction("report")
    try {
      const result = await getStaffReportFn({ data: reportRange })
      setRangeResult(result)
    } finally {
      setBusyAction(null)
    }
  }

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  return (
    <SiteShell
      active="staff"
      currentUser={{ displayName: dashboard.airlineName, role: "staff" }}
      summary={
        <>
          <SummaryMetric label="Flights next 30 days" value={String(dashboard.flights.length)} />
          <SummaryMetric label="Fleet size" value={String(dashboard.airplanes.length)} />
          <SummaryMetric label="Tickets this year" value={String(dashboard.reportSummary.lastYearTickets)} />
        </>
      }
      title={`Staff home · ${dashboard.airlineName}`}
    >
      <Tabs className="space-y-5" defaultValue="flights">
        <TabsList className="grid w-full grid-cols-2 gap-1 rounded-[18px] bg-slate-100 p-1 md:grid-cols-5">
          <TabsTrigger className="rounded-[14px]" value="flights">Flights</TabsTrigger>
          <TabsTrigger className="rounded-[14px]" value="create-flight">Create flight</TabsTrigger>
          <TabsTrigger className="rounded-[14px]" value="airplanes">Fleet</TabsTrigger>
          <TabsTrigger className="rounded-[14px]" value="ratings">Ratings</TabsTrigger>
          <TabsTrigger className="rounded-[14px]" value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-5" value="flights">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Operational schedule for the next 30 days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flight</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Departure</TableHead>
                    <TableHead>Sold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.flights.map((flight) => {
                    const key = `${flight.flightNumber}:${flight.departureDatetime}`
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium text-slate-950">{flight.flightNumber}</TableCell>
                        <TableCell>{flight.departureAirportCode} → {flight.arrivalAirportCode}</TableCell>
                        <TableCell>{formatDateTime(flight.departureDatetime)}</TableCell>
                        <TableCell>{flight.ticketCount}</TableCell>
                        <TableCell>
                          <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100" variant="secondary">{titleCaseStatus(flight.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button onClick={() => handlePassengers(flight.airlineName, flight.departureDatetime, flight.flightNumber)} size="sm" type="button" variant="outline">
                              {selectedPassengerKey === key ? "Passengers loaded" : "Passengers"}
                            </Button>
                            <Button
                              className="rounded-[12px] bg-slate-950 text-white hover:bg-slate-800"
                              disabled={busyAction === `status:${flight.flightNumber}:${flight.departureDatetime}`}
                              onClick={() => handleStatusToggle(flight.airlineName, flight.departureDatetime, flight.flightNumber, flight.status)}
                              size="sm"
                              type="button"
                            >
                              Toggle status
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              {selectedPassengers ? (
                <div className="rounded-[18px] bg-slate-50 p-4">
                  <div className="mb-3 text-sm font-medium text-slate-700">Passengers on selected flight</div>
                  {selectedPassengers.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ticket</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Passport</TableHead>
                          <TableHead>Purchased</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPassengers.map((passenger) => (
                          <TableRow key={passenger.ticketId}>
                            <TableCell>{passenger.ticketId}</TableCell>
                            <TableCell>{passenger.customerName}</TableCell>
                            <TableCell>{passenger.customerEmail}</TableCell>
                            <TableCell>{passenger.passportNumber}</TableCell>
                            <TableCell>{formatDateTime(passenger.purchaseDatetime)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-slate-500">No tickets sold on this flight yet.</div>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-5" value="create-flight">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Add a new future flight</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateFlight}>
                <Field label="Flight number"><Input onChange={(event) => setFlightForm((current) => ({ ...current, flightNumber: event.target.value }))} value={flightForm.flightNumber} /></Field>
                <div className="space-y-2">
                  <Label>Airplane</Label>
                  <Select onValueChange={(value) => setFlightForm((current) => ({ ...current, airplaneId: value ?? current.airplaneId }))} value={flightForm.airplaneId}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose airplane" /></SelectTrigger>
                    <SelectContent>
                      {dashboard.airplanes.map((airplane) => (
                        <SelectItem key={airplane.airplaneId} value={airplane.airplaneId}>{airplane.airplaneId} · {airplane.numberOfSeats} seats</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <AirportField airports={dashboard.airports} label="Departure airport" onChange={(value) => setFlightForm((current) => ({ ...current, departureAirportCode: value }))} value={flightForm.departureAirportCode} />
                <AirportField airports={dashboard.airports} label="Arrival airport" onChange={(value) => setFlightForm((current) => ({ ...current, arrivalAirportCode: value }))} value={flightForm.arrivalAirportCode} />
                <Field label="Departure date & time"><Input onChange={(event) => setFlightForm((current) => ({ ...current, departureDatetime: event.target.value }))} type="datetime-local" value={flightForm.departureDatetime} /></Field>
                <Field label="Arrival date & time"><Input onChange={(event) => setFlightForm((current) => ({ ...current, arrivalDatetime: event.target.value }))} type="datetime-local" value={flightForm.arrivalDatetime} /></Field>
                <Field label="Base price"><Input onChange={(event) => setFlightForm((current) => ({ ...current, basePrice: event.target.value }))} type="number" value={flightForm.basePrice} /></Field>
                <div className="flex items-end">
                  <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "create-flight"} type="submit">
                    {busyAction === "create-flight" ? "Creating…" : "Create flight"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-5" value="airplanes">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Add to the fleet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <form className="grid gap-4 md:grid-cols-2" onSubmit={handleAddAirplane}>
                <Field label="Airplane ID"><Input onChange={(event) => setAirplaneForm((current) => ({ ...current, airplaneId: event.target.value }))} value={airplaneForm.airplaneId} /></Field>
                <Field label="Seat count"><Input onChange={(event) => setAirplaneForm((current) => ({ ...current, numberOfSeats: event.target.value }))} type="number" value={airplaneForm.numberOfSeats} /></Field>
                <Field label="Manufacturer"><Input onChange={(event) => setAirplaneForm((current) => ({ ...current, manufacturingCompany: event.target.value }))} value={airplaneForm.manufacturingCompany} /></Field>
                <Field label="Manufacturing date"><Input onChange={(event) => setAirplaneForm((current) => ({ ...current, manufacturingDate: event.target.value }))} type="date" value={airplaneForm.manufacturingDate} /></Field>
                <div className="flex items-end">
                  <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "add-airplane"} type="submit">
                    {busyAction === "add-airplane" ? "Saving…" : "Add airplane"}
                  </Button>
                </div>
              </form>
              <Separator />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Built</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.airplanes.map((airplane) => (
                    <TableRow key={airplane.airplaneId}>
                      <TableCell className="font-medium text-slate-950">{airplane.airplaneId}</TableCell>
                      <TableCell>{airplane.numberOfSeats}</TableCell>
                      <TableCell>{airplane.manufacturingCompany}</TableCell>
                      <TableCell>{formatDate(airplane.manufacturingDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-5" value="ratings">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Flight ratings and written feedback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {dashboard.ratings.length ? (
                dashboard.ratings.map((rating) => (
                  <div className="rounded-[20px] border border-slate-200 p-4" key={`${rating.flightNumber}-${rating.departureDatetime}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-medium text-slate-950">{rating.flightNumber}</div>
                        <div className="text-sm text-slate-500">{formatDateTime(rating.departureDatetime)}</div>
                      </div>
                      <div className="text-sm text-slate-600">
                        {rating.averageRating ? `${rating.averageRating.toFixed(1)} / 5` : "No ratings yet"} · {rating.reviewCount} reviews
                      </div>
                    </div>
                    {rating.comments.length ? (
                      <div className="mt-4 grid gap-3">
                        {rating.comments.map((comment, index) => (
                          <div className="rounded-[16px] bg-slate-50 px-4 py-3 text-sm text-slate-600" key={`${rating.flightNumber}-${index}`}>{comment}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">No comments on this flight yet.</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">No rating data yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="space-y-5" value="reports">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>Sales reporting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <SummaryTile label="All tickets sold" value={String(dashboard.reportSummary.totalTickets)} />
                <SummaryTile label="Last month" value={String(dashboard.reportSummary.lastMonthTickets)} />
                <SummaryTile label="Last year" value={String(dashboard.reportSummary.lastYearTickets)} />
              </div>
              <div className="h-[260px] rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="month" stroke="#475569" />
                    <YAxis allowDecimals={false} stroke="#475569" />
                    <Tooltip formatter={(value) => [`${value} tickets`, "Sold"]} />
                    <Bar dataKey="ticketsSold" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <form className="grid gap-4 rounded-[18px] bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={handleRangeReport}>
                <Field label="Start date"><Input onChange={(event) => setReportRange((current) => ({ ...current, startDate: event.target.value }))} type="date" value={reportRange.startDate} /></Field>
                <Field label="End date"><Input onChange={(event) => setReportRange((current) => ({ ...current, endDate: event.target.value }))} type="date" value={reportRange.endDate} /></Field>
                <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "report"} type="submit">
                  {busyAction === "report" ? "Running…" : "Run custom report"}
                </Button>
              </form>
              {rangeResult ? (
                <div className="rounded-[18px] border border-slate-200 px-4 py-4 text-sm text-slate-600">
                  Between <span className="font-medium text-slate-950">{formatDate(rangeResult.startDate)}</span> and <span className="font-medium text-slate-950">{formatDate(rangeResult.endDate)}</span>, your airline sold <span className="font-medium text-slate-950">{rangeResult.ticketsSold}</span> tickets.
                </div>
              ) : null}
              <Separator />
              <Button onClick={handleLogout} type="button" variant="outline">Log out</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SiteShell>
  )
}

function AirportField({
  airports,
  label,
  onChange,
  value,
}: {
  airports: Array<{ city: string; code: string; country: string }>
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select onValueChange={(nextValue) => onChange(nextValue ?? value)} value={value}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Choose airport" /></SelectTrigger>
        <SelectContent>
          {airports.map((airport) => (
            <SelectItem key={airport.code} value={airport.code}>{airport.city} · {airport.code}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/6 p-4">
      <div className="text-sm text-white/70">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">{value}</div>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{value}</div>
    </div>
  )
}
