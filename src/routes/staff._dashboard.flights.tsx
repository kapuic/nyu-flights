import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  AirplaneComboboxField,
  AirportComboboxField,
} from "@/components/combobox-fields"
import { DateTimePickerField } from "@/components/date-time-picker"
import { DialogGlobe } from "@/components/dialog-globe"
import { ResponsiveModal } from "@/components/responsive-modal"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"
import { getAirportOption } from "@/lib/airports"

import { createFlightFn, listDbAirportsFn, updateFlightStatusFn } from "@/lib/queries"

type FlightRow = {
  airlineName: string
  arrivalAirportCode: string
  arrivalDatetime: string
  basePrice: number
  departureAirportCode: string
  departureDatetime: string
  flightNumber: string
  status: "on_time" | "delayed"
}

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

function FlightGlobe({
  departureCode,
  arrivalCode,
}: {
  arrivalCode: string
  departureCode: string
}) {
  const depAirport = getAirportOption(departureCode)
  const arrAirport = getAirportOption(arrivalCode)

  const globeMarkers = useMemo(() => {
    const m: Array<{ id: string; countryCode: string; label: string; location: [number, number] }> = []
    if (depAirport)
      m.push({
        id: `dep-${depAirport.code.toLowerCase()}`,
        countryCode: depAirport.countryCode,
        label: `${depAirport.city} (${depAirport.code})`,
        location: [depAirport.lat, depAirport.lng],
      })
    if (arrAirport)
      m.push({
        id: `arr-${arrAirport.code.toLowerCase()}`,
        countryCode: arrAirport.countryCode,
        label: `${arrAirport.city} (${arrAirport.code})`,
        location: [arrAirport.lat, arrAirport.lng],
      })
    return m
  }, [depAirport, arrAirport])

  const globeArcs = useMemo(() => {
    if (!depAirport || !arrAirport) return []
    return [
      {
        from: [depAirport.lat, depAirport.lng] as [number, number],
        to: [arrAirport.lat, arrAirport.lng] as [number, number],
      },
    ]
  }, [depAirport, arrAirport])

  return (
    <div className="-mx-6 -mt-2">
      <DialogGlobe markers={globeMarkers} arcs={globeArcs} />
    </div>
  )
}

function StaffFlightsPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dbAirportsQuery = useQuery({
    queryKey: ["db-airports"],
    queryFn: () => listDbAirportsFn(),
    staleTime: 5 * 60 * 1000,
  })
  const dbAirports = dbAirportsQuery.data ?? []

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

  const columns: Array<ColumnDef<FlightRow>> = [
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
        `${row.departureAirportCode} ${row.arrivalAirportCode}`,
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
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Action</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusToggle(row.original)}
          >
            {row.original.status === "on_time" ? "Mark Delayed" : "Mark On Time"}
          </Button>
        </div>
      ),
    },
  ]

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
        <form.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
            departureCode: state.values.departureAirportCode,
            arrivalCode: state.values.arrivalAirportCode,
          })}
        >
          {({ isSubmitting, departureCode, arrivalCode }) => (
            <>
              <FlightGlobe
                departureCode={departureCode}
                arrivalCode={arrivalCode}
              />
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
                            onChange={(e) =>
                              field.handleChange(e.target.value)
                            }
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="airplaneId">
                      {(field) => (
                        <Field>
                          <FieldLabel>Airplane</FieldLabel>
                          <AirplaneComboboxField
                            items={data.airplanes}
                            value={field.state.value}
                            onChange={(value) => field.handleChange(value)}
                            placeholder="Search airplanes"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="departureAirportCode">
                      {(field) => (
                        <Field>
                          <FieldLabel>Departure Airport</FieldLabel>
                          <AirportComboboxField
                            items={dbAirports}
                            value={field.state.value}
                            onChange={(value) => field.handleChange(value)}
                            placeholder="Search departure airport"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="arrivalAirportCode">
                      {(field) => (
                        <Field>
                          <FieldLabel>Arrival Airport</FieldLabel>
                          <AirportComboboxField
                            items={dbAirports}
                            value={field.state.value}
                            onChange={(value) => field.handleChange(value)}
                            placeholder="Search arrival airport"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="departureDatetime">
                      {(field) => (
                        <Field>
                          <FieldLabel>Departure Time</FieldLabel>
                          <DateTimePickerField
                            value={field.state.value}
                            onChange={(value) => field.handleChange(value)}
                            placeholder="Pick departure time"
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="arrivalDatetime">
                      {(field) => (
                        <Field>
                          <FieldLabel>Arrival Time</FieldLabel>
                          <DateTimePickerField
                            value={field.state.value}
                            onChange={(value) => field.handleChange(value)}
                            placeholder="Pick arrival time"
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
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
                          onChange={(e) =>
                            field.handleChange(e.target.value)
                          }
                        />
                      </Field>
                    )}
                  </form.Field>
                  {error ? (
                    <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {error}
                    </div>
                  ) : null}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? "Creating…" : "Create Flight"}
                  </Button>
                </FieldGroup>
              </form>
            </>
          )}
        </form.Subscribe>
      </ResponsiveModal>

      <DashboardDataTable
        columns={columns}
        data={data.flights}
        emptyMessage="No flights scheduled."
        searchPlaceholder="Search flights..."
        queryPrefix="flights"
      />

    </div>
  )
}
