import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { listAllCustomersFn, deleteCustomerFn } from "@/lib/queries"

export const Route = createFileRoute("/staff/_dashboard/manage-customers")({
  component: ManageCustomersPage,
})

function ManageCustomersPage() {
  const [customers, setCustomers] = useState<
    Array<{
      city: string
      email: string
      name: string
      phone_number: string
    }>
  >([])
  const [loading, setLoading] = useState(true)
  const deleteConfirm = useDeleteConfirmation()

  async function load() {
    try {
      const data = await listAllCustomersFn()
      setCustomers(data)
    } catch {
      toast.error("Failed to load customers.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(email: string) {
    try {
      const result = await deleteCustomerFn({ data: { email } })
      toast.success(result.message)
      await load()
    } catch {
      toast.error("Failed to delete customer.")
    }
  }

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">City</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No customers.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow key={c.email}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.email}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {c.city}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {c.phone_number}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteConfirm.requestDelete(c.email, () =>
                          handleDelete(c.email)
                        )
                      }
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
