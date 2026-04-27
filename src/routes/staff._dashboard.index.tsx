import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import {
  PlaneTakeoff,
  Clock,
  AlertTriangle,
  Ticket,
} from "lucide-react"

import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table"
import { Badge } from "@/components/ui/badge"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"

type DashboardFlightRow = {
  arrivalAirportCode: string
  arrivalAirportName: string
  arrivalCity: string
  arrivalDatetime: string
  departureAirportCode: string
  departureAirportName: string
  departureCity: string
  departureDatetime: string
  flightNumber: string
  status: "on_time" | "delayed"
  ticketCount: number
}

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

  const columns: Array<ColumnDef<DashboardFlightRow>> = [
    {
      accessorKey: "flightNumber",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Flight" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.flightNumber}</span>
      ),
    },
    {
      id: "route",
      accessorFn: (row) =>
        `${row.departureAirportCode} ${row.arrivalAirportCode} ${row.departureCity} ${row.arrivalCity}`,
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Route" />
      ),
      cell: ({ row }) => (
        <span className="text-xs">
          {row.original.departureAirportCode} → {row.original.arrivalAirportCode}
        </span>
      ),
    },
    {
      accessorKey: "departureDatetime",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Departure" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateShort(row.original.departureDatetime)}
        </span>
      ),
    },
    {
      accessorKey: "arrivalDatetime",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Arrival" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateShort(row.original.arrivalDatetime)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === "on_time" ? "secondary" : "destructive"}
          className="text-xs"
        >
          {row.original.status === "on_time" ? "On Time" : "Delayed"}
        </Badge>
      ),
    },
    {
      accessorKey: "ticketCount",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader
          column={column}
          title="Tickets"
          className="ms-auto"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{row.original.ticketCount}</div>
      ),
    },
  ]

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

      <DashboardDataTable
        columns={columns}
        data={data.flights}
        emptyMessage="No flights found."
        searchPlaceholder="Search flights..."
        queryPrefix="dashboard"
      />

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
