import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { AlertTriangleIcon, CircleCheckIcon, Clock, PlaneTakeoff, Ticket } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { DashboardDataTableFilterOption } from "@/components/dashboard-data-table";
import { CountryFlag } from "@/components/country-flag";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table";
import { Badge } from "@/components/ui/badge";
import { getAirportOption } from "@/lib/airports";
import { staffDashboardQueryOptions } from "@/lib/staff-queries";

type DashboardFlightRow = {
  airlineName: string;
  arrivalAirportCode: string;
  arrivalAirportName: string;
  arrivalCity: string;
  arrivalDatetime: string;
  departureAirportCode: string;
  departureAirportName: string;
  departureCity: string;
  departureDatetime: string;
  flightNumber: string;
  status: "on_time" | "delayed";
  ticketCount: number;
};

function getDashboardFlightRowId(flight: DashboardFlightRow) {
  return `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`;
}

export const Route = createFileRoute("/staff/_dashboard/")({
  component: StaffDashboardPage,
});

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getUniqueOptions(
  flights: Array<DashboardFlightRow>,
  valueKey: "airlineName" | "arrivalAirportCode" | "departureAirportCode" | "status",
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>();
  for (const flight of flights) {
    const value = flight[valueKey];
    options.set(value, getFilterOptionLabel(valueKey, value));
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getFilterOptionLabel(
  valueKey: "airlineName" | "arrivalAirportCode" | "departureAirportCode" | "status",
  value: string,
) {
  if (valueKey === "airlineName") return value;
  if (valueKey === "status") return value === "on_time" ? "On Time" : "Delayed";
  const airport = getAirportOption(value);
  return airport ? `${value} — ${airport.city}` : value;
}

function AirportCell({ code }: { code: string }) {
  const airport = getAirportOption(code);
  return (
    <div className="flex min-w-36 items-center gap-2">
      {airport ? <CountryFlag countryCode={airport.countryCode} size={18} /> : null}
      <div className="min-w-0">
        <div className="font-mono text-sm font-medium tracking-tight">{code}</div>
        <div className="truncate text-xs text-muted-foreground">
          {airport?.name ?? airport?.city ?? "Unknown airport"}
        </div>
      </div>
    </div>
  );
}

function FlightStatusBadge({ status }: { status: DashboardFlightRow["status"] }) {
  const isOnTime = status === "on_time";
  const Icon = isOnTime ? CircleCheckIcon : AlertTriangleIcon;
  return (
    <Badge variant={isOnTime ? "secondary" : "destructive"} className="text-xs">
      <Icon data-icon="inline-start" />
      {isOnTime ? "On Time" : "Delayed"}
    </Badge>
  );
}

function getDashboardExportValue(row: DashboardFlightRow, columnId: string) {
  if (columnId === "departureDatetime") return formatDateShort(row.departureDatetime);
  if (columnId === "arrivalDatetime") return formatDateShort(row.arrivalDatetime);
  if (columnId === "status") return row.status === "on_time" ? "On Time" : "Delayed";
  return undefined;
}

function StaffDashboardPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions());
  const showAirlineColumn = data.airlineName === "All airlines";

  const columns = useMemo<Array<ColumnDef<DashboardFlightRow>>>(
    () => [
      ...(showAirlineColumn
        ? [
            {
              accessorKey: "airlineName",
              filterFn: "arrIncludesSome",
              header: ({ column }) => (
                <DashboardDataTableColumnHeader column={column} title="Airline" />
              ),
              cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.airlineName}</span>
              ),
            } satisfies ColumnDef<DashboardFlightRow>,
          ]
        : []),
      {
        accessorKey: "flightNumber",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Flight" />,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-medium tracking-tight">
            {row.original.flightNumber}
          </span>
        ),
      },
      {
        accessorKey: "departureAirportCode",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="From" />,
        cell: ({ row }) => <AirportCell code={row.original.departureAirportCode} />,
      },
      {
        accessorKey: "arrivalAirportCode",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="To" />,
        cell: ({ row }) => <AirportCell code={row.original.arrivalAirportCode} />,
      },
      {
        accessorKey: "departureDatetime",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Departure" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateShort(row.original.departureDatetime)}
          </span>
        ),
      },
      {
        accessorKey: "arrivalDatetime",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Arrival" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateShort(row.original.arrivalDatetime)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => <FlightStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "ticketCount",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Tickets" className="ms-auto" />
        ),
        cell: ({ row }) => (
          <div className="text-right tabular-nums">{row.original.ticketCount}</div>
        ),
      },
    ],
    [showAirlineColumn],
  );

  const filterOptions = useMemo(
    () => [
      ...(showAirlineColumn
        ? [
            {
              columnId: "airlineName",
              label: "Airline",
              options: getUniqueOptions(data.flights, "airlineName"),
            },
          ]
        : []),
      {
        columnId: "departureAirportCode",
        label: "From",
        options: getUniqueOptions(data.flights, "departureAirportCode"),
      },
      {
        columnId: "arrivalAirportCode",
        label: "To",
        options: getUniqueOptions(data.flights, "arrivalAirportCode"),
      },
      {
        columnId: "status",
        label: "Status",
        options: getUniqueOptions(data.flights, "status"),
      },
    ],
    [data.flights, showAirlineColumn],
  );

  const onTimeCount = data.flights.filter((f) => f.status === "on_time").length;
  const delayedCount = data.flights.filter((f) => f.status === "delayed").length;
  const totalTickets = data.flights.reduce((sum, f) => sum + f.ticketCount, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">{data.airlineName} — next 30 days</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Flights"
          value={data.flights.length}
          icon={<PlaneTakeoff className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="On Time"
          value={onTimeCount}
          icon={<Clock className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Delayed"
          value={delayedCount}
          icon={<AlertTriangleIcon className="size-4 text-muted-foreground" />}
        />
        <StatCard
          label="Tickets Sold"
          value={totalTickets}
          icon={<Ticket className="size-4 text-muted-foreground" />}
        />
      </div>

      <DashboardDataTable
        columns={columns}
        data={data.flights}
        emptyMessage="No flights found."
        enableVirtualization
        exportOptions={{
          filename: "staff-dashboard-flights.csv",
          getValue: getDashboardExportValue,
        }}
        filters={filterOptions}
        getRowId={getDashboardFlightRowId}
        searchPlaceholder="Search flights..."
        queryPrefix="dashboard"
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
