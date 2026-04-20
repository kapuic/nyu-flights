import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import {
  ArrowRight,
  CalendarDays,
  Plane,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
  BarChart3,
  Filter,
} from "lucide-react"
import { useState } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"

import { StaffShell } from "@/components/staff-shell"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export const Route = createFileRoute("/staff/app")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/staff/login" })
    if (currentUser.role !== "staff") throw redirect({ to: "/customer" })

    return getStaffDashboardFn({
      data: { destination: "", endDate: "", source: "", startDate: "" },
    })
  },
  component: StaffHomePage,
})

function StaffHomePage() {
  const router = useRouter()
  const dashboard = Route.useLoaderData()
  const [dashboardData, setDashboardData] = useState(dashboard)
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedPassengers, setSelectedPassengers] = useState<PassengerRecord[] | null>(null)
  const [selectedPassengerKey, setSelectedPassengerKey] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  async function refresh(filters?: { destination: string; endDate: string; source: string; startDate: string }) {
    setDashboardData(await getStaffDashboardFn({
      data: filters ?? { destination: "", endDate: "", source: "", startDate: "" },
    }))
  }

  async function handleStatusToggle(airlineName: string, departureDatetime: string, flightNumber: string, status: "on_time" | "delayed") {
    setBusyAction(`status:${flightNumber}:${departureDatetime}`)
    try {
      const nextStatus = status === "on_time" ? "delayed" : "on_time"
      const result = await updateFlightStatusFn({ data: { airlineName, departureDatetime, flightNumber, status: nextStatus } })
      if (result?.error) { toast.error(result.error); return }
      toast.success(result?.message ?? "Status updated.")
      await refresh()
    } finally { setBusyAction(null) }
  }

  async function handlePassengers(airlineName: string, departureDatetime: string, flightNumber: string) {
    const key = `${flightNumber}:${departureDatetime}`
    setSelectedPassengerKey(key)
    setSelectedPassengers(await getFlightPassengersFn({ data: { airlineName, departureDatetime, flightNumber } }))
  }

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  return (
    <StaffShell airlineName={dashboardData.airlineName} currentSection={activeSection} onLogout={handleLogout} onSectionChange={setActiveSection}>
      <div className="p-6 lg:p-8">
        {activeSection === "dashboard" ? (
          <DashboardSection
            airplanes={dashboardData.airplanes}
            busyAction={busyAction}
            flights={dashboardData.flights}
            handlePassengers={handlePassengers}
            handleStatusToggle={handleStatusToggle}
            onRefresh={refresh}
            selectedPassengerKey={selectedPassengerKey}
            selectedPassengers={selectedPassengers}
            reportSummary={dashboardData.reportSummary}
          />
        ) : null}
        {activeSection === "create-flight" ? (
          <CreateFlightSection
            airplanes={dashboardData.airplanes}
            airports={dashboardData.airports}
            busyAction={busyAction}
            onCreated={() => { refresh(); setActiveSection("dashboard") }}
            setBusyAction={setBusyAction}
          />
        ) : null}
        {activeSection === "fleet" ? (
          <FleetSection
            airplanes={dashboardData.airplanes}
            busyAction={busyAction}
            onRefresh={refresh}
            setBusyAction={setBusyAction}
          />
        ) : null}
        {activeSection === "ratings" ? (
          <RatingsSection ratings={dashboardData.ratings} />
        ) : null}
        {activeSection === "reports" ? (
          <ReportsSection
            busyAction={busyAction}
            monthlySales={dashboardData.monthlySales}
            reportSummary={dashboardData.reportSummary}
            setBusyAction={setBusyAction}
          />
        ) : null}
      </div>
    </StaffShell>
  )
}

/* ─── Dashboard ─── */

