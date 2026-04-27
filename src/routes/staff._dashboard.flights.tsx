import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ResponsiveModal } from "@/components/responsive-modal"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"
import { createFlightFn, updateFlightStatusFn } from "@/lib/queries"

export const Route = createFileRoute("/staff/_dashboard/flights")({
  component: StaffFlightsPage,
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

function StaffFlightsPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      flightNumber: "",
      departureAirportCode: "",
      arrivalAirportCode: "",
      departureDatetime: "",
      arrivalDatetime: "",
      basePrice: "",
      airplaneId: "",
    },
    onSubmit: async ({ value }) => {
      const result = await createFlightFn({
        data: {
          ...value,
          basePrice: Number(value.basePrice),
        },
      })
      if ("error" in result && result.error) {
        throw new Error(result.error)
      }
      toast.success(result.message)
      form.reset()
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] })
      await router.invalidate()
    },
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flight.")
    }
  }

  async function handleStatusToggle(flight: {
    airlineName: string
    departureDatetime: string
    flightNumber: string
    status: "on_time" | "delayed"
  }) {
    try {
      const newStatus = flight.status === "on_time" ? "delayed" : "on_time"
      const result = await updateFlightStatusFn({
        data: {
          airlineName: flight.airlineName,
          departureDatetime: flight.departureDatetime,
          flightNumber: flight.flightNumber,
          status: newStatus,
        },
      })
      if ("error" in result && result.error) {
        toast.error(result.error)
        return
      }
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] })
      await router.invalidate()
    } catch {
      toast.error("Failed to update flight status.")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Flights</h1>
          <p className="text-sm text-muted-foreground">
            Schedule and manage flight status
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Create
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Flight"
        description="Add a new flight to the schedule."
      >
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form.Field name="flightNumber">
                    {(field) => (
                      <Field>
                        <FieldLabel>Flight Number</FieldLabel>
                        <Input
                          placeholder="SK100"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="departureAirportCode">
                    {(field) => (
                      <Field>
                        <FieldLabel>Departure Airport</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v ?? "")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.airports.map((a) => (
                              <SelectItem key={a.code} value={a.code}>
                                {a.city} ({a.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="arrivalAirportCode">
                    {(field) => (
                      <Field>
                        <FieldLabel>Arrival Airport</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v ?? "")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select airport" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.airports.map((a) => (
                              <SelectItem key={a.code} value={a.code}>
                                {a.city} ({a.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="departureDatetime">
                    {(field) => (
                      <Field>
                        <FieldLabel>Departure Time</FieldLabel>
                        <Input
                          type="datetime-local"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="arrivalDatetime">
                    {(field) => (
                      <Field>
                        <FieldLabel>Arrival Time</FieldLabel>
                        <Input
                          type="datetime-local"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="basePrice">
                    {(field) => (
                      <Field>
                        <FieldLabel>Base Price ($)</FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          placeholder="199.00"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="airplaneId">
                    {(field) => (
                      <Field>
                        <FieldLabel>Airplane</FieldLabel>
                        <Select
                          value={field.state.value}
                          onValueChange={(v) => field.handleChange(v ?? "")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select airplane" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.airplanes.map((a) => (
                              <SelectItem
                                key={a.airplaneId}
                                value={a.airplaneId}
                              >
                                {a.airplaneId} — {a.numberOfSeats} seats
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </form.Field>
                </div>
                {error ? (
                  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Creating…" : "Create Flight"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </form.Subscribe>
      </ResponsiveModal>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Flight</TableHead>
              <TableHead>Route</TableHead>
              <TableHead className="hidden sm:table-cell">Departure</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.flights.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No flights scheduled.
                </TableCell>
              </TableRow>
            ) : (
              data.flights.map((flight) => (
                <TableRow
                  key={`${flight.flightNumber}-${flight.departureDatetime}`}
                >
                  <TableCell className="font-medium">
                    {flight.flightNumber}
                  </TableCell>
                  <TableCell className="text-xs">
                    {flight.departureAirportCode} → {flight.arrivalAirportCode}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDateShort(flight.departureDatetime)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        flight.status === "on_time"
                          ? "secondary"
                          : "destructive"
                      }
                      className="text-xs"
                    >
                      {flight.status === "on_time" ? "On Time" : "Delayed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusToggle(flight)}
                    >
                      {flight.status === "on_time"
                        ? "Mark Delayed"
                        : "Mark On Time"}
                    </Button>
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
