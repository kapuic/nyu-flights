import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { useState } from "react"
import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ResponsiveModal } from "@/components/responsive-modal"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"
import { addAirplaneFn } from "@/lib/queries"

export const Route = createFileRoute("/staff/_dashboard/fleet")({
  component: StaffFleetPage,
})

function StaffFleetPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const queryClient = useQueryClient()
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      airplaneId: "",
      numberOfSeats: "",
      manufacturingCompany: "",
      manufacturingDate: "",
    },
    onSubmit: async ({ value }) => {
      const result = await addAirplaneFn({
        data: {
          airplaneId: value.airplaneId,
          numberOfSeats: Number(value.numberOfSeats),
          manufacturingCompany: value.manufacturingCompany,
          manufacturingDate: value.manufacturingDate,
        },
      })
      toast.success(result.message)
      form.reset()
      setCreateOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] })
      await router.invalidate()
    },
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add airplane.")
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Fleet</h1>
          <p className="text-sm text-muted-foreground">
            {data.airlineName} — {data.airplanes.length} aircraft
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Add
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add Airplane"
        description="Register a new aircraft in the fleet."
      >
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <form.Field name="airplaneId">
                    {(field) => (
                      <Field>
                        <FieldLabel>Airplane ID</FieldLabel>
                        <Input
                          placeholder="B737-001"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="numberOfSeats">
                    {(field) => (
                      <Field>
                        <FieldLabel>Number of Seats</FieldLabel>
                        <Input
                          type="number"
                          min="1"
                          required
                          placeholder="180"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="manufacturingCompany">
                    {(field) => (
                      <Field>
                        <FieldLabel>Manufacturer</FieldLabel>
                        <Input
                          placeholder="Boeing"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="manufacturingDate">
                    {(field) => (
                      <Field>
                        <FieldLabel>Manufacturing Date</FieldLabel>
                        <Input
                          type="date"
                          required
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>
                {error ? (
                  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Adding…" : "Add Airplane"}
                </Button>
              </FieldGroup>
            </form>
          )}
        </form.Subscribe>
      </ResponsiveModal>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Airplane ID</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead className="hidden sm:table-cell">Mfg. Date</TableHead>
              <TableHead className="text-right">Seats</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.airplanes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No aircraft registered.
                </TableCell>
              </TableRow>
            ) : (
              data.airplanes.map((airplane) => (
                <TableRow key={airplane.airplaneId}>
                  <TableCell className="font-medium">
                    {airplane.airplaneId}
                  </TableCell>
                  <TableCell>{airplane.manufacturingCompany}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {new Date(airplane.manufacturingDate).toLocaleDateString(
                      "en-US",
                      { year: "numeric", month: "short", day: "numeric" }
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {airplane.numberOfSeats}
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
