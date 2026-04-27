import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

import { AirportComboboxField } from "@/components/combobox-fields"
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table"
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import { DialogGlobe } from "@/components/dialog-globe"
import { ResponsiveModal } from "@/components/responsive-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { REAL_AIRPORT_OPTIONS, getAirportOption } from "@/lib/airports"
import { createAirportFn, deleteAirportFn } from "@/lib/queries"
import { staffAirportsQueryOptions } from "@/lib/staff-queries"

type AirportRow = {
  airport_type: string
  city: string
  code: string
  country: string
}

export const Route = createFileRoute("/staff/_dashboard/airports")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffAirportsQueryOptions())
  },
  component: ManageAirportsPage,
})

function ManageAirportsPage() {
  const { data: airports } = useSuspenseQuery(staffAirportsQueryOptions())
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAirportCode, setSelectedAirportCode] = useState("")
  const [airportType, setAirportType] = useState("")
  const [error, setError] = useState<string | null>(null)
  const deleteConfirm = useDeleteConfirmation()
  const queryClient = useQueryClient()
  const router = useRouter()

  const selectedAirport = useMemo(
    () => getAirportOption(selectedAirportCode),
    [selectedAirportCode]
  )

  const globeMarkers = useMemo(() => {
    if (!selectedAirport) return []
    return [
      {
        id: selectedAirport.code.toLowerCase(),
        countryCode: selectedAirport.countryCode,
        label: `${selectedAirport.city} (${selectedAirport.code})`,
        location: [selectedAirport.lat, selectedAirport.lng] as [number, number],
      },
    ]
  }, [selectedAirport])

  async function refreshAirports() {
    await queryClient.invalidateQueries({ queryKey: ["staff-airports"] })
    await router.invalidate()
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      if (!selectedAirport) {
        setError("Choose a real airport from the list.")
        return
      }

      const result = await createAirportFn({
        data: {
          airportType: airportType.toLowerCase(),
          city: selectedAirport.city,
          code: selectedAirport.code,
          country: selectedAirport.country,
        },
      })
      toast.success(result.message)
      setSelectedAirportCode("")
      setAirportType("")
      setCreateOpen(false)
      await refreshAirports()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create airport.")
    }
  }

  async function handleDelete(airportCode: string) {
    try {
      const result = await deleteAirportFn({ data: { code: airportCode } })
      toast.success(result.message)
      await refreshAirports()
    } catch {
      toast.error("Failed to delete airport. It may have dependent flights.")
    }
  }

  const columns: Array<ColumnDef<AirportRow>> = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
    },
    {
      accessorKey: "city",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="City" />
      ),
    },
    {
      accessorKey: "country",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Country" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.country}</span>
      ),
    },
    {
      accessorKey: "airport_type",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.airport_type}
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${row.original.code}`}
            onClick={() =>
              deleteConfirm.requestDelete(row.original.code, () =>
                handleDelete(row.original.code)
              )
            }
          >
            <Trash2 className="text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Airports</h1>
          <p className="text-sm text-muted-foreground">
            Manage airports in the system
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          Create
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Airport"
        description="Add a real-world airport to the system."
      >
        <div className="-mx-6 -mt-2">
          <DialogGlobe markers={globeMarkers} />
        </div>
        <form onSubmit={handleCreate}>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>Airport</FieldLabel>
                <AirportComboboxField
                  items={REAL_AIRPORT_OPTIONS}
                  value={selectedAirportCode}
                  onChange={(value) => setSelectedAirportCode(value)}
                  placeholder="Search airports"
                />
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={airportType}
                  onValueChange={(value) => setAirportType(value ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domestic">Domestic</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" className="w-full sm:w-auto">
              Create Airport
            </Button>
          </FieldGroup>
        </form>
      </ResponsiveModal>

      <DeleteConfirmation
        pending={deleteConfirm.pending}
        onClose={deleteConfirm.close}
      />

      <DashboardDataTable
        columns={columns}
        data={airports}
        emptyMessage="No airports."
        searchPlaceholder="Search airports..."
        queryPrefix="airports"
      />
    </div>
  )
}