function DashboardSection({
  airplanes,
  busyAction,
  flights,
  handlePassengers,
  handleStatusToggle,
  onRefresh,
  selectedPassengerKey,
  selectedPassengers,
  reportSummary,
}: {
  airplanes: Array<{ airplaneId: string; numberOfSeats: number }>
  busyAction: string | null
  flights: Array<{
    airlineName: string; arrivalAirportCode: string; availableSeats: number
    departureAirportCode: string; departureDatetime: string; flightNumber: string
    status: "on_time" | "delayed"; ticketCount: number
  }>
  handlePassengers: (airlineName: string, departureDatetime: string, flightNumber: string) => void
  handleStatusToggle: (airlineName: string, departureDatetime: string, flightNumber: string, status: "on_time" | "delayed") => void
  onRefresh: (filters?: { destination: string; endDate: string; source: string; startDate: string }) => Promise<void>
  selectedPassengerKey: string | null
  selectedPassengers: PassengerRecord[] | null
  reportSummary: { lastMonthTickets: number; lastYearTickets: number; totalTickets: number }
}) {
  const filterForm = useForm({
    defaultValues: { destination: "", endDate: "", source: "", startDate: "" },
    onSubmit: async ({ value }) => onRefresh(value),
  })

  const onTimePct = flights.length ? Math.round((flights.filter((f) => f.status === "on_time").length / flights.length) * 100) : 0

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={TrendingUp} label="On-Time Rate" value={`${onTimePct}%`} />
        <KpiCard icon={Plane} label="Fleet Size" value={String(airplanes.length)} />
        <KpiCard icon={Users} label="Tickets (YTD)" value={String(reportSummary.lastYearTickets)} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Scheduled Flights</h2>
          <p className="text-sm text-slate-500">Next 30 days operations overview</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input className="h-9 w-64 rounded-lg bg-slate-100 pl-9 text-sm" placeholder="Flight number, dest..." />
        </div>
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_180px_180px_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); filterForm.handleSubmit() }}>
            <FilterField label="From">
              <filterForm.Field name="source">{(field) => <Input className="h-9 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="City or airport" value={field.state.value} />}</filterForm.Field>
            </FilterField>
            <FilterField label="To">
              <filterForm.Field name="destination">{(field) => <Input className="h-9 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="City or airport" value={field.state.value} />}</filterForm.Field>
            </FilterField>
            <FilterField label="Start date">
              <filterForm.Field name="startDate">{(field) => <Input className="h-9 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} />}</filterForm.Field>
            </FilterField>
            <FilterField label="End date">
              <filterForm.Field name="endDate">{(field) => <Input className="h-9 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} />}</filterForm.Field>
            </FilterField>
            <Button className="h-9 rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "flight-filter"} type="submit">
              <Filter className="mr-2 size-4" />{busyAction === "flight-filter" ? "Filtering…" : "Filter"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Flight</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Route</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Departs</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Pax</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-slate-500" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flights.map((flight) => {
                const key = `${flight.flightNumber}:${flight.departureDatetime}`
                return (
                  <TableRow className="cursor-pointer hover:bg-slate-50" key={key}>
                    <TableCell className="font-semibold text-slate-950">{flight.flightNumber}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm">
                        <span className="font-semibold">{flight.departureAirportCode}</span>
                        <ArrowRight className="size-3 text-slate-400" />
                        <span className="font-semibold">{flight.arrivalAirportCode}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{formatDateTime(flight.departureDatetime)}</TableCell>
                    <TableCell>
                      <Badge className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${flight.status === "on_time" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-red-50 text-red-700 hover:bg-red-50"}`} variant="secondary">
                        {titleCaseStatus(flight.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-slate-700">
                      {flight.ticketCount}/{flight.ticketCount + flight.availableSeats}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button className="h-8 rounded-lg text-xs" onClick={() => handlePassengers(flight.airlineName, flight.departureDatetime, flight.flightNumber)} size="sm" type="button" variant="outline">
                          {selectedPassengerKey === key ? "Loaded" : "Pax"}
                        </Button>
                        <Button
                          className="h-8 rounded-lg bg-slate-950 text-xs text-white hover:bg-slate-800"
                          disabled={busyAction === `status:${flight.flightNumber}:${flight.departureDatetime}`}
                          onClick={() => handleStatusToggle(flight.airlineName, flight.departureDatetime, flight.flightNumber, flight.status)}
                          size="sm" type="button"
                        >Toggle</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedPassengers ? (
        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader><CardTitle className="text-lg">Passenger Manifest</CardTitle></CardHeader>
          <CardContent>
            {selectedPassengers.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passport</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchased</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPassengers.map((p) => (
                      <TableRow key={p.ticketId}>
                        <TableCell className="font-mono text-sm text-slate-500">TKT-{p.ticketId}</TableCell>
                        <TableCell className="font-medium text-slate-950">{p.customerName}</TableCell>
                        <TableCell className="text-sm text-slate-500">{p.customerEmail}</TableCell>
                        <TableCell className="text-sm text-slate-500">{p.passportNumber}</TableCell>
                        <TableCell className="text-sm text-slate-500">{formatDateTime(p.purchaseDatetime)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : <p className="text-sm text-slate-500">No tickets sold on this flight yet.</p>}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

/* ─── Create Flight ─── */

function CreateFlightSection({
  airplanes,
  airports,
  busyAction,
  onCreated,
  setBusyAction,
}: {
  airplanes: Array<{ airplaneId: string; numberOfSeats: number }>
  airports: Array<{ city: string; code: string; country: string }>
  busyAction: string | null
  onCreated: () => void
  setBusyAction: (action: string | null) => void
}) {
  const form = useForm({
    defaultValues: {
      airplaneId: airplanes[0]?.airplaneId ?? "",
      arrivalAirportCode: airports[0]?.code ?? "",
      arrivalDatetime: "",
      basePrice: "",
      departureAirportCode: airports[0]?.code ?? "",
      departureDatetime: "",
      flightNumber: "",
    },
    onSubmit: async ({ value }) => {
      setBusyAction("create-flight")
      try {
        const result = await createFlightFn({
          data: {
            airplaneId: value.airplaneId,
            arrivalAirportCode: value.arrivalAirportCode,
            arrivalDatetime: value.arrivalDatetime,
            basePrice: Number(value.basePrice),
            departureAirportCode: value.departureAirportCode,
            departureDatetime: value.departureDatetime,
            flightNumber: value.flightNumber,
          },
        })
        if (result?.error) { toast.error(result.error); return }
        toast.success(result?.message ?? "Flight created.")
        form.reset()
        onCreated()
      } finally { setBusyAction(null) }
    },
  })

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Create Flight Schedule</h2>
        <p className="text-sm text-slate-500">Schedule a new flight for your airline</p>
      </div>

      <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>
        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Plane className="size-5 text-slate-400" /> Flight Identification</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <form.Field name="flightNumber">{(field) => (
              <FilterField label="Flight Number">
                <Input className="h-10 rounded-lg bg-slate-50 font-mono font-bold uppercase" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="AP-1234" value={field.state.value} />
              </FilterField>
            )}</form.Field>
            <form.Field name="airplaneId">{(field) => (
              <FilterField label="Assigned Aircraft">
                <Select onValueChange={(v) => field.handleChange(v ?? field.state.value)} value={field.state.value}>
                  <SelectTrigger className="h-10 rounded-lg bg-slate-50"><SelectValue placeholder="Select aircraft" /></SelectTrigger>
                  <SelectContent>{airplanes.map((a) => <SelectItem key={a.airplaneId} value={a.airplaneId}>{a.airplaneId} · {a.numberOfSeats} seats</SelectItem>)}</SelectContent>
                </Select>
              </FilterField>
            )}</form.Field>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="size-5 text-slate-400" /> Routing & Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <form.Field name="departureAirportCode">{(field) => (
              <FilterField label="Departure Airport">
                <Select onValueChange={(v) => field.handleChange(v ?? field.state.value)} value={field.state.value}>
                  <SelectTrigger className="h-10 rounded-lg bg-slate-50"><SelectValue placeholder="Choose airport" /></SelectTrigger>
                  <SelectContent>{airports.map((a) => <SelectItem key={a.code} value={a.code}>{a.city} · {a.code}</SelectItem>)}</SelectContent>
                </Select>
              </FilterField>
            )}</form.Field>
            <form.Field name="arrivalAirportCode">{(field) => (
              <FilterField label="Arrival Airport">
                <Select onValueChange={(v) => field.handleChange(v ?? field.state.value)} value={field.state.value}>
                  <SelectTrigger className="h-10 rounded-lg bg-slate-50"><SelectValue placeholder="Choose airport" /></SelectTrigger>
                  <SelectContent>{airports.map((a) => <SelectItem key={a.code} value={a.code}>{a.city} · {a.code}</SelectItem>)}</SelectContent>
                </Select>
              </FilterField>
            )}</form.Field>
            <form.Field name="departureDatetime">{(field) => (
              <FilterField label="Departure Date & Time">
                <Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="datetime-local" value={field.state.value} />
              </FilterField>
            )}</form.Field>
            <form.Field name="arrivalDatetime">{(field) => (
              <FilterField label="Arrival Date & Time">
                <Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="datetime-local" value={field.state.value} />
              </FilterField>
            )}</form.Field>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader><CardTitle className="text-lg">Commercials</CardTitle></CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <form.Field name="basePrice">{(field) => (
                <FilterField label="Base Ticket Price (Economy)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">$</span>
                    <Input className="h-10 rounded-lg bg-slate-50 pl-7 font-mono font-bold" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="450.00" type="number" value={field.state.value} />
                  </div>
                </FilterField>
              )}</form.Field>
            </div>
          </CardContent>
        </Card>

        <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "create-flight"} type="submit">
          <Plus className="mr-2 size-4" />{busyAction === "create-flight" ? "Creating…" : "Schedule Flight"}
        </Button>
      </form>
    </div>
  )
}

/* ─── Fleet ─── */

function FleetSection({
  airplanes,
  busyAction,
  onRefresh,
  setBusyAction,
}: {
  airplanes: Array<{ airplaneId: string; manufacturingCompany: string; manufacturingDate: string; numberOfSeats: number }>
  busyAction: string | null
  onRefresh: () => Promise<void>
  setBusyAction: (action: string | null) => void
}) {
  const form = useForm({
    defaultValues: { airplaneId: "", manufacturingCompany: "", manufacturingDate: "", numberOfSeats: "" },
    onSubmit: async ({ value }) => {
      setBusyAction("add-airplane")
      try {
        const result = await addAirplaneFn({
          data: { airplaneId: value.airplaneId, manufacturingCompany: value.manufacturingCompany, manufacturingDate: value.manufacturingDate, numberOfSeats: Number(value.numberOfSeats) },
        })
        toast.success(result.message)
        form.reset()
        await onRefresh()
      } finally { setBusyAction(null) }
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Fleet Management</h2>
        <p className="text-sm text-slate-500">Manage your airline's aircraft fleet</p>
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardHeader><CardTitle className="text-lg">Register Aircraft</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>
            <form.Field name="airplaneId">{(field) => <FilterField label="Tail Number"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="N123AP" value={field.state.value} /></FilterField>}</form.Field>
            <form.Field name="numberOfSeats">{(field) => <FilterField label="Seat Count"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="290" type="number" value={field.state.value} /></FilterField>}</form.Field>
            <form.Field name="manufacturingCompany">{(field) => <FilterField label="Manufacturer"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Boeing" value={field.state.value} /></FilterField>}</form.Field>
            <form.Field name="manufacturingDate">{(field) => <FilterField label="Manufacturing Date"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} /></FilterField>}</form.Field>
            <div className="md:col-span-2">
              <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "add-airplane"} type="submit">
                <Plus className="mr-2 size-4" />{busyAction === "add-airplane" ? "Saving…" : "Add to Fleet"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardHeader><CardTitle className="text-lg">Current Fleet</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">ID</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Seats</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manufacturer</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Built</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {airplanes.map((a) => (
                <TableRow key={a.airplaneId}>
                  <TableCell className="font-medium text-slate-950">{a.airplaneId}</TableCell>
                  <TableCell>{a.numberOfSeats}</TableCell>
                  <TableCell>{a.manufacturingCompany}</TableCell>
                  <TableCell>{formatDate(a.manufacturingDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Ratings ─── */

function RatingsSection({
  ratings,
}: {
  ratings: Array<{ averageRating: number | null; comments: string[]; departureDatetime: string; flightNumber: string; reviewCount: number }>
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Flight Ratings</h2>
        <p className="text-sm text-slate-500">Average ratings and written feedback for all flights</p>
      </div>
      <div className="space-y-4">
        {ratings.length ? ratings.map((r) => (
          <Card className="rounded-xl border border-slate-200 bg-white shadow-none" key={`${r.flightNumber}-${r.departureDatetime}`}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-950">{r.flightNumber}</div>
                  <div className="text-sm text-slate-500">{formatDateTime(r.departureDatetime)}</div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Star className="size-4 text-amber-500" />
                  {r.averageRating ? `${r.averageRating.toFixed(1)} / 5` : "No ratings yet"} · {r.reviewCount} reviews
                </div>
              </div>
              {r.comments.length ? (
                <div className="mt-4 grid gap-3">
                  {r.comments.map((comment, i) => (
                    <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600" key={`${r.flightNumber}-${i}`}>{comment}</div>
                  ))}
                </div>
              ) : <div className="mt-4 text-sm text-slate-500">No comments on this flight yet.</div>}
            </CardContent>
          </Card>
        )) : (
          <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No rating data yet.</div>
        )}
      </div>
    </div>
  )
}

/* ─── Reports ─── */

function ReportsSection({
  busyAction,
  monthlySales,
  reportSummary,
  setBusyAction,
}: {
  busyAction: string | null
  monthlySales: Array<{ month: string; ticketsSold: number }>
  reportSummary: { lastMonthTickets: number; lastYearTickets: number; totalTickets: number }
  setBusyAction: (action: string | null) => void
}) {
  const [rangeResult, setRangeResult] = useState<{ endDate: string; startDate: string; ticketsSold: number } | null>(null)

  const reportForm = useForm({
    defaultValues: { endDate: "", startDate: "" },
    onSubmit: async ({ value }) => {
      setBusyAction("report")
      try {
        const result = await getStaffReportFn({ data: value })
        if ("error" in result && result.error) { toast.error(result.error); setRangeResult(null); return }
        setRangeResult(result)
      } finally { setBusyAction(null) }
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">Sales Reports</h2>
        <p className="text-sm text-slate-500">Ticket sales analytics and custom date range reports</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={BarChart3} label="All Tickets Sold" value={String(reportSummary.totalTickets)} />
        <KpiCard icon={TrendingUp} label="Last Month" value={String(reportSummary.lastMonthTickets)} />
        <KpiCard icon={Users} label="Last Year" value={String(reportSummary.lastYearTickets)} />
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardHeader><CardTitle className="text-lg">Monthly Ticket Sales</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis allowDecimals={false} stroke="#64748b" />
                <Tooltip formatter={(value) => [`${value} tickets`, "Sold"]} />
                <Bar dataKey="ticketsSold" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardHeader><CardTitle className="text-lg">Custom Range Report</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); reportForm.handleSubmit() }}>
            <reportForm.Field name="startDate">{(field) => <FilterField label="Start Date"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} /></FilterField>}</reportForm.Field>
            <reportForm.Field name="endDate">{(field) => <FilterField label="End Date"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} /></FilterField>}</reportForm.Field>
            <Button className="h-10 rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "report"} type="submit">
              {busyAction === "report" ? "Running…" : "Run Report"}
            </Button>
          </form>
          {rangeResult ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Between <span className="font-medium text-slate-950">{formatDate(rangeResult.startDate)}</span> and <span className="font-medium text-slate-950">{formatDate(rangeResult.endDate)}</span>, your airline sold <span className="font-medium text-slate-950">{rangeResult.ticketsSold}</span> tickets.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

/* ─── Shared ─── */

function FilterField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</Label>
      {children}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100">
            <Icon className="size-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
