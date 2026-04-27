import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"
import {
  PlaneTakeoff,
  Clock,
  AlertTriangle,
  Ticket,
  Search,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"

export const Route = createFileRoute("/staff/_dashboard/")({
  component: StaffDashboardPage,
})

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function StaffDashboardPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFlights = data.flights.filter((f) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      f.flightNumber.toLowerCase().includes(q) ||
      f.departureAirportName.toLowerCase().includes(q) ||
      f.arrivalAirportName.toLowerCase().includes(q) ||
      f.departureCity.toLowerCase().includes(q) ||
      f.arrivalCity.toLowerCase().includes(q)
    )
  })

  const onTimeCount = data.flights.filter((f) => f.status === "on_time").length
  const delayedCount = data.flights.filter((f) => f.status === "delayed").length
  const totalTickets = data.flights.reduce((sum, f) => sum + f.ticketCount, 0)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {data.airlineName} — next 30 days
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Flights"
          value={data.flights.length}
          icon={<PlaneTakeoff className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="On Time"
          value={onTimeCount}
          icon={<Clock className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Delayed"
          value={delayedCount}
          icon={<AlertTriangle className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Tickets Sold"
          value={totalTickets}
          icon={<Ticket className="size-4 text-muted-foreground" />}
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search flights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flight</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="hidden sm:table-cell">Departure</TableHead>
              <TableHead className="hidden md:table-cell">Arrival</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tickets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFlights.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No flights found.
                </TableCell>
              </TableRow>
            ) : (
              filteredFlights.map((flight) => (
                <TableRow key={`${flight.flightNumber}-${flight.departureDatetime}`}>
                  <TableCell className="font-medium">
                    {flight.flightNumber}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">
                      {flight.departureAirportCode} → {flight.arrivalAirportCode}
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDateShort(flight.departureDatetime)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDateShort(flight.arrivalDatetime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={flight.status === "on_time" ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {flight.status === "on_time" ? "On Time" : "Delayed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {flight.ticketCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
