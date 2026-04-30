import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { parseAsString, useQueryStates } from "nuqs";
import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CountryFlag } from "@/components/country-flag";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table";
import { staffDashboardQueryOptions, staffPassengersQueryOptions } from "@/lib/staff-queries";
import { formatDateTimeShort as formatTemporalDateTimeShort } from "@/lib/temporal";

type PassengerRow = {
  customerEmail: string;
  customerName: string;
  passportNumber: string;
  purchaseDatetime: string;
  ticketId: string;
};

function getPassengerRowId(passenger: PassengerRow) {
  return passenger.ticketId;
}

const passengerSearchParams = {
  flight: parseAsString.withDefault(""),
};
const passengerFlightFilters = {
  destination: "",
  endDate: "",
  source: "",
  startDate: "1900-01-01",
};

export const Route = createFileRoute("/staff/_dashboard/passengers")({
  component: StaffPassengersPage,
});

function formatDateShort(iso: string) {
  return formatTemporalDateTimeShort(iso);
}

function getFlightSelectionKey(flight: {
  airlineName: string;
  departureDatetime: string;
  flightNumber: string;
}) {
  return `${flight.airlineName}::${flight.flightNumber}::${flight.departureDatetime}`;
}
function getFlightSelectionLabel(flight: {
  airlineName: string;
  arrivalAirportCode: string;
  arrivalCountryCode: string;
  departureAirportCode: string;
  departureCountryCode: string;
  departureDatetime: string;
  flightNumber: string;
}) {
  return `${flight.airlineName} · ${flight.flightNumber} — ${flight.departureAirportCode} → ${flight.arrivalAirportCode} (${formatDateShort(flight.departureDatetime)})`;
}

function FlightSelectionOption({
  flight,
}: {
  flight: {
    airlineName: string;
    arrivalAirportCode: string;
    arrivalCountryCode: string;
    departureAirportCode: string;
    departureCountryCode: string;
    departureDatetime: string;
    flightNumber: string;
  };
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate">
        {flight.airlineName} · {flight.flightNumber}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1.5 text-muted-foreground">
        <CountryFlag countryCode={flight.departureCountryCode} size={16} />
        {flight.departureAirportCode}
        <span aria-hidden="true">→</span>
        {flight.arrivalAirportCode}
        <CountryFlag countryCode={flight.arrivalCountryCode} size={16} />
      </span>
      <span className="truncate text-muted-foreground">
        ({formatDateShort(flight.departureDatetime)})
      </span>
    </span>
  );
}

function getFlightSelectionSearchValue(flight: {
  airlineName: string;
  arrivalAirportCode: string;
  departureAirportCode: string;
  departureDatetime: string;
  flightNumber: string;
}) {
  return `${flight.airlineName} ${flight.flightNumber} ${flight.departureAirportCode} ${flight.arrivalAirportCode} ${formatDateShort(flight.departureDatetime)}`;
}
function getPassengerExportValue(passenger: PassengerRow, columnId: string) {
  if (columnId === "ticketId") return `#${passenger.ticketId}`;
  if (columnId === "purchaseDatetime") return formatDateShort(passenger.purchaseDatetime);
  return undefined;
}

function StaffPassengersPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions(passengerFlightFilters));
  const [{ flight: selectedFlightKey }, setSearchParams] = useQueryStates(passengerSearchParams);

  const selectedFlight = data.flights.find((f) => getFlightSelectionKey(f) === selectedFlightKey);

  const passengersQuery = useQuery({
    ...staffPassengersQueryOptions({
      airlineName: selectedFlight?.airlineName ?? "",
      departureDatetime: selectedFlight?.departureDatetime ?? "",
      flightNumber: selectedFlight?.flightNumber ?? "",
    }),
    enabled: !!selectedFlight,
  });

  const passengers = passengersQuery.data ?? [];
  const columns = useMemo<Array<ColumnDef<PassengerRow>>>(
    () => [
      {
        accessorKey: "ticketId",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Ticket" />,
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">#{row.original.ticketId}</span>
        ),
      },
      {
        accessorKey: "customerName",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Name" />,
      },
      {
        accessorKey: "customerEmail",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.customerEmail}</span>
        ),
      },
      {
        accessorKey: "passportNumber",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Passport" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.passportNumber}</span>
        ),
      },
      {
        accessorKey: "purchaseDatetime",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Purchased" />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateShort(row.original.purchaseDatetime)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Passengers</h1>
        <p className="text-sm text-muted-foreground">
          View passenger manifest for any flight in your staff scope
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="max-w-sm flex-1">
          <label className="mb-1.5 block text-sm font-medium">Flight</label>
          <Combobox
            items={data.flights}
            value={selectedFlight ?? null}
            itemToStringLabel={getFlightSelectionLabel}
            itemToStringValue={getFlightSelectionSearchValue}
            onValueChange={(flight) => {
              void setSearchParams({
                flight: flight ? getFlightSelectionKey(flight) : "",
              });
            }}
          >
            <ComboboxInput placeholder="Search flights" showClear className="w-full" />
            <ComboboxContent>
              <ComboboxEmpty>No flights found.</ComboboxEmpty>
              <ComboboxList>
                {(flight) => (
                  <ComboboxItem key={getFlightSelectionKey(flight)} value={flight}>
                    <FlightSelectionOption flight={flight} />
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>

      {!selectedFlight ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Select a flight to view its passenger manifest.
        </div>
      ) : passengersQuery.isError ? (
        <div className="rounded-md border bg-destructive/10 p-8 text-center text-sm text-destructive">
          Failed to load passengers. Try selecting the flight again.
        </div>
      ) : passengersQuery.isLoading ? (
        <div className="rounded-md border p-8 text-center text-muted-foreground">
          Loading passengers...
        </div>
      ) : (
        <>
          <DashboardDataTable
            columns={columns}
            data={passengers}
            emptyMessage="No passengers on this flight."
            enableVirtualization
            exportOptions={{
              filename: `passengers-${selectedFlight.flightNumber}.csv`,
              getValue: getPassengerExportValue,
            }}
            getRowId={getPassengerRowId}
            searchPlaceholder="Search passengers..."
            queryPrefix="passengers"
          />
          <div className="rounded-md border px-4 py-2 text-xs text-muted-foreground">
            {passengers.length} passenger{passengers.length !== 1 ? "s" : ""} ·{" "}
            {selectedFlight.availableSeats} seat
            {selectedFlight.availableSeats !== 1 ? "s" : ""} remaining
          </div>
        </>
      )}
    </div>
  );
}
