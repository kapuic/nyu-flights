import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useCallback, useMemo, useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"

import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table"
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import { ResponsiveModal } from "@/components/responsive-modal"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createAirlineFn, deleteAirlineFn } from "@/lib/queries"
import { staffAirlinesQueryOptions } from "@/lib/staff-queries"

type AirlineRow = {
  name: string
}

export const Route = createFileRoute("/staff/_dashboard/airlines")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffAirlinesQueryOptions())
  },
  component: ManageAirlinesPage,
})

function ManageAirlinesPage() {
  const { data: airlines } = useSuspenseQuery(staffAirlinesQueryOptions())
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const deleteConfirm = useDeleteConfirmation()
  const queryClient = useQueryClient()
  const router = useRouter()

  async function refreshAirlines() {
    await queryClient.invalidateQueries({ queryKey: ["staff-airlines"] })
    await router.invalidate()
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await createAirlineFn({ data: { name: newName } })
      toast.success(result.message)
      setNewName("")
      setCreateOpen(false)
      await refreshAirlines()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create airline.")
    }
  }

  const deleteAirlines = useCallback(
    async (rows: Array<AirlineRow>) => {
      try {
        const results = await Promise.all(
          rows.map((airline) => deleteAirlineFn({ data: { name: airline.name } }))
        )
        const failed = results.find((result) => "error" in result && result.error)
        if (failed && "error" in failed) {
          toast.error(String(failed.error))
          return
        }

        toast.success(
          `Deleted ${rows.length} airline${rows.length === 1 ? "" : "s"}.`
        )
        await refreshAirlines()
      } catch {
        toast.error("Failed to delete airlines. They may have dependent data.")
      }
    },
    [refreshAirlines]
  )

  const requestDeleteAirlines = useCallback(
    (rows: Array<AirlineRow>) => {
      const label =
        rows.length === 1 ? rows[0].name : `${rows.length} selected airlines`
      deleteConfirm.requestDelete(label, () => void deleteAirlines(rows))
    },
    [deleteAirlines, deleteConfirm]
  )

  const columns = useMemo<Array<ColumnDef<AirlineRow>>>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
    ],
    []
  )

  const tableActions = useMemo(
    () => [
      {
        label: "Delete airlines",
        onSelect: requestDeleteAirlines,
      },
    ],
    [requestDeleteAirlines]
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Airlines</h1>
          <p className="text-sm text-muted-foreground">
            Manage airlines in the system
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
        title="Create Airline"
        description="Add a new airline to the system."
      >
        <form onSubmit={handleCreate}>
          <FieldGroup>
            <Field>
              <FieldLabel>Airline Name</FieldLabel>
              <Input
                required
                placeholder="Pacific Airlines"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
              />
            </Field>
            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
            <Button type="submit" className="w-full sm:w-auto">
              Create Airline
            </Button>
          </FieldGroup>
        </form>
      </ResponsiveModal>

      <DeleteConfirmation
        pending={deleteConfirm.pending}
        onClose={deleteConfirm.close}
      />

      <DashboardDataTable
        bulkActions={tableActions}
        columns={columns}
        data={airlines}
        emptyMessage="No airlines."
        enableRowSelection
        searchPlaceholder="Search airlines..."
        queryPrefix="airlines"
        rowActions={tableActions}
      />
    </div>
  )
}

