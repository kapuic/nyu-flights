import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { DatePickerField } from "@/components/date-time-picker";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { staffDashboardQueryOptions, staffReportQueryOptions } from "@/lib/staff-queries";

type RatingRow = {
  airlineName: string;
  averageRating: number | null;
  comments: Array<{ comment: string | null; rating: number }>;
  departureDatetime: string;
  flightNumber: string;
  reviewCount: number;
};

function getRatingRowId(rating: RatingRow) {
  return `${rating.airlineName}:${rating.flightNumber}:${rating.departureDatetime}`;
}
function getRatingExportValue(rating: RatingRow, columnId: string) {
  if (columnId === "averageRating") return rating.averageRating?.toFixed(1) ?? "";
  if (columnId === "comments")
    return rating.comments
      .map((comment) => `${comment.rating}/5 ${comment.comment ?? "No comment"}`)
      .join("; ");
  return undefined;
}

export const Route = createFileRoute("/staff/_dashboard/reports")({
  component: StaffReportsPage,
});

function StaffReportsPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions());

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportError, setReportError] = useState<string | null>(null);
  const [queryRange, setQueryRange] = useState<{
    endDate: string;
    startDate: string;
  } | null>(null);

  const reportQuery = useQuery({
    ...staffReportQueryOptions({
      endDate: queryRange?.endDate ?? "",
      startDate: queryRange?.startDate ?? "",
    }),
    enabled: !!queryRange,
  });

  function handleReportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setReportError(null);
    if (startDate && endDate) {
      if (startDate > endDate) {
        setReportError("Start date must be on or before end date.");
        setQueryRange(null);
        return;
      }
      setQueryRange({ startDate, endDate });
    }
  }

  const maxBarValue = Math.max(...data.monthlySales.map((month) => month.ticketsSold), 1);

  const ratedFlights = useMemo(
    () => data.ratings.filter((rating) => rating.reviewCount > 0),
    [data.ratings],
  );
  const columns = useMemo<Array<ColumnDef<RatingRow>>>(
    () => [
      {
        accessorKey: "flightNumber",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Flight" />,
        cell: ({ row }) => <span className="font-medium">{row.original.flightNumber}</span>,
      },
      {
        accessorKey: "averageRating",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Rating" />,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star className="size-3.5 fill-current text-amber-500" />
            {row.original.averageRating?.toFixed(1) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "reviewCount",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Reviews" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground tabular-nums">
            {row.original.reviewCount}
          </span>
        ),
      },
      {
        id: "comments",
        accessorFn: (row) =>
          row.comments.map((comment) => `${comment.rating} ${comment.comment ?? ""}`).join(" "),
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Comments" />,
        cell: ({ row }) => {
          if (row.original.comments.length === 0)
            return <span className="text-sm text-muted-foreground">—</span>;

          return (
            <div className="flex max-w-xs flex-col gap-1">
              {row.original.comments.slice(0, 3).map((comment) => (
                <span
                  key={`${comment.rating}:${comment.comment}`}
                  className="truncate text-sm text-muted-foreground"
                >
                  <span className="font-medium tabular-nums text-foreground">
                    {comment.rating}/5
                  </span>{" "}
                  {comment.comment ? `“${comment.comment}”` : "No comment"}
                </span>
              ))}
              {row.original.comments.length > 3 ? (
                <span className="text-xs text-muted-foreground">
                  +{row.original.comments.length - 3} more
                </span>
              ) : null}
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sales data, monthly trends, and flight ratings
        </p>
      </div>

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
                <p className="text-sm text-destructive">Failed to load report.</p>
              ) : reportQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : reportQuery.data ? (
                <div className="rounded-md border bg-muted/50 px-4 py-3">
                  {"error" in reportQuery.data && reportQuery.data.error ? (
                    <p className="text-sm text-destructive">{reportQuery.data.error}</p>
                  ) : (
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">
                        {reportQuery.data.ticketsSold}
                      </span>{" "}
                      ticket{reportQuery.data.ticketsSold !== 1 ? "s" : ""} sold between{" "}
                      {reportQuery.data.startDate} and {reportQuery.data.endDate}
                    </p>
                  )}
                </div>
              ) : null}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-medium">Monthly Ticket Sales</h2>
        {data.monthlySales.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-muted-foreground">
            No sales data available.
          </div>
        ) : (
          <div className="rounded-md border p-4">
            <div className="flex items-end gap-1.5" style={{ height: 160 }}>
              {data.monthlySales.map((month) => {
                const percentage = (month.ticketsSold / maxBarValue) * 100;
                return (
                  <div
                    key={month.month}
                    className="group relative flex flex-1 flex-col items-center"
                  >
                    <div
                      className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                      style={{
                        height: `${Math.max(percentage, 2)}%`,
                        minHeight: 2,
                      }}
                    />
                    <span className="mt-1.5 text-[10px] text-muted-foreground">
                      {month.month.slice(5)}
                    </span>
                    <div className="absolute -top-6 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] font-medium shadow group-hover:block">
                      {month.ticketsSold}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Flight Ratings</h2>
        <DashboardDataTable
          columns={columns}
          data={ratedFlights}
          emptyMessage="No ratings yet."
          enableVirtualization
          exportOptions={{
            filename: "flight-ratings.csv",
            getValue: getRatingExportValue,
          }}
          getRowId={getRatingRowId}
          searchPlaceholder="Search ratings..."
          queryPrefix="ratings"
        />
      </div>
    </div>
  );
}
