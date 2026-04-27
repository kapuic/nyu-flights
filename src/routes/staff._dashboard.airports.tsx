import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

import { AirportComboboxField } from "@/components/combobox-fields"
import {
  DeleteConfirmation,
  useDeleteConfirmation,
} from "@/components/delete-confirmation"
import { ResponsiveModal } from "@/components/responsive-modal"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { REAL_AIRPORT_OPTIONS, getAirportOption } from "@/lib/airports"
import {
  createAirportFn,
  deleteAirportFn,
  listAllAirportsFn,
} from "@/lib/queries"

export const Route = createFileRoute("/staff/_dashboard/airports")({
  component: ManageAirportsPage,
})

function ManageAirportsPage() {
  const [airports, setAirports] = useState<
    Array<{ airport_type: string; city: string; code: string; country: string }>
  >([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedAirportCode, setSelectedAirportCode] = useState("")
  const [airportType, setAirportType] = useState("")
  const [error, setError] = useState<string | null>(null)
  const deleteConfirm = useDeleteConfirmation()

  async function load() {
    try {
      const data = await listAllAirportsFn()
      setAirports(data)
    } catch {
      toast.error("Failed to load airports.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const selectedAirport = getAirportOption(selectedAirportCode)
      if (!selectedAirport) {
        setError("Choose a real airport from the list.")
        return
      }

      const result = await createAirportFn({
        data: {
          code: selectedAirport.code,
          city: selectedAirport.city,
          country: selectedAirport.country,
          airportType: airportType.toLowerCase(),
        },
      })
      toast.success(result.message)
      setSelectedAirportCode("")
      setAirportType("")
      setCreateOpen(false)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create airport.")
    }
  }

  async function handleDelete(airportCode: string) {
    try {
      const result = await deleteAirportFn({ data: { code: airportCode } })
      toast.success(result.message)
      await load()
    } catch {
      toast.error("Failed to delete airport. It may have dependent flights.")
    }
  }

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
          <Plus className="mr-1.5 size-4" />
          Create
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Airport"
        description="Add a real-world airport to the system."
      >
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
                  onValueChange={(v) => setAirportType(v ?? "")}
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="hidden sm:table-cell">Country</TableHead>
              <TableHead className="hidden md:table-cell">Type</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : airports.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No airports.
                </TableCell>
              </TableRow>
            ) : (
              airports.map((a) => (
                <TableRow key={a.code}>
                  <TableCell className="font-medium">{a.code}</TableCell>
                  <TableCell>{a.city}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {a.country}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground capitalize md:table-cell">
                    {a.airport_type}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        deleteConfirm.requestDelete(a.code, () =>
                          handleDelete(a.code)
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
