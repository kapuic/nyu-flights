import {
  createFileRoute,
  getRouteApi,
  useRouter,
} from "@tanstack/react-router"
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangleIcon, CircleCheckIcon, Plus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/components/country-flag"
import {
  DashboardDataTable,
  type DashboardDataTableFilterOption,
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
import { isAdminOrAbove } from "@/lib/staff-permissions"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"
import { getAirportOption } from "@/lib/airports"
import {
  createFlightFn,
  listDbAirportsFn,
  updateFlightStatusFn,
} from "@/lib/queries"

type FlightRow = {
  airlineName: string
  airplaneId: string
  arrivalAirportCode: string
  arrivalAirportName: string
  arrivalCity: string
  arrivalDatetime: string
  averageRating: number | null
  availableSeats: number
  basePrice: number
  departureAirportCode: string
  departureAirportName: string
  departureCity: string
  departureDatetime: string
  flightNumber: string
  reviewCount: number
  status: "on_time" | "delayed"
  ticketCount: number
}

export const Route = createFileRoute("/staff/_dashboard/flights")({
  component: StaffFlightsPage,
})

const staffDashboardRoute = getRouteApi("/staff/_dashboard")

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value)
}

function formatRating(value: number | null) {
  if (value === null) return "—"
  return value.toFixed(1)
}

function getUniqueOptions(
  flights: Array<FlightRow>,
  valueKey: "arrivalAirportCode" | "departureAirportCode" | "status"
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>()
  for (const flight of flights) {
    const value = flight[valueKey]
    options.set(value, getFilterOptionLabel(valueKey, value))
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort(
    (a, b) => a.label.localeCompare(b.label)
  )
}

function getFilterOptionLabel(
  valueKey: "arrivalAirportCode" | "departureAirportCode" | "status",
  value: string
) {
  if (valueKey === "status") return value === "on_time" ? "On Time" : "Delayed"
  const airport = getAirportOption(value)
  return airport ? `${value} — ${airport.city}` : value
}

function AirportCell({ code }: { code: string }) {
  const airport = getAirportOption(code)
  return (
    <div className="flex min-w-36 items-center gap-2">
      {airport ? (
        <CountryFlag countryCode={airport.countryCode} size={18} />
      ) : null}
      <div className="min-w-0">
        <div className="font-mono text-sm font-medium tracking-tight">{code}</div>
        <div className="truncate text-xs text-muted-foreground">
          {airport?.name ?? airport?.city ?? "Unknown airport"}
        </div>
      </div>
    </div>
  )
}

function FlightStatusBadge({ status }: { status: FlightRow["status"] }) {
  const isOnTime = status === "on_time"
  const Icon = isOnTime ? CircleCheckIcon : AlertTriangleIcon
  return (
    <Badge variant={isOnTime ? "secondary" : "destructive"} className="text-xs">
      <Icon data-icon="inline-start" />
      {isOnTime ? "On Time" : "Delayed"}
    </Badge>
  )
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
  const { currentUser } = staffDashboardRoute.useLoaderData()
  const queryClient = useQueryClient()
  const router = useRouter()
  const showAirlineColumn = isAdminOrAbove(currentUser.staffPermission ?? "staff")
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

  async function handleBulkStatusUpdate(
    rows: Array<FlightRow>,
    status: FlightRow["status"]
  ) {
    const flightsToUpdate = rows.filter((flight) => flight.status !== status)
    if (!flightsToUpdate.length) {
      toast.info("Selected flights already have that status.")
      return
    }

    try {
      const results = await Promise.all(
        flightsToUpdate.map((flight) =>
          updateFlightStatusFn({
            data: {
              airlineName: flight.airlineName,
              departureDatetime: flight.departureDatetime,
              flightNumber: flight.flightNumber,
              status,
            },
          })
        )
      )
      const failed = results.find((result) => "error" in result && result.error)
      if (failed && "error" in failed) {
        toast.error(failed.error)
        return
      }

      toast.success(
        `Updated ${flightsToUpdate.length} flight${flightsToUpdate.length === 1 ? "" : "s"}.`
      )
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] })
      await router.invalidate()
    } catch {
      toast.error("Failed to update selected flights.")
    }
  }

  const columns = useMemo<Array<ColumnDef<FlightRow>>>(() => {
    const airlineColumn: ColumnDef<FlightRow> = {
      accessorKey: "airlineName",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Airline" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.airlineName}
        </span>
      ),
    }

    return [
      ...(showAirlineColumn ? [airlineColumn] : []),
      {
        accessorKey: "flightNumber",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Flight" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tracking-tight">
            {row.original.flightNumber}
          </span>
        ),
      },
      {
        accessorKey: "departureAirportCode",
        filterFn: "arrIncludesSome",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="From" />
        ),
        cell: ({ row }) => (
          <AirportCell code={row.original.departureAirportCode} />
        ),
      },
      {
        accessorKey: "arrivalAirportCode",
        filterFn: "arrIncludesSome",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="To" />
        ),
        cell: ({ row }) => (
          <AirportCell code={row.original.arrivalAirportCode} />
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
        filterFn: "arrIncludesSome",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => <FlightStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "airplaneId",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Aircraft" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm text-muted-foreground">
            {row.original.airplaneId}
          </span>
        ),
      },
      {
        accessorKey: "basePrice",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Price" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {formatCurrency(row.original.basePrice)}
          </div>
        ),
      },
      {
        accessorKey: "availableSeats",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Seats" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {row.original.availableSeats}
          </div>
        ),
      },
      {
        accessorKey: "ticketCount",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Tickets" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {row.original.ticketCount}
          </div>
        ),
      },
      {
        accessorKey: "averageRating",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Rating" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {formatRating(row.original.averageRating)}
          </div>
        ),
      },
      {
        accessorKey: "reviewCount",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Reviews" />
        ),
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {row.original.reviewCount}
          </div>
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
              {row.original.status === "on_time"
                ? "Mark Delayed"
                : "Mark On Time"}
            </Button>
          </div>
        ),
      },
    ]
  }, [showAirlineColumn])

  const filterOptions = [
    {
      columnId: "departureAirportCode",
      label: "From",
      options: getUniqueOptions(data.flights, "departureAirportCode"),
    },
    {
      columnId: "arrivalAirportCode",
      label: "To",
      options: getUniqueOptions(data.flights, "arrivalAirportCode"),
    },
    {
      columnId: "status",
      label: "Status",
      options: getUniqueOptions(data.flights, "status"),
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-hidden p-4 md:p-6">
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
        bulkActions={[
          {
            label: "Mark on time",
            onSelect: (rows) => handleBulkStatusUpdate(rows, "on_time"),
          },
          {
            label: "Mark delayed",
            onSelect: (rows) => handleBulkStatusUpdate(rows, "delayed"),
          },
        ]}
        columns={columns}
        data={data.flights}
        emptyMessage="No flights scheduled."
        enableRowSelection
        enableVirtualization
        filters={filterOptions}
        searchPlaceholder="Search flights..."
        queryPrefix="flights"
      />

    </div>
  )
}
