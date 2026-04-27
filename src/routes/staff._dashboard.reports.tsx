import { createFileRoute } from "@tanstack/react-router"
import { useSuspenseQuery, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { Star } from "lucide-react"

import { DatePickerField } from "@/components/date-time-picker"
import { Button } from "@/components/ui/button"

import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  staffDashboardQueryOptions,
  staffReportQueryOptions,
} from "@/lib/staff-queries"

export const Route = createFileRoute("/staff/_dashboard/reports")({
  component: StaffReportsPage,
})

function StaffReportsPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reportError, setReportError] = useState<string | null>(null)
  const [queryRange, setQueryRange] = useState<{
    endDate: string
    startDate: string
  } | null>(null)

  const reportQuery = useQuery({
    ...staffReportQueryOptions({
      startDate: queryRange?.startDate ?? "",
      endDate: queryRange?.endDate ?? "",
    }),
    enabled: !!queryRange,
  })

  function handleReportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReportError(null)
    if (startDate && endDate) {
      if (new Date(startDate) > new Date(endDate)) {
        setReportError("Start date must be on or before end date.")
        setQueryRange(null)
        return
      }
      setQueryRange({ startDate, endDate })
    }
  }

  const maxBarValue = Math.max(
    ...data.monthlySales.map((m) => m.ticketsSold),
    1
  )

  const ratedFlights = data.ratings.filter((r) => r.reviewCount > 0)

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sales data, monthly trends, and flight ratings
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-3">
          <span className="text-xs text-muted-foreground">Total Tickets</span>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.reportSummary.totalTickets}
          </p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <span className="text-xs text-muted-foreground">Last Month</span>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.reportSummary.lastMonthTickets}
          </p>
        </div>
        <div className="rounded-md border bg-card p-3">
          <span className="text-xs text-muted-foreground">Last Year</span>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {data.reportSummary.lastYearTickets}
          </p>
        </div>
      </div>

      {/* Date range report */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleReportSubmit}>
            <FieldGroup>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field>
                  <FieldLabel>Start Date</FieldLabel>
                  <DatePickerField
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Pick start date"
                  />
                </Field>
                <Field>
                  <FieldLabel>End Date</FieldLabel>
                  <DatePickerField
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Pick end date"
                  />
                </Field>
                <Button type="submit">Query</Button>
              </div>
              {reportError ? (
                <p className="text-sm text-destructive">{reportError}</p>
              ) : reportQuery.isError ? (
                <p className="text-sm text-destructive">
                  Failed to load report.
                </p>
              ) : reportQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : reportQuery.data ? (
                <div className="rounded-md border bg-muted/50 px-4 py-3">
                  {"error" in reportQuery.data && reportQuery.data.error ? (
                    <p className="text-sm text-destructive">
                      {reportQuery.data.error}
                    </p>
                  ) : (
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">
                        {reportQuery.data.ticketsSold}
                      </span>{" "}
                      ticket{reportQuery.data.ticketsSold !== 1 ? "s" : ""} sold
                      between {reportQuery.data.startDate} and{" "}
                      {reportQuery.data.endDate}
                    </p>
                  )}
                </div>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* Monthly sales chart */}
      <div>
        <h2 className="mb-3 text-sm font-medium">Monthly Ticket Sales</h2>
        {data.monthlySales.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No sales data available.
          </div>
        ) : (
          <div className="rounded-md border p-4">
            <div className="flex items-end gap-1.5" style={{ height: 160 }}>
              {data.monthlySales.map((m) => {
                const pct = (m.ticketsSold / maxBarValue) * 100
                return (
                  <div
                    key={m.month}
                    className="group relative flex flex-1 flex-col items-center"
                  >
                    <div
                      className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        minHeight: 2,
                      }}
                    />
                    <span className="mt-1.5 text-[10px] text-muted-foreground">
                      {m.month.slice(5)}
                    </span>
                    <div className="absolute -top-6 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium shadow group-hover:block">
                      {m.ticketsSold}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ratings */}
      <div>
        <h2 className="mb-3 text-sm font-medium">Flight Ratings</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flight</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="hidden sm:table-cell">Reviews</TableHead>
                <TableHead className="hidden md:table-cell">Comments</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ratedFlights.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No ratings yet.
                  </TableCell>
                </TableRow>
              ) : (
                ratedFlights.map((r) => (
                  <TableRow key={`${r.flightNumber}-${r.departureDatetime}`}>
                    <TableCell className="font-medium">
                      {r.flightNumber}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Star className="size-3.5 fill-current text-amber-500" />
                        {r.averageRating?.toFixed(1) ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground tabular-nums sm:table-cell">
                      {r.reviewCount}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.comments.length > 0 ? (
                        <ul className="space-y-1">
                          {r.comments.slice(0, 3).map((c, i) => (
                            <li
                              key={i}
                              className="max-w-xs truncate text-sm text-muted-foreground"
                            >
                              "{c}"
                            </li>
                          ))}
                          {r.comments.length > 3 ? (
                            <li className="text-xs text-muted-foreground">
                              +{r.comments.length - 3} more
                            </li>
                          ) : null}
                        </ul>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
