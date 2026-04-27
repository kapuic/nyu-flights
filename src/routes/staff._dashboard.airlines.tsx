import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ResponsiveModal } from "@/components/responsive-modal"
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import {
  listAllAirlinesFn,
  createAirlineFn,
  deleteAirlineFn,
} from "@/lib/queries"

export const Route = createFileRoute("/staff/_dashboard/airlines")({
  component: ManageAirlinesPage,
})

function ManageAirlinesPage() {
  const [airlines, setAirlines] = useState<Array<{ name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const deleteConfirm = useDeleteConfirmation()

  async function load() {
    try {
      const data = await listAllAirlinesFn()
      setAirlines(data)
    } catch {
      toast.error("Failed to load airlines.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const result = await createAirlineFn({ data: { name: newName } })
      toast.success(result.message)
      setNewName("")
      setCreateOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create airline.")
    }
  }

  async function handleDelete(name: string) {
    try {
      const result = await deleteAirlineFn({ data: { name } })
      toast.success(result.message)
      await load()
    } catch {
      toast.error("Failed to delete airline. It may have dependent data.")
    }
  }

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
          <Plus className="mr-1.5 size-4" />
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
                onChange={(e) => setNewName(e.target.value)}
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : airlines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  No airlines.
                </TableCell>
              </TableRow>
            ) : (
              airlines.map((a) => (
                <TableRow key={a.name}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteConfirm.requestDelete(a.name, () =>
                          handleDelete(a.name)
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
