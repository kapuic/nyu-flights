import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import { listAllStaffFn, deleteStaffFn } from "@/lib/queries"
import { getStaffPermission } from "@/lib/staff-permissions"

export const Route = createFileRoute("/staff/_dashboard/manage-staff")({
  component: ManageStaffPage,
})

function ManageStaffPage() {
  const [staff, setStaff] = useState<
    Array<{
      airline_name: string
      email: string
      first_name: string
      last_name: string
      username: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const deleteConfirm = useDeleteConfirmation()

  async function load() {
    try {
      const data = await listAllStaffFn()
      setStaff(data)
    } catch {
      toast.error("Failed to load staff.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(username: string) {
    try {
      const result = await deleteStaffFn({ data: { username } })
      toast.success(result.message)
      await load()
    } catch {
      toast.error("Failed to delete staff member.")
    }
  }

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Airline</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Role</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No staff accounts.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((s) => {
                const perm = getStaffPermission(s.username)
                return (
                  <TableRow key={s.username}>
                    <TableCell className="font-medium">{s.username}</TableCell>
                    <TableCell>
                      {s.first_name} {s.last_name}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {s.airline_name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {s.email}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {perm !== "staff" ? (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {perm}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Staff</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          deleteConfirm.requestDelete(s.username, () =>
                            handleDelete(s.username)
                          )
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
