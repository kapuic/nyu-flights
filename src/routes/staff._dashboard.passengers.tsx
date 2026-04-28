import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { parseAsString, useQueryStates } from "nuqs"
import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  staffDashboardQueryOptions,
  staffPassengersQueryOptions,
} from "@/lib/staff-queries"

type PassengerRow = {
  customerEmail: string
  customerName: string
  passportNumber: string
  purchaseDatetime: string
  ticketId: number
}

const passengerSearchParams = {
  flight: parseAsString.withDefault(""),
}

export const Route = createFileRoute("/staff/_dashboard/passengers")({
  component: StaffPassengersPage,
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

function StaffPassengersPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const [{ flight: selectedFlightKey }, setSearchParams] = useQueryStates(
    passengerSearchParams
  )

  const selectedFlight = data.flights.find(
    (f) => `${f.flightNumber}::${f.departureDatetime}` === selectedFlightKey
  )

  const passengersQuery = useQuery({
    ...staffPassengersQueryOptions({
      airlineName: selectedFlight?.airlineName ?? "",
      departureDatetime: selectedFlight?.departureDatetime ?? "",
      flightNumber: selectedFlight?.flightNumber ?? "",
    }),
    enabled: !!selectedFlight,
  })

  const passengers = passengersQuery.data ?? []
  const columns = useMemo<Array<ColumnDef<PassengerRow>>>(
    () => [
    {
      accessorKey: "ticketId",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Ticket" />
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">#{row.original.ticketId}</span>
      ),
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "customerEmail",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.customerEmail}
        </span>
      ),
    },
    {
      accessorKey: "passportNumber",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Passport" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.passportNumber}
        </span>
      ),
    },
    {
      accessorKey: "purchaseDatetime",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Purchased" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDateShort(row.original.purchaseDatetime)}
        </span>
      ),
    },
  ],
    []
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Passengers</h1>
        <p className="text-sm text-muted-foreground">
          View passenger manifest for a flight
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="max-w-sm flex-1">
          <label className="mb-1.5 block text-sm font-medium">Flight</label>
          <Select
            value={selectedFlightKey}
            onValueChange={(value) => {
              void setSearchParams({ flight: value ?? "" })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a flight" />
            </SelectTrigger>
            <SelectContent>
              {data.flights.map((flight) => {
                const key = `${flight.flightNumber}::${flight.departureDatetime}`
                return (
                  <SelectItem key={key} value={key}>
                    {flight.flightNumber} — {flight.departureAirportCode} →{" "}
                    {flight.arrivalAirportCode} ({formatDateShort(flight.departureDatetime)})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedFlight ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Select a flight to view its passenger manifest.
        </div>
      ) : passengersQuery.isError ? (
        <div className="rounded-md border bg-destructive/10 p-8 text-center text-sm text-destructive">
          Failed to load passengers. Try selecting the flight again.
        </div>
      ) : passengersQuery.isLoading ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Loading passengers...
        </div>
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            data={passengers}
            emptyMessage="No passengers on this flight."
            enableVirtualization
            searchPlaceholder="Search passengers..."
            queryPrefix="passengers"
          />
          <div className="rounded-md border px-4 py-2 text-xs text-muted-foreground">
            {passengers.length} passenger{passengers.length !== 1 ? "s" : ""} ·{" "}
            {selectedFlight.availableSeats} seat
            {selectedFlight.availableSeats !== 1 ? "s" : ""} remaining
          </div>
        </>
      )}
    </div>
  )
}

