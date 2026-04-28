import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"

import type {DashboardDataTableFilterOption} from "@/components/dashboard-data-table";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader
  
} from "@/components/dashboard-data-table"
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

function getUniqueOptions(
  staff: Array<StaffRow>,
  valueKey: "airline_name" | "role"
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>()
  for (const member of staff) {
    const value =
      valueKey === "role" ? getStaffPermission(member.username) : member[valueKey]
    options.set(value, valueKey === "role" ? getRoleLabel(value) : value)
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort(
    (a, b) => a.label.localeCompare(b.label)
  )
}

function getRoleLabel(role: string) {
  if (role === "superadmin") return "Superadmin"
  if (role === "admin") return "Admin"
  return "Staff"
}

function ManageStaffPage() {
  const { data: staff } = useSuspenseQuery(staffMembersQueryOptions())
  const deleteConfirm = useDeleteConfirmation()
  const queryClient = useQueryClient()
  const router = useRouter()

  const refreshStaff = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-members"] })
    await router.invalidate()
  }, [queryClient, router])

  const deleteStaffMembers = useCallback(
    async (rows: Array<StaffRow>) => {
      try {
        await Promise.all(
          rows.map((member) =>
            deleteStaffFn({ data: { username: member.username } })
          )
        )
        toast.success(
          `Deleted ${rows.length} staff account${rows.length === 1 ? "" : "s"}.`
        )
        await refreshStaff()
      } catch {
        toast.error("Failed to delete staff members.")
      }
    },
    [refreshStaff]
  )

  const requestDeleteStaff = useCallback(
    (rows: Array<StaffRow>) => {
      const label =
        rows.length === 1 ? rows[0].username : `${rows.length} selected staff`
      deleteConfirm.requestDelete(label, () => void deleteStaffMembers(rows))
    },
    [deleteConfirm, deleteStaffMembers]
  )

  const columns = useMemo<Array<ColumnDef<StaffRow>>>(
    () => [
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
      filterFn: "arrIncludesSome",
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
      filterFn: "arrIncludesSome",
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
  ],
    []
  )

  const filterOptions = useMemo(
    () => [
      {
        columnId: "airline_name",
        label: "Airline",
        options: getUniqueOptions(staff, "airline_name"),
      },
      {
        columnId: "role",
        label: "Role",
        options: getUniqueOptions(staff, "role"),
      },
    ],
    [staff]
  )

  const tableActions = useMemo(
    () => [
      {
        label: "Delete staff",
        onSelect: requestDeleteStaff,
      },
    ],
    [requestDeleteStaff]
  )

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
        bulkActions={tableActions}
        columns={columns}
        data={staff}
        emptyMessage="No staff accounts."
        enableRowSelection
        filters={filterOptions}
        searchPlaceholder="Search staff..."
        queryPrefix="staff"
        rowActions={tableActions}
      />
    </div>
  )
}

