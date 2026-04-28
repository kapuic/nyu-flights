import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { parseAsString, useQueryStates } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangleIcon, CircleCheckIcon, Plus, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";

import type { DashboardDataTableFilterOption } from "@/components/dashboard-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/country-flag";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
  DashboardDataTableInlineComboboxCell,
  DashboardDataTableInlineDateTimeCell,
  DashboardDataTableInlineSelectCell,
  DashboardDataTableInlineTextCell,
} from "@/components/dashboard-data-table";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  AirlineComboboxField,
  AirplaneComboboxField,
  AirportComboboxField,
} from "@/components/combobox-fields";
import { DateTimePickerField } from "@/components/date-time-picker";
import { DeleteConfirmation, useDeleteConfirmation } from "@/components/delete-confirmation";
import { DialogGlobe } from "@/components/dialog-globe";
import { ResponsiveModal } from "@/components/responsive-modal";
import { isAdminOrAbove } from "@/lib/staff-permissions";
import { createFlightSchema } from "@/lib/schemas";
import { formatDateTimeShort as formatTemporalDateTimeShort } from "@/lib/temporal";
import { staffDashboardQueryOptions } from "@/lib/staff-queries";
import { getAirportOption } from "@/lib/airports";
import {
  createFlightFn,
  deleteFlightFn,
  listDbAirportsFn,
  listReferenceDataFn,
  updateFlightFieldFn,
} from "@/lib/queries";


type EditableFlightField =
  | "airplaneId"
  | "arrivalAirportCode"
  | "arrivalDatetime"
  | "basePrice"
  | "departureAirportCode"
  | "departureDatetime"
  | "status";

type FlightRow = {
  airlineName: string;
  airplaneId: string;
  arrivalAirportCode: string;
  arrivalAirportName: string;
  arrivalCity: string;
  arrivalDatetime: string;
  averageRating: number | null;
  availableSeats: number;
  basePrice: number;
  departureAirportCode: string;
  departureAirportName: string;
  departureCity: string;
  departureDatetime: string;
  flightNumber: string;
  reviewCount: number;
  status: "on_time" | "delayed";
  ticketCount: number;
};

function shouldShowFieldError(
  meta: { isTouched: boolean; isValid: boolean },
  submissionAttempts: number,
) {
  return (meta.isTouched || submissionAttempts > 0) && !meta.isValid;
}
type FormErrorMap = {
  fields: Record<string, string>;
  form: string | null;
};

function getFormErrorsFromIssues(issues: Array<z.core.$ZodIssue>): FormErrorMap {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const [path] = issue.path;
    if (typeof path === "string" && !fields[path]) fields[path] = issue.message;
  }

  return {
    fields,
    form: issues.find((issue) => issue.path.length === 0)?.message ?? null,
  };
}

function getSchemaErrors<T>(schema: z.ZodType<T>, value: unknown): FormErrorMap | null {
  const parsed = schema.safeParse(value);
  if (parsed.success) return null;
  return getFormErrorsFromIssues(parsed.error.issues);
}

function getMutationError(result: unknown) {
  if (result && typeof result === "object" && "error" in result && result.error) {
    return String(result.error);
  }

  return null;
}

function getFieldErrorMessage(errors: Array<unknown>) {
  return errors
    .map((error) => (typeof error === "string" ? error : (error as { message: string }).message))
    .find(Boolean);
}

function getFormErrorMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "form" in error) {
    const formError = (error as { form?: unknown }).form;
    return typeof formError === "string" ? formError : null;
  }

  return null;
}

export const Route = createFileRoute("/staff/_dashboard/flights")({
  component: StaffFlightsPage,
});

