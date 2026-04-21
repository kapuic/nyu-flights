import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Filter,
  Mail,
  Plane,
  Plus,
  Printer,
  Search,
  Star,
  TrendingUp,
  Users,
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

function formatDateLabel(value: string) {
  if (!value) return "Select date"
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

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
  const dashboardData = Route.useLoaderData()
  const [activeSection, setActiveSection] = useState("dashboard")
  const [selectedManifestFlight, setSelectedManifestFlight] = useState<{
    airlineName: string
    arrivalAirportCode: string
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
    totalSeats: number
  } | null>(null)
  const [selectedStatusFlight, setSelectedStatusFlight] = useState<{
    airlineName: string
    arrivalAirportCode: string
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
    totalSeats: number
  } | null>(null)
  const [selectedPassengers, setSelectedPassengers] = useState<PassengerRecord[] | null>(null)
  const [selectedPassengerKey, setSelectedPassengerKey] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  async function refresh(_filters?: { destination: string; endDate: string; source: string; startDate: string }) {
    await router.invalidate()
  }

  async function handlePassengers(flight: {
    airlineName: string
    arrivalAirportCode: string
    availableSeats: number
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
  }) {
    const key = `${flight.flightNumber}:${flight.departureDatetime}`
    setSelectedPassengerKey(key)
    setSelectedManifestFlight({
      airlineName: flight.airlineName,
      arrivalAirportCode: flight.arrivalAirportCode,
      departureAirportCode: flight.departureAirportCode,
      departureDatetime: flight.departureDatetime,
      flightNumber: flight.flightNumber,
      status: flight.status,
      ticketCount: flight.ticketCount,
      totalSeats: flight.ticketCount + flight.availableSeats,
    })
    setSelectedPassengers(await getFlightPassengersFn({ data: { airlineName: flight.airlineName, departureDatetime: flight.departureDatetime, flightNumber: flight.flightNumber } }))
    setActiveSection("manifest")
  }

  function handleStatusWorkflow(flight: {
    airlineName: string
    arrivalAirportCode: string
    availableSeats: number
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
  }) {
    setSelectedStatusFlight({
      airlineName: flight.airlineName,
      arrivalAirportCode: flight.arrivalAirportCode,
      departureAirportCode: flight.departureAirportCode,
      departureDatetime: flight.departureDatetime,
      flightNumber: flight.flightNumber,
      status: flight.status,
      ticketCount: flight.ticketCount,
      totalSeats: flight.ticketCount + flight.availableSeats,
    })
    setActiveSection("status-workflow")
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
            handleStatusWorkflow={handleStatusWorkflow}
            onRefresh={refresh}
            selectedPassengerKey={selectedPassengerKey}
            reportSummary={dashboardData.reportSummary}
          />
        ) : null}
        {activeSection === "manifest" ? (
          <ManifestSection
            flight={selectedManifestFlight}
            onBack={() => setActiveSection("dashboard")}
            passengers={selectedPassengers}
          />
        ) : null}
        {activeSection === "status-workflow" ? (
          <StatusWorkflowSection
            busyAction={busyAction}
            flight={selectedStatusFlight}
            onBack={() => setActiveSection("dashboard")}
            onRefresh={refresh}
            setBusyAction={setBusyAction}
          />
        ) : null}
        {activeSection === "create-flight" ? (
          <CreateFlightSection
            airplanes={dashboardData.airplanes}
            airports={dashboardData.airports}
            busyAction={busyAction}
            onCreated={() => { void refresh(); setActiveSection("dashboard") }}
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
  handleStatusWorkflow,
  onRefresh,
  selectedPassengerKey,
  reportSummary,
}: {
  airplanes: Array<{ airplaneId: string; numberOfSeats: number }>
  busyAction: string | null
  flights: Array<{
    airlineName: string; arrivalAirportCode: string; availableSeats: number
    departureAirportCode: string; departureDatetime: string; flightNumber: string
    status: "on_time" | "delayed"; ticketCount: number
  }>
  handlePassengers: (flight: {
    airlineName: string
    arrivalAirportCode: string
    availableSeats: number
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
  }) => void
  handleStatusWorkflow: (flight: {
    airlineName: string
    arrivalAirportCode: string
    availableSeats: number
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
  }) => void
  onRefresh: (filters?: { destination: string; endDate: string; source: string; startDate: string }) => Promise<void>
  selectedPassengerKey: string | null
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
          <Input aria-label="Search flights" className="h-9 w-64 rounded-lg bg-slate-100 pl-9 text-sm" placeholder="Flight number, dest..." />
        </div>
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardContent className="p-4">
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_180px_180px_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); filterForm.handleSubmit() }}>
            <FilterField htmlFor="staff-filter-from" label="From">
              <filterForm.Field name="source">{(field) => <Input aria-label="From" className="h-9 rounded-lg bg-slate-50" id="staff-filter-from" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="City or airport" value={field.state.value} />}</filterForm.Field>
            </FilterField>
            <FilterField htmlFor="staff-filter-to" label="To">
              <filterForm.Field name="destination">{(field) => <Input aria-label="To" className="h-9 rounded-lg bg-slate-50" id="staff-filter-to" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="City or airport" value={field.state.value} />}</filterForm.Field>
            </FilterField>
            <FilterField htmlFor="staff-filter-start-date" label="Start date">
              <filterForm.Field name="startDate">{(field) => (
                <div className="relative">
                  <span className={field.state.value ? "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-950" : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"}>
                    {formatDateLabel(field.state.value)}
                  </span>
                  <Input aria-label="Start Date" className="h-9 rounded-lg bg-slate-50 text-transparent caret-transparent" id="staff-filter-start-date" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} />
                </div>
              )}</filterForm.Field>
            </FilterField>
            <FilterField htmlFor="staff-filter-end-date" label="End date">
              <filterForm.Field name="endDate">{(field) => (
                <div className="relative">
                  <span className={field.state.value ? "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-950" : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"}>
                    {formatDateLabel(field.state.value)}
                  </span>
                  <Input aria-label="End Date" className="h-9 rounded-lg bg-slate-50 text-transparent caret-transparent" id="staff-filter-end-date" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} />
                </div>
              )}</filterForm.Field>
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
                  <TableRow className="hover:bg-slate-50" key={key}>
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
                        <Button className="h-8 rounded-lg text-xs" onClick={() => handlePassengers(flight)} size="sm" type="button" variant="outline">
                          {selectedPassengerKey === key ? "Loaded" : "Pax"}
                        </Button>
                        <Button
                          className="h-8 rounded-lg bg-slate-950 text-xs text-white hover:bg-slate-800"
                          disabled={busyAction === `status:${flight.flightNumber}:${flight.departureDatetime}`}
                          onClick={() => handleStatusWorkflow(flight)}
                          size="sm"
                          type="button"
                        >Status</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function ManifestSection({
  flight,
  onBack,
  passengers,
}: {
  flight: {
    airlineName: string
    arrivalAirportCode: string
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
    totalSeats: number
  } | null
  onBack: () => void
  passengers: PassengerRecord[] | null
}) {
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const filteredPassengers = passengers?.filter((passenger) => {
    if (!normalizedQuery) return true
    return (
      passenger.customerName.toLowerCase().includes(normalizedQuery)
      || passenger.customerEmail.toLowerCase().includes(normalizedQuery)
      || String(passenger.ticketId).includes(normalizedQuery)
      || passenger.passportNumber.toLowerCase().includes(normalizedQuery)
    )
  }) ?? []

  if (!flight) {
    return (
      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardContent className="p-8 text-sm text-slate-500">Choose a flight from the dashboard to open its passenger manifest.</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button className="mb-4 px-0 text-sm text-slate-500 hover:text-slate-950" onClick={onBack} type="button" variant="ghost">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Button>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passenger Manifest</div>
          <h2 className="mt-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-slate-950">
            <span>{flight.departureAirportCode}</span>
            <ArrowRight className="size-5 text-slate-400" />
            <span>{flight.arrivalAirportCode}</span>
          </h2>
          <p className="mt-2 text-sm text-slate-500">{flight.flightNumber} · {formatDateTime(flight.departureDatetime)} · {titleCaseStatus(flight.status)}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled type="button" variant="outline">
            <Printer className="size-4" /> Print manifest
          </Button>
          <Button disabled type="button" variant="outline">
            <Mail className="size-4" /> Message all
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Users} label="Passengers" value={String(flight.ticketCount)} />
        <KpiCard icon={Plane} label="Capacity" value={String(flight.totalSeats)} />
        <KpiCard icon={TrendingUp} label="Load factor" value={`${flight.totalSeats ? Math.round((flight.ticketCount / flight.totalSeats) * 100) : 0}%`} />
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-950">Passenger list</div>
              <p className="text-sm text-slate-500">Search by traveler name, ticket number, email, or passport number.</p>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input aria-label="Search passengers" className="h-9 bg-slate-50 pl-9" onChange={(e) => setQuery(e.target.value)} placeholder="Search manifest" value={query} />
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passenger</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ticket</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Email</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passport</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Purchased</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPassengers.length ? filteredPassengers.map((passenger) => {
                  const initials = passenger.customerName
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()

                  return (
                    <TableRow key={passenger.ticketId}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{initials}</div>
                          <div className="font-medium text-slate-950">{passenger.customerName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-slate-500">TKT-{passenger.ticketId}</TableCell>
                      <TableCell className="text-sm text-slate-500">{passenger.customerEmail}</TableCell>
                      <TableCell className="text-sm text-slate-500">{passenger.passportNumber}</TableCell>
                      <TableCell className="text-sm text-slate-500">{formatDateTime(passenger.purchaseDatetime)}</TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell className="py-8 text-center text-sm text-slate-500" colSpan={5}>
                      {passengers?.length ? "No passengers matched that search." : "No tickets sold on this flight yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
            Bulk print and passenger messaging remain disabled until the product has real export and communications flows behind them.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusWorkflowSection({
  busyAction,
  flight,
  onBack,
  onRefresh,
  setBusyAction,
}: {
  busyAction: string | null
  flight: {
    airlineName: string
    arrivalAirportCode: string
    departureAirportCode: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
    ticketCount: number
    totalSeats: number
  } | null
  onBack: () => void
  onRefresh: (filters?: { destination: string; endDate: string; source: string; startDate: string }) => Promise<void>
  setBusyAction: (action: string | null) => void
}) {
  if (!flight) {
    return (
      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardContent className="p-8 text-sm text-slate-500">Choose a flight from the dashboard to open the status workflow.</CardContent>
      </Card>
    )
  }

  const activeFlight = flight

  async function handleSubmitStatus(nextStatus: "on_time" | "delayed") {
    setBusyAction(`status:${activeFlight.flightNumber}:${activeFlight.departureDatetime}`)
    try {
      const result = await updateFlightStatusFn({ data: { airlineName: activeFlight.airlineName, departureDatetime: activeFlight.departureDatetime, flightNumber: activeFlight.flightNumber, status: nextStatus } })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(result?.message ?? "Status updated.")
      await onRefresh()
      onBack()
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="space-y-6">
        <Button className="px-0 text-sm text-slate-500 hover:text-slate-950" onClick={onBack} type="button" variant="ghost">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Button>
        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Flight Management</div>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Status Workflow</h2>
              </div>
              <Badge className={activeFlight.status === "on_time" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-red-50 text-red-700 hover:bg-red-50"} variant="secondary">
                {titleCaseStatus(activeFlight.status)}
              </Badge>
            </div>
            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-5">
              <StatusSummaryRow label="Flight" value={activeFlight.flightNumber} />
              <StatusSummaryRow label="Route" value={`${activeFlight.departureAirportCode} → ${activeFlight.arrivalAirportCode}`} />
              <StatusSummaryRow label="Departure" value={formatDateTime(activeFlight.departureDatetime)} />
              <StatusSummaryRow label="Passengers" value={`${activeFlight.ticketCount}/${activeFlight.totalSeats}`} />
            </div>
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
              This workflow uses the real staff status mutation. It does not yet broadcast to external systems, signage, or traveler notifications.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
        <CardContent className="space-y-6 p-6">
          <div>
            <h3 className="text-2xl font-bold tracking-tight text-slate-950">Update Flight Status</h3>
            <p className="mt-2 text-sm text-slate-500">Choose the operational status that best reflects the current flight state.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              className={`rounded-lg border p-5 text-left transition-colors ${activeFlight.status === "on_time" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300"}`}
              disabled={busyAction === `status:${activeFlight.flightNumber}:${activeFlight.departureDatetime}` || activeFlight.status === "on_time"}
              onClick={() => handleSubmitStatus("on_time")}
              type="button"
            >
              <div className="text-sm font-semibold uppercase tracking-wider">On time</div>
              <p className={`mt-2 text-sm ${activeFlight.status === "on_time" ? "text-white/70" : "text-slate-500"}`}>Normal operation, no active departure delay.</p>
            </button>
            <button
              className={`rounded-lg border p-5 text-left transition-colors ${activeFlight.status === "delayed" ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-slate-50 text-slate-950 hover:border-slate-300"}`}
              disabled={busyAction === `status:${activeFlight.flightNumber}:${activeFlight.departureDatetime}` || activeFlight.status === "delayed"}
              onClick={() => handleSubmitStatus("delayed")}
              type="button"
            >
              <div className="text-sm font-semibold uppercase tracking-wider">Delayed</div>
              <p className={`mt-2 text-sm ${activeFlight.status === "delayed" ? "text-white/70" : "text-slate-500"}`}>Departure is running late and should be reflected in staff operations.</p>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === `status:${activeFlight.flightNumber}:${activeFlight.departureDatetime}`} onClick={() => handleSubmitStatus(activeFlight.status === "on_time" ? "delayed" : "on_time")} type="button">
              {busyAction === `status:${activeFlight.flightNumber}:${activeFlight.departureDatetime}` ? "Updating…" : `Set ${activeFlight.status === "on_time" ? "Delayed" : "On Time"}`}
            </Button>
            <Button className="rounded-lg" onClick={onBack} type="button" variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusSummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-right text-sm font-semibold text-slate-950">{value}</div>
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
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Create Flight Schedule</h2>
          <p className="mt-1 text-sm text-slate-500">Terminal operations workspace for building a flight before it is committed to the database.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button disabled type="button" variant="outline">Save Draft</Button>
          <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "create-flight"} onClick={() => form.handleSubmit()} type="button">
            <Plane className="size-4" /> {busyAction === "create-flight" ? "Creating…" : "Schedule Flight"}
          </Button>
        </div>
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
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Auto-generated sequencing is not wired yet.</span>
                  <button className="font-semibold text-slate-700" disabled type="button">Generate Next</button>
                </div>
              </FilterField>
            )}</form.Field>
            <form.Field name="airplaneId">{(field) => {
              const selectedAirplane = airplanes.find((airplane) => airplane.airplaneId === field.state.value)
              return (
                <FilterField label="Assigned Aircraft">
                  <Select onValueChange={(v) => field.handleChange(v ?? field.state.value)} value={field.state.value}>
                    <SelectTrigger className="h-10 rounded-lg bg-slate-50"><SelectValue placeholder="Select aircraft" /></SelectTrigger>
                    <SelectContent>{airplanes.map((a) => <SelectItem key={a.airplaneId} value={a.airplaneId}>{a.airplaneId} · {a.numberOfSeats} seats</SelectItem>)}</SelectContent>
                  </Select>
                  <div className="mt-2 text-[11px] text-slate-500">{selectedAirplane ? `Capacity: ${selectedAirplane.numberOfSeats} seats.` : "Choose aircraft to inspect capacity."}</div>
                </FilterField>
              )
            }}</form.Field>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-slate-200 bg-slate-50 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="size-5 text-slate-400" /> Routing & Schedule</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
            <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-950">Departure</div>
              <form.Field name="departureAirportCode">{(field) => (
                <FilterField label="Origin Airport">
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
              <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">Gate and terminal assignment remain operational follow-up steps after scheduling.</div>
            </div>
            <div className="hidden items-center justify-center lg:flex">
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="h-12 w-px bg-slate-300" />
                <ArrowRight className="size-4" />
                <div className="h-12 w-px bg-slate-300" />
              </div>
            </div>
            <div className="space-y-6 rounded-lg border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-950">Arrival</div>
              <form.Field name="arrivalAirportCode">{(field) => (
                <FilterField label="Destination Airport">
                  <Select onValueChange={(v) => field.handleChange(v ?? field.state.value)} value={field.state.value}>
                    <SelectTrigger className="h-10 rounded-lg bg-slate-50"><SelectValue placeholder="Choose airport" /></SelectTrigger>
                    <SelectContent>{airports.map((a) => <SelectItem key={a.code} value={a.code}>{a.city} · {a.code}</SelectItem>)}</SelectContent>
                  </Select>
                </FilterField>
              )}</form.Field>
              <form.Field name="arrivalDatetime">{(field) => (
                <FilterField label="Arrival Date & Time">
                  <Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="datetime-local" value={field.state.value} />
                </FilterField>
              )}</form.Field>
              <div className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-500">Cross-day arrival handling remains operator-reviewed after the draft is scheduled.</div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
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
                    <div className="mt-2 text-[11px] text-slate-500">Premium cabin multipliers are not modeled separately in the current scheduling UI.</div>
                  </FilterField>
                )}</form.Field>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-slate-50 shadow-none">
            <CardHeader><CardTitle className="text-lg">Pre-Flight Validation</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <ValidationTile description="Selected aircraft is present in the current airline fleet." status="ok" title="Aircraft Availability" />
              <ValidationTile description="Crew planning is still an operational follow-up outside the current database schema." status="ok" title="Crew Staffing" />
              <ValidationTile className="sm:col-span-2" description="Airport slot approval and gate assignment are not modeled here, so operators should confirm them after scheduling." status="warning" title="Slot Restriction Warning" />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}

function ValidationTile({
  className,
  description,
  status,
  title,
}: {
  className?: string
  description: string
  status: "ok" | "warning"
  title: string
}) {
  return (
    <div className={`rounded-lg border px-4 py-4 ${status === "ok" ? "border-slate-200 bg-white" : "border-red-200 bg-red-50"} ${className ?? ""}`}>
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
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
  const [searchTerm, setSearchTerm] = useState("")
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredAirplanes = airplanes.filter((airplane) => {
    if (!normalizedSearch) return true
    return (
      airplane.airplaneId.toLowerCase().includes(normalizedSearch)
      || airplane.manufacturingCompany.toLowerCase().includes(normalizedSearch)
    )
  })

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

  const totalSeats = airplanes.reduce((sum, airplane) => sum + airplane.numberOfSeats, 0)
  const newestAircraft = [...airplanes].sort((a, b) => new Date(b.manufacturingDate).getTime() - new Date(a.manufacturingDate).getTime())[0]

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Fleet Management</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor fleet assets, register aircraft, and review capacity from one workspace.</p>
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input aria-label="Search aircraft" className="h-9 rounded-lg bg-slate-50 pl-9" onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search tail number or maker" value={searchTerm} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Plane} label="Aircraft" value={String(airplanes.length)} />
        <KpiCard icon={Users} label="Total seats" value={String(totalSeats)} />
        <KpiCard icon={TrendingUp} label="Newest aircraft" value={newestAircraft ? newestAircraft.airplaneId : "—"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Current Fleet</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button disabled size="sm" type="button" variant="secondary">All Aircraft</Button>
                <Button disabled size="sm" type="button" variant="outline">Operational</Button>
                <Button disabled size="sm" type="button" variant="outline">Grounded</Button>
              </div>
            </div>
            <p className="text-sm text-slate-500">Search is live. Status filters remain presentation-only until fleet state is represented in the real product model.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tail Number</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Capacity</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manufacturer</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Built</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-500">Operational Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAirplanes.length ? filteredAirplanes.map((airplane) => (
                    <TableRow className="hover:bg-slate-50" key={airplane.airplaneId}>
                      <TableCell className="font-medium text-slate-950">{airplane.airplaneId}</TableCell>
                      <TableCell>{airplane.numberOfSeats}</TableCell>
                      <TableCell>{airplane.manufacturingCompany}</TableCell>
                      <TableCell>{formatDate(airplane.manufacturingDate)}</TableCell>
                      <TableCell className="text-sm text-slate-500">Status not tracked in current schema</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell className="py-8 text-center text-sm text-slate-500" colSpan={5}>No aircraft matched that search.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
            <CardHeader><CardTitle className="text-lg">Register Aircraft</CardTitle></CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit() }}>
                <form.Field name="airplaneId">{(field) => <FilterField label="Tail Number"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="N123AP" value={field.state.value} /></FilterField>}</form.Field>
                <form.Field name="numberOfSeats">{(field) => <FilterField label="Seat Count"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="290" type="number" value={field.state.value} /></FilterField>}</form.Field>
                <form.Field name="manufacturingCompany">{(field) => <FilterField label="Manufacturer"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Boeing" value={field.state.value} /></FilterField>}</form.Field>
                <form.Field name="manufacturingDate">{(field) => <FilterField label="Manufacturing Date"><Input className="h-10 rounded-lg bg-slate-50" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} /></FilterField>}</form.Field>
                <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" disabled={busyAction === "add-airplane"} type="submit">
                  <Plus className="mr-2 size-4" />{busyAction === "add-airplane" ? "Saving…" : "Add to Fleet"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 bg-slate-50 shadow-none">
            <CardHeader><CardTitle className="text-lg">Operational Context</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <ValidationTile description="Aircraft registration uses the real add-airplane mutation and refreshes the current fleet list." status="ok" title="Registration Path" />
              <ValidationTile description="Maintenance, AOG, and readiness states are intentionally not shown as live values because the current schema does not store them." status="warning" title="Unsupported Status Tracking" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/* ─── Ratings ─── */

function RatingsSection({
  ratings,
}: {
  ratings: Array<{ averageRating: number | null; comments: string[]; departureDatetime: string; flightNumber: string; reviewCount: number }>
}) {
  const averageAcrossFlights = ratings.length
    ? ratings.reduce((sum, rating) => sum + (rating.averageRating ?? 0), 0) / ratings.filter((rating) => rating.averageRating !== null).length || 0
    : 0

  return (
    <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Flight Ratings</h2>
          <p className="text-sm text-slate-500">Average ratings and written feedback for all flights.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard icon={Star} label="Average Rating" value={ratings.length && averageAcrossFlights ? averageAcrossFlights.toFixed(1) : "—"} />
          <KpiCard icon={Users} label="Reviewed Flights" value={String(ratings.filter((rating) => rating.reviewCount > 0).length)} />
          <KpiCard icon={BarChart3} label="Total Reviews" value={String(ratings.reduce((sum, rating) => sum + rating.reviewCount, 0))} />
        </div>
        <div className="space-y-4">
          {ratings.length ? ratings.map((rating) => (
            <Card className="rounded-xl border border-slate-200 bg-white shadow-none" key={`${rating.flightNumber}-${rating.departureDatetime}`}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-slate-950">{rating.flightNumber}</div>
                    <div className="text-sm text-slate-500">{formatDateTime(rating.departureDatetime)}</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Star className="size-4 text-amber-500" />
                    {rating.averageRating ? `${rating.averageRating.toFixed(1)} / 5` : "No ratings yet"} · {rating.reviewCount} reviews
                  </div>
                </div>
                {rating.comments.length ? (
                  <div className="mt-4 grid gap-3">
                    {rating.comments.map((comment, index) => (
                      <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600" key={`${rating.flightNumber}-${index}`}>{comment}</div>
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

      <Card className="rounded-xl border border-slate-200 bg-slate-50 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Customer Sentiment</CardTitle>
          <p className="text-sm text-slate-500">A layout-focused side panel for recent feedback using the reviews we actually have.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div className="text-3xl font-bold tracking-tight text-slate-950">{ratings.length && averageAcrossFlights ? averageAcrossFlights.toFixed(1) : "—"}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Average Rating</div>
          </div>
          <div className="space-y-3">
            {ratings.flatMap((rating) => rating.comments.map((comment, index) => ({
              comment,
              flightNumber: rating.flightNumber,
              id: `${rating.flightNumber}-${index}`,
            }))).slice(0, 4).map((item) => (
              <div className="rounded-lg border border-slate-200 bg-white p-4" key={item.id}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{item.flightNumber}</div>
                  <div className="text-xs text-slate-400">Recent feedback</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">“{item.comment}”</p>
              </div>
            ))}
            {!ratings.some((rating) => rating.comments.length) ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">Passenger sentiment summaries become richer once more reviews accumulate.</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
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
  const [rangePreset, setRangePreset] = useState("last-30-days")
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
    <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Reporting & Analytics</h2>
            <p className="text-sm text-slate-500">Ticket sales analytics and custom date range reporting using the current staff backend data.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select onValueChange={(value) => setRangePreset(value ?? rangePreset)} value={rangePreset}>
              <SelectTrigger aria-label="Reporting range preset" className="h-9 w-[180px] rounded-lg bg-slate-50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="this-quarter">This Quarter</SelectItem>
                <SelectItem value="year-to-date">Year to Date</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled type="button" variant="outline">Export</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard icon={BarChart3} label="All Tickets Sold" value={String(reportSummary.totalTickets)} />
          <KpiCard icon={TrendingUp} label="Last Month" value={String(reportSummary.lastMonthTickets)} />
          <KpiCard icon={Users} label="Last Year" value={String(reportSummary.lastYearTickets)} />
        </div>

        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Revenue & Volume Trends</CardTitle>
            <div className="flex gap-2">
              <Button disabled size="sm" type="button" variant="secondary">Monthly</Button>
              <Button disabled size="sm" type="button" variant="outline">Quarterly</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] min-w-0">
              <ResponsiveContainer debounce={50} height="100%" minHeight={280} width="100%">
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
          <CardHeader><CardTitle className="text-lg">Route Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
              Route-level performance rows are not rendered as live data because the current backend only exposes summary counts and monthly ticket totals, not per-route analytics aggregates.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-8">
        <Card className="rounded-xl border border-slate-200 bg-white shadow-none">
          <CardHeader><CardTitle className="text-lg">Custom Range Report</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end" onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); reportForm.handleSubmit() }}>
              <reportForm.Field name="startDate">{(field) => <FilterField label="Start Date"><div className="relative"><span className={field.state.value ? "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-950" : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"}>{formatDateLabel(field.state.value)}</span><Input aria-label="Report Start Date" className="h-10 rounded-lg bg-slate-50 text-transparent caret-transparent" id="staff-report-start-date" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} /></div></FilterField>}</reportForm.Field>
              <reportForm.Field name="endDate">{(field) => <FilterField label="End Date"><div className="relative"><span className={field.state.value ? "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-950" : "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400"}>{formatDateLabel(field.state.value)}</span><Input aria-label="Report End Date" className="h-10 rounded-lg bg-slate-50 text-transparent caret-transparent" id="staff-report-end-date" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} type="date" value={field.state.value} /></div></FilterField>}</reportForm.Field>
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

        <Card className="rounded-xl border border-slate-200 bg-slate-50 shadow-none">
          <CardHeader><CardTitle className="text-lg">Analytics Scope</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ValidationTile description="Preset range selection and export controls are layout-level affordances only until matching backend/report export support exists." status="warning" title="Presentation-Only Controls" />
            <ValidationTile description="Custom date-range reporting and monthly ticket totals are real and remain backed by live staff queries." status="ok" title="Live Reporting Data" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ─── Shared ─── */

function FilterField({ children, htmlFor, label }: { children: React.ReactNode; htmlFor?: string; label: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500" htmlFor={htmlFor}>{label}</Label>
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
