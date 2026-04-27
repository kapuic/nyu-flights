import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

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

  async function handleDelete(name: string) {
    try {
      const result = await deleteAirlineFn({ data: { name } })
      toast.success(result.message)
      await refreshAirlines()
    } catch {
      toast.error("Failed to delete airline. It may have dependent data.")
    }
  }

  const columns: Array<ColumnDef<AirlineRow>> = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
            aria-label={`Delete ${row.original.name}`}
            onClick={() =>
              deleteConfirm.requestDelete(row.original.name, () =>
                handleDelete(row.original.name)
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
        columns={columns}
        data={airlines}
        emptyMessage="No airlines."
        searchPlaceholder="Search airlines..."
        queryPrefix="airlines"
      />
    </div>
  )
}

