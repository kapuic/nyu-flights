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
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import { deleteCustomerFn } from "@/lib/queries"
import { staffCustomersQueryOptions } from "@/lib/staff-queries"

type CustomerRow = {
  city: string
  email: string
  name: string
  phone_number: string
}

export const Route = createFileRoute("/staff/_dashboard/manage-customers")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffCustomersQueryOptions())
  },
  component: ManageCustomersPage,
})

function ManageCustomersPage() {
  const { data: customers } = useSuspenseQuery(staffCustomersQueryOptions())
  const deleteConfirm = useDeleteConfirmation()
  const queryClient = useQueryClient()
  const router = useRouter()

  async function handleDelete(email: string) {
    try {
      const result = await deleteCustomerFn({ data: { email } })
      toast.success(result.message)
      await queryClient.invalidateQueries({ queryKey: ["staff-customers"] })
      await router.invalidate()
    } catch {
      toast.error("Failed to delete customer.")
    }
  }

  const columns: Array<ColumnDef<CustomerRow>> = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
      accessorKey: "city",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="City" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.city}</span>
      ),
    },
    {
      accessorKey: "phone_number",
      header: ({ column }) => (
        <DashboardDataTableColumnHeader column={column} title="Phone" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.phone_number}</span>
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
            aria-label={`Delete ${row.original.name}`}
            onClick={() =>
              deleteConfirm.requestDelete(row.original.email, () =>
                handleDelete(row.original.email)
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
        <h1 className="text-lg font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Manage customer accounts
        </p>
      </div>

      <DeleteConfirmation
        pending={deleteConfirm.pending}
        onClose={deleteConfirm.close}
      />

      <DashboardDataTable
        columns={columns}
        data={customers}
        emptyMessage="No customers."
        searchPlaceholder="Search customers..."
        queryPrefix="customers"
      />
    </div>
  )
}

