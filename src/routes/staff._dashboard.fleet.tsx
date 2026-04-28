import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import type {DashboardDataTableFilterOption} from "@/components/dashboard-data-table";
import { DatePickerField } from "@/components/date-time-picker"
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader
  
} from "@/components/dashboard-data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ResponsiveModal } from "@/components/responsive-modal"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"
import { addAirplaneFn } from "@/lib/queries"

type AirplaneRow = {
  airplaneId: string
  manufacturingCompany: string
  manufacturingDate: string
  numberOfSeats: number
}

export const Route = createFileRoute("/staff/_dashboard/fleet")({
  component: StaffFleetPage,
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function getUniqueOptions(
  airplanes: Array<AirplaneRow>,
  valueKey: "manufacturingCompany"
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>()
  for (const airplane of airplanes) {
    const value = airplane[valueKey]
    options.set(value, value)
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort(
    (a, b) => a.label.localeCompare(b.label)
  )
}

function StaffFleetPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      airplaneId: "",
      numberOfSeats: "",
      manufacturingCompany: "",
      manufacturingDate: "",
    },
    onSubmit: async ({ value }) => {
      const result = await addAirplaneFn({
        data: {
          airplaneId: value.airplaneId,
          numberOfSeats: Number(value.numberOfSeats),
          manufacturingCompany: value.manufacturingCompany,
          manufacturingDate: value.manufacturingDate,
        },
      })
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
      setError(err instanceof Error ? err.message : "Failed to add airplane.")
    }
  }

  const columns = useMemo<Array<ColumnDef<AirplaneRow>>>(
    () => [
    {
      accessorKey: "airplaneId",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Airplane ID" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.airplaneId}</span>
      ),
    },
    {
      accessorKey: "manufacturingCompany",
      filterFn: "arrIncludesSome",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Manufacturer" />
      ),
    },
    {
      accessorKey: "manufacturingDate",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Mfg. Date" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.manufacturingDate)}
        </span>
      ),
    },
    {
      accessorKey: "numberOfSeats",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader
          column={column}
          title="Seats"
          className="ms-auto"
        />
      ),
      cell: ({ row }) => (
        <div className="text-right tabular-nums">
          {row.original.numberOfSeats}
        </div>
      ),
    },
  ],
    []
  )

  const filterOptions = useMemo(
    () => [
      {
        columnId: "manufacturingCompany",
        label: "Manufacturer",
        options: getUniqueOptions(data.airplanes, "manufacturingCompany"),
      },
    ],
    [data.airplanes]
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Fleet</h1>
          <p className="text-sm text-muted-foreground">
            {data.airlineName} — {data.airplanes.length} aircraft
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Airplane"
        description="Register a new aircraft in the fleet."
      >
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form.Field name="airplaneId">
                    {(field) => (
                      <Field>
                        <FieldLabel>Airplane ID</FieldLabel>
                        <Input
                          placeholder="B737-001"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="numberOfSeats">
                    {(field) => (
                      <Field>
                        <FieldLabel>Number of Seats</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          required
                          placeholder="180"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="manufacturingCompany">
                    {(field) => (
                      <Field>
                        <FieldLabel>Manufacturer</FieldLabel>
                        <Input
                          placeholder="Boeing"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="manufacturingDate">
                    {(field) => (
                      <Field>
                        <FieldLabel>Manufacturing Date</FieldLabel>
                        <DatePickerField
                          value={field.state.value}
                          onChange={(value) => field.handleChange(value)}
                          placeholder="Pick manufacturing date"
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>
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
                  {isSubmitting ? "Adding…" : "Add Airplane"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </form.Subscribe>
      </ResponsiveModal>

      <DashboardDataTable
        columns={columns}
        data={data.airplanes}
        emptyMessage="No aircraft registered."
        enableVirtualization
        filters={filterOptions}
        searchPlaceholder="Search fleet..."
        queryPrefix="fleet"
      />

    </div>
  )
}
