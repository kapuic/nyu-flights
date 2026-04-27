import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
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
import {
  staffDashboardQueryOptions,
  staffPassengersQueryOptions,
} from "@/lib/staff-queries"

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
  const [selectedFlightKey, setSelectedFlightKey] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

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
  const filteredPassengers = passengers.filter((p) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      p.customerName.toLowerCase().includes(q) ||
      p.customerEmail.toLowerCase().includes(q) ||
      p.passportNumber.toLowerCase().includes(q) ||
      String(p.ticketId).includes(q)
    )
  })

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Passengers</h1>
        <p className="text-sm text-muted-foreground">
          View passenger manifest for a flight
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 max-w-sm">
          <label className="mb-1.5 block text-sm font-medium">Flight</label>
          <Select
            value={selectedFlightKey}
            onValueChange={(v) => {
              setSelectedFlightKey(v ?? "")
              setSearchQuery("")
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a flight" />
            </SelectTrigger>
            <SelectContent>
              {data.flights.map((f) => {
                const key = `${f.flightNumber}::${f.departureDatetime}`
                return (
                  <SelectItem key={key} value={key}>
                    {f.flightNumber} — {f.departureAirportCode} →{" "}
                    {f.arrivalAirportCode} ({formatDateShort(f.departureDatetime)})
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        {selectedFlight ? (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search passengers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        ) : null}
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">
                  Passport
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  Purchased
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPassengers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {passengers.length === 0
                      ? "No passengers on this flight."
                      : "No passengers match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPassengers.map((p) => (
                  <TableRow key={p.ticketId}>
                    <TableCell className="font-medium tabular-nums">
                      #{p.ticketId}
                    </TableCell>
                    <TableCell>{p.customerName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {p.customerEmail}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.passportNumber}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {formatDateShort(p.purchaseDatetime)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {selectedFlight ? (
            <div className="border-t px-4 py-2 text-xs text-muted-foreground">
              {passengers.length} passenger{passengers.length !== 1 ? "s" : ""}{" "}
              · {selectedFlight.availableSeats} seat
              {selectedFlight.availableSeats !== 1 ? "s" : ""} remaining
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