const staffDashboardRoute = getRouteApi("/staff/_dashboard");
const flightFilterSearchParams = {
  destination: parseAsString.withDefault(""),
  endDate: parseAsString.withDefault(""),
  source: parseAsString.withDefault(""),
  startDate: parseAsString.withDefault(""),
};
const flightStatusOptions: Array<{ label: string; value: FlightRow["status"] }> = [
  { label: "On Time", value: "on_time" },
  { label: "Delayed", value: "delayed" },
];

function formatDateShort(iso: string) {
  return formatTemporalDateTimeShort(iso);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatRating(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(1);
}
function getStatusLabel(status: FlightRow["status"]) {
  return status === "on_time" ? "On Time" : "Delayed";
}

function getAirportDisplayLabel(value: string) {
  const airport = getAirportOption(value);
  return airport ? `${value} (${airport.city})` : value;
}

function getFlightRowId(flight: FlightRow) {
  return `${flight.airlineName}:${flight.flightNumber}:${flight.departureDatetime}`;
}

function getUniqueOptions(
  flights: Array<FlightRow>,
  valueKey: "airlineName" | "airplaneId" | "arrivalAirportCode" | "departureAirportCode" | "status",
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
  valueKey: "airlineName" | "airplaneId" | "arrivalAirportCode" | "departureAirportCode" | "status",
  value: string,
) {
  if (valueKey === "status") return getStatusLabel(value as FlightRow["status"]);
  if (valueKey === "airlineName") return value;
  if (valueKey === "airplaneId") return `Aircraft ${value}`;
  return getAirportDisplayLabel(value);
}
function getFlightExportValue(flight: FlightRow, columnId: string) {
  if (columnId === "departureAirportCode")
    return getAirportDisplayLabel(flight.departureAirportCode);
  if (columnId === "arrivalAirportCode") return getAirportDisplayLabel(flight.arrivalAirportCode);
  if (columnId === "departureDatetime") return formatDateShort(flight.departureDatetime);
  if (columnId === "arrivalDatetime") return formatDateShort(flight.arrivalDatetime);
  if (columnId === "status") return getStatusLabel(flight.status);
  if (columnId === "basePrice") return formatCurrency(flight.basePrice);
  if (columnId === "averageRating") return formatRating(flight.averageRating);
  return undefined;
}

function AirportCell({ code }: { code: string }) {
  const airport = getAirportOption(code);
  return (
    <div className="flex min-w-52 items-center justify-start gap-2 text-left">
      {airport ? <CountryFlag countryCode={airport.countryCode} size={18} /> : null}
      <div className="min-w-0">
        <div className="font-mono text-sm font-medium tracking-tight text-left">{code}</div>
        <div className="truncate text-xs text-muted-foreground">
          {airport?.name ?? airport?.city ?? "Unknown airport"}
        </div>
      </div>
    </div>
  );
}

function FlightStatusBadge({ status }: { status: FlightRow["status"] }) {
  const isOnTime = status === "on_time";
  const Icon = isOnTime ? CircleCheckIcon : AlertTriangleIcon;
  return (
    <Badge variant={isOnTime ? "secondary" : "destructive"} className="text-xs">
      <Icon data-icon="inline-start" />
      {isOnTime ? "On Time" : "Delayed"}
    </Badge>
  );
}

function FlightGlobe({
  departureCode,
  arrivalCode,
}: {
  arrivalCode: string;
  departureCode: string;
}) {
  const depAirport = getAirportOption(departureCode);
  const arrAirport = getAirportOption(arrivalCode);

  const globeMarkers = useMemo(() => {
    const m: Array<{
      id: string;
      countryCode: string;
      label: string;
      location: [number, number];
    }> = [];
    if (depAirport)
      m.push({
        id: `dep-${depAirport.code.toLowerCase()}`,
        countryCode: depAirport.countryCode,
        label: `${depAirport.city} (${depAirport.code})`,
        location: [depAirport.lat, depAirport.lng],
      });
    if (arrAirport)
      m.push({
        id: `arr-${arrAirport.code.toLowerCase()}`,
        countryCode: arrAirport.countryCode,
        label: `${arrAirport.city} (${arrAirport.code})`,
        location: [arrAirport.lat, arrAirport.lng],
      });
    return m;
  }, [depAirport, arrAirport]);

  const globeArcs = useMemo(() => {
    if (!depAirport || !arrAirport) return [];
    return [
      {
        from: [depAirport.lat, depAirport.lng] as [number, number],
        to: [arrAirport.lat, arrAirport.lng] as [number, number],
      },
    ];
  }, [depAirport, arrAirport]);

  return (
    <div className="-mx-6 -mt-2">
      <DialogGlobe markers={globeMarkers} arcs={globeArcs} />
    </div>
  );
}

const AIRPORT_COMBOBOX_ITEM_LABEL = (airport: { city: string; code: string }) =>
  getAirportDisplayLabel(airport.code);
const AIRPORT_COMBOBOX_ITEM_VALUE = (airport: { city: string; code: string }) =>
  `${airport.code} ${airport.city}`;

function AircraftCell({ airplaneId }: { airplaneId: string }) {
  return <span className="font-mono text-sm text-muted-foreground">{airplaneId}</span>;
}

function AirplaneOptionCell(airplane: {
  airplaneId: string;
  manufacturingCompany?: string;
  numberOfSeats: number;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate font-mono text-sm font-medium">{airplane.airplaneId}</span>
      <span className="truncate text-xs text-muted-foreground">
        {airplane.manufacturingCompany ? `${airplane.manufacturingCompany} · ` : ""}
        {airplane.numberOfSeats} seats
      </span>
    </span>
  );
}

function StaffFlightsPage() {
  const [flightFilters, setFlightFilters] = useQueryStates(flightFilterSearchParams, {
    history: "replace",
    urlKeys: {
      destination: "flightsDestination",
      endDate: "flightsEndDate",
      source: "flightsSource",
      startDate: "flightsStartDate",
    },
  });
  const { data } = useSuspenseQuery(staffDashboardQueryOptions(flightFilters));
  const { currentUser } = staffDashboardRoute.useLoaderData();
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleteConfirmation = useDeleteConfirmation();
  const showAirlineColumn = isAdminOrAbove(currentUser.staffPermission ?? "staff");
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dbAirportsQuery = useQuery({
    queryKey: ["db-airports"],
    queryFn: () => listDbAirportsFn(),
    staleTime: 5 * 60 * 1000,
  });
  const referenceDataQuery = useQuery({
    queryKey: ["reference-data"],
    queryFn: () => listReferenceDataFn(),
    staleTime: 5 * 60 * 1000,
  });
  const dbAirports = dbAirportsQuery.data ?? [];
  const airlineOptions = referenceDataQuery.data?.airlines ?? [];

  const form = useForm({
    defaultValues: {
      airlineName: "",
      flightNumber: "",
      departureAirportCode: "",
      arrivalAirportCode: "",
      departureDatetime: "",
      arrivalDatetime: "",
      basePrice: "",
      airplaneId: "",
    },
    validators: {
      onSubmit: ({ value }) => getSchemaErrors(createFlightSchema, value),
    },
    onSubmit: async ({ value }) => {
      const result = await createFlightFn({
        data: {
          ...value,
          airlineName: value.airlineName,
          basePrice: Number(value.basePrice),
        },
      });
      const mutationError = getMutationError(result);
      if (mutationError) throw new Error(mutationError);
      toast.success(result.message);
      form.reset();
      setCreateOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
      await router.invalidate();
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await form.handleSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flight.");
    }
  }
  const saveFlightField = useCallback(
    async <TField extends EditableFlightField>(
      flight: FlightRow,
      field: TField,
      value: TField extends "basePrice" ? number : string,
    ) => {
      if (flight[field] === value) return;

      const result = await updateFlightFieldFn({
        data: {
          airlineName: flight.airlineName,
          departureDatetime: flight.departureDatetime,
          field,
          flightNumber: flight.flightNumber,
          value,
        },
      });
      if ("error" in result && result.error) throw new Error(result.error);

      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-passengers"] });
      await router.invalidate();
    },
    [queryClient, router],
  );

  async function saveFlightStatus(flight: FlightRow, status: FlightRow["status"]) {
    await saveFlightField(flight, "status", status);
  }

  async function handleStatusToggle(flight: FlightRow) {
    try {
      const newStatus = flight.status === "on_time" ? "delayed" : "on_time";
      await saveFlightStatus(flight, newStatus);
    } catch {
      toast.error("Failed to update flight status.");
    }
  }

  async function deleteFlights(rows: Array<FlightRow>) {
    try {
      const results = await Promise.all(
        rows.map((flight) =>
          deleteFlightFn({
            data: {
              airlineName: flight.airlineName,
              departureDatetime: flight.departureDatetime,
              flightNumber: flight.flightNumber,
            },
          }),
        ),
      );
      const failed = results.find((result) => "error" in result && result.error);
      if (failed && "error" in failed) {
        toast.error(failed.error);
        return;
      }

      toast.success(`Deleted ${rows.length} flight${rows.length === 1 ? "" : "s"}.`);
      await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-passengers"] });
      await router.invalidate();
    } catch {
      toast.error("Failed to delete selected flights.");
    }
  }

  function requestDeleteFlights(rows: Array<FlightRow>) {
    const label =
      rows.length === 1 ? `flight ${rows[0].flightNumber}` : `${rows.length} selected flights`;
    deleteConfirmation.requestDelete(label, () => void deleteFlights(rows));
  }

  async function handleBulkStatusUpdate(rows: Array<FlightRow>, status: FlightRow["status"]) {
    const flightsToUpdate = rows.filter((flight) => flight.status !== status);
    if (!flightsToUpdate.length) {
      toast.info("Selected flights already have that status.");
      return;
    }

    try {
      await Promise.all(flightsToUpdate.map((flight) => saveFlightStatus(flight, status)));
      toast.success(
        `Updated ${flightsToUpdate.length} flight${flightsToUpdate.length === 1 ? "" : "s"}.`,
      );
    } catch {
      toast.error("Failed to update selected flights.");
    }
  }

  const columns = useMemo<Array<ColumnDef<FlightRow>>>(() => {
    const airlineColumn: ColumnDef<FlightRow> = {
      accessorKey: "airlineName",
      filterFn: "arrIncludesSome",
      header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Airline" />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.airlineName}</span>
      ),
    };

    return [
      ...(showAirlineColumn ? [airlineColumn] : []),
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
        cell: ({ row }) => (
          <DashboardDataTableInlineComboboxCell
            ariaLabel={`Update ${row.original.flightNumber} departure airport`}
            className="min-w-56"
            getItemKey={(airport) => airport.code}
            itemToStringLabel={AIRPORT_COMBOBOX_ITEM_LABEL}
            itemToStringValue={AIRPORT_COMBOBOX_ITEM_VALUE}
            items={dbAirports}
            onSave={(code) => saveFlightField(row.original, "departureAirportCode", code)}
            placeholder="Search departure airport"
            renderItem={(airport) => <AirportCell code={airport.code} />}
            renderValue={(code) => <AirportCell code={code} />}
            value={row.original.departureAirportCode}
            valueFromItem={(airport) => airport.code}
          />
        ),
      },
      {
        accessorKey: "arrivalAirportCode",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="To" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineComboboxCell
            ariaLabel={`Update ${row.original.flightNumber} arrival airport`}
            className="min-w-56"
            getItemKey={(airport) => airport.code}
            itemToStringLabel={AIRPORT_COMBOBOX_ITEM_LABEL}
            itemToStringValue={AIRPORT_COMBOBOX_ITEM_VALUE}
            items={dbAirports}
            onSave={(code) => saveFlightField(row.original, "arrivalAirportCode", code)}
            placeholder="Search arrival airport"
            renderItem={(airport) => <AirportCell code={airport.code} />}
            renderValue={(code) => <AirportCell code={code} />}
            value={row.original.arrivalAirportCode}
            valueFromItem={(airport) => airport.code}
          />
        ),
      },
      {
        accessorKey: "departureDatetime",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Departure" />
        ),
        cell: ({ row }) => (
          <DashboardDataTableInlineDateTimeCell
            ariaLabel={`Update ${row.original.flightNumber} departure time`}
            formatValue={formatDateShort}
            onSave={(value) => saveFlightField(row.original, "departureDatetime", value)}
            value={row.original.departureDatetime}
          />
        ),
      },
      {
        accessorKey: "arrivalDatetime",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Arrival" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineDateTimeCell
            ariaLabel={`Update ${row.original.flightNumber} arrival time`}
            formatValue={formatDateShort}
            onSave={(value) => saveFlightField(row.original, "arrivalDatetime", value)}
            value={row.original.arrivalDatetime}
          />
        ),
      },
      {
        accessorKey: "status",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineSelectCell
            ariaLabel={`Update ${row.original.flightNumber} status`}
            onSave={(status) => saveFlightStatus(row.original, status)}
            options={flightStatusOptions}
            renderValue={(status: FlightRow["status"]) => <FlightStatusBadge status={status} />}
            value={row.original.status}
          />
        ),
      },
      {
        accessorKey: "airplaneId",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Aircraft" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineComboboxCell
            ariaLabel={`Update ${row.original.flightNumber} aircraft`}
            getItemKey={(airplane) => `${airplane.airlineName}:${airplane.airplaneId}`}
            itemToStringLabel={(airplane) =>
              `${airplane.airplaneId} (${airplane.manufacturingCompany}, ${airplane.numberOfSeats} seats)`
            }
            itemToStringValue={(airplane) =>
              `${airplane.airplaneId} ${airplane.manufacturingCompany} ${airplane.numberOfSeats} seats`
            }
            items={data.airplanes.filter(
              (airplane) => airplane.airlineName === row.original.airlineName,
            )}
            onSave={(airplaneId) => saveFlightField(row.original, "airplaneId", airplaneId)}
            placeholder="Search aircraft"
            renderItem={AirplaneOptionCell}
            renderValue={(airplaneId) => <AircraftCell airplaneId={airplaneId} />}
            value={row.original.airplaneId}
            valueFromItem={(airplane) => airplane.airplaneId}
          />
        ),
      },
      {
        accessorKey: "basePrice",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Price" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update ${row.original.flightNumber} base price`}
            className="items-end"
            formatValue={(value) => (
              <span className="text-right text-sm tabular-nums">
                {formatCurrency(Number(value))}
              </span>
            )}
            inputMode="decimal"
            onSave={(value) => saveFlightField(row.original, "basePrice", Number(value))}
            type="number"
            value={String(row.original.basePrice)}
          />
        ),
      },
      {
        accessorKey: "availableSeats",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Seats" />,
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">{row.original.availableSeats}</div>
        ),
      },
      {
        accessorKey: "ticketCount",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Tickets" />,
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">{row.original.ticketCount}</div>
        ),
      },
      {
        accessorKey: "averageRating",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Rating" />,
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">
            {formatRating(row.original.averageRating)}
          </div>
        ),
      },
      {
        accessorKey: "reviewCount",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Reviews" />,
        cell: ({ row }) => (
          <div className="text-right text-sm tabular-nums">{row.original.reviewCount}</div>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => handleStatusToggle(row.original)}>
              {row.original.status === "on_time" ? "Mark Delayed" : "Mark On Time"}
            </Button>
            <Button
              aria-label={`Delete flight ${row.original.flightNumber}`}
              variant="destructive"
              size="icon-sm"
              onClick={() => requestDeleteFlights([row.original])}
            >
              <Trash2Icon />
            </Button>
          </div>
        ),
      },
    ];
  }, [
    data.airplanes,
    handleStatusToggle,
    requestDeleteFlights,
    saveFlightField,
    saveFlightStatus,
    showAirlineColumn,
  ]);

  const filterOptions = [
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
    {
      columnId: "airplaneId",
      label: "Aircraft",
      options: getUniqueOptions(data.flights, "airplaneId"),
    },
  ];

  const tableActions = useMemo(
    () => [
      {
        label: "Mark on time",
        onSelect: (rows: Array<FlightRow>) => handleBulkStatusUpdate(rows, "on_time"),
      },
      {
        label: "Mark delayed",
        onSelect: (rows: Array<FlightRow>) => handleBulkStatusUpdate(rows, "delayed"),
      },
      {
        label: "Delete flights",
        onSelect: requestDeleteFlights,
      },
    ],
    [handleBulkStatusUpdate, requestDeleteFlights],
  );
  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-hidden p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Flights</h1>
          <p className="text-sm text-muted-foreground">Schedule and manage flight status</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Create
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Flight"
        description="Add a new flight to the schedule."
      >
        <form.Subscribe
          selector={(state) => ({
            errorMap: state.errorMap,
            isSubmitting: state.isSubmitting,
            submissionAttempts: state.submissionAttempts,
            departureCode: state.values.departureAirportCode,
            arrivalCode: state.values.arrivalAirportCode,
            airlineName: state.values.airlineName,
          })}
        >
          {({
            errorMap,
            isSubmitting,
            submissionAttempts,
            departureCode,
            arrivalCode,
            airlineName,
          }) => {
            const createAirplaneOptions = showAirlineColumn
              ? data.airplanes.filter((airplane) => airplane.airlineName === airlineName)
              : data.airplanes;
            const formError = getFormErrorMessage(errorMap.onSubmit) ?? error;

            return (
              <>
                <FlightGlobe departureCode={departureCode} arrivalCode={arrivalCode} />
                <form onSubmit={handleSubmit}>
                  <FieldGroup>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {showAirlineColumn ? (
                        <form.Field name="airlineName">
                          {(field) => (
                            <Field className="sm:col-span-2">
                              <FieldLabel>Airline</FieldLabel>
                              <AirlineComboboxField
                                items={airlineOptions}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(value) => {
                                  field.handleChange(value);
                                  form.setFieldValue("airplaneId", "");
                                }}
                                placeholder="Search airlines"
                              />
                            </Field>
                          )}
                        </form.Field>
                      ) : null}
                      <form.Field name="flightNumber">
                        {(field) => (
                          <Field
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Flight Number</FieldLabel>
                            <Input
                              aria-invalid={shouldShowFieldError(
                                field.state.meta,
                                submissionAttempts,
                              )}
                              placeholder="SK100"
                              required
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                            />
                            {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                              <FieldError
                                errors={[
                                  { message: getFieldErrorMessage(field.state.meta.errors) },
                                ]}
                              />
                            ) : null}
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="airplaneId">
                        {(field) => (
                          <Field
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Airplane</FieldLabel>
                            <AirplaneComboboxField
                              items={createAirplaneOptions}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(value) => field.handleChange(value)}
                              placeholder={
                                showAirlineColumn && !airlineName
                                  ? "Choose airline first"
                                  : "Search airplanes"
                              }
                            />
                            {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                              <FieldError
                                errors={[
                                  { message: getFieldErrorMessage(field.state.meta.errors) },
                                ]}
                              />
                            ) : null}
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="departureAirportCode">
                        {(field) => (
                          <Field
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Departure Airport</FieldLabel>
                            <AirportComboboxField
                              items={dbAirports}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(value) => field.handleChange(value)}
                              placeholder="Search departure airport"
                            />
                            {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                              <FieldError
                                errors={[
                                  { message: getFieldErrorMessage(field.state.meta.errors) },
                                ]}
                              />
                            ) : null}
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="arrivalAirportCode">
                        {(field) => (
                          <Field
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Arrival Airport</FieldLabel>
                            <AirportComboboxField
                              items={dbAirports}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(value) => field.handleChange(value)}
                              placeholder="Search arrival airport"
                            />
                            {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                              <FieldError
                                errors={[
                                  { message: getFieldErrorMessage(field.state.meta.errors) },
                                ]}
                              />
                            ) : null}
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="departureDatetime">
                        {(field) => (
                          <Field
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Departure Time</FieldLabel>
                            <DateTimePickerField
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(value) => field.handleChange(value)}
                              placeholder="Pick departure time"
                            />
                            {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                              <FieldError
                                errors={[
                                  { message: getFieldErrorMessage(field.state.meta.errors) },
                                ]}
                              />
                            ) : null}
                          </Field>
                        )}
                      </form.Field>
                      <form.Field name="arrivalDatetime">
                        {(field) => (
                          <Field
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Arrival Time</FieldLabel>
                            <DateTimePickerField
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(value) => field.handleChange(value)}
                              placeholder="Pick arrival time"
                            />
                            {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                              <FieldError
                                errors={[
                                  { message: getFieldErrorMessage(field.state.meta.errors) },
                                ]}
                              />
                            ) : null}
                          </Field>
                        )}
                      </form.Field>
                    </div>
                    <form.Field name="basePrice">
                      {(field) => (
                        <Field
                          data-invalid={shouldShowFieldError(field.state.meta, submissionAttempts)}
                        >
                          <FieldLabel>Base Price ($)</FieldLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="199.00"
                            aria-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                          />
                          {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                            <FieldError
                              errors={[{ message: getFieldErrorMessage(field.state.meta.errors) }]}
                            />
                          ) : null}
                        </Field>
                      )}
                    </form.Field>
                    {formError ? (
                      <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {formError}
                      </div>
                    ) : null}
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                      {isSubmitting ? "Creating..." : "Create Flight"}
                    </Button>
                  </FieldGroup>
                </form>
              </>
            );
          }}
        </form.Subscribe>
      </ResponsiveModal>

      <DeleteConfirmation pending={deleteConfirmation.pending} onClose={deleteConfirmation.close} />

      <div className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel>Start date</FieldLabel>
          <Input
            type="date"
            value={flightFilters.startDate}
            onChange={(event) => void setFlightFilters({ startDate: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>End date</FieldLabel>
          <Input
            type="date"
            value={flightFilters.endDate}
            onChange={(event) => void setFlightFilters({ endDate: event.target.value })}
          />
        </Field>
        <Field>
          <FieldLabel>From</FieldLabel>
          <Input
            value={flightFilters.source}
            onChange={(event) => void setFlightFilters({ source: event.target.value })}
            placeholder="City or airport code"
          />
        </Field>
        <Field>
          <FieldLabel>To</FieldLabel>
          <Input
            value={flightFilters.destination}
            onChange={(event) => void setFlightFilters({ destination: event.target.value })}
            placeholder="City or airport code"
          />
        </Field>
        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <Button variant="outline" size="sm" onClick={() => void setFlightFilters(null)}>
            Clear flight filters
          </Button>
        </div>
      </div>

      <DashboardDataTable
        bulkActions={tableActions}
        columns={columns}
        data={data.flights}
        emptyMessage="No flights scheduled."
        enableRowSelection
        enableVirtualization
        exportOptions={{
          filename: "flights.csv",
          getValue: getFlightExportValue,
        }}
        filters={filterOptions}
        getRowId={getFlightRowId}
        queryPrefix="flights"
        rowActions={tableActions}
        searchPlaceholder="Search flights..."
      />
    </div>
  );
}
