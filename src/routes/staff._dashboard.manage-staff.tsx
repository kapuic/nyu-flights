import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import { deleteStaffFn } from "@/lib/queries"
import { staffMembersQueryOptions } from "@/lib/staff-queries"
import { getStaffPermission } from "@/lib/staff-permissions"

type StaffRow = {
  airline_name: string
  email: string
  first_name: string
  last_name: string
  username: string
}

export const Route = createFileRoute("/staff/_dashboard/manage-staff")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffMembersQueryOptions())
  },
  component: ManageStaffPage,
})

function ManageStaffPage() {
  const { data: staff } = useSuspenseQuery(staffMembersQueryOptions())
  const deleteConfirm = useDeleteConfirmation()
  const queryClient = useQueryClient()
  const router = useRouter()

  async function handleDelete(username: string) {
    try {
      const result = await deleteStaffFn({ data: { username } })
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: ["staff-members"] })
      await router.invalidate()
    } catch {
      toast.error("Failed to delete staff member.")
    }
  }

  const columns: Array<ColumnDef<StaffRow>> = [
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Username" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.username}</span>
      ),
    },
    {
      id: "name",
      accessorFn: (row) => `${row.first_name} ${row.last_name}`,
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Name" />
      ),
    },
    {
      accessorKey: "airline_name",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Airline" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.airline_name}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      id: "role",
      accessorFn: (row) => getStaffPermission(row.username),
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const permission = getStaffPermission(row.original.username)
        if (permission === "staff") {
          return <span className="text-xs text-muted-foreground">Staff</span>
        }
        return (
          <Badge variant="secondary" className="text-xs capitalize">
            {permission}
          </Badge>
        )
      },
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
            aria-label={`Delete ${row.original.username}`}
            onClick={() =>
              deleteConfirm.requestDelete(row.original.username, () =>
                handleDelete(row.original.username)
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
      <div>
        <h1 className="text-lg font-semibold">Staff</h1>
        <p className="text-sm text-muted-foreground">
          Manage airline staff accounts
        </p>
      </div>

      <DeleteConfirmation
        pending={deleteConfirm.pending}
        onClose={deleteConfirm.close}
      />

      <DashboardDataTable
        columns={columns}
        data={staff}
        emptyMessage="No staff accounts."
        searchPlaceholder="Search staff..."
        queryPrefix="staff"
      />
    </div>
  )
}

