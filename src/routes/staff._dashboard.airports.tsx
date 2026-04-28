import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type {
  DashboardDataTableFilterOption,
  DashboardDataTableInlineSelectOption,
} from "@/components/dashboard-data-table";
import { AirportComboboxField } from "@/components/combobox-fields";
import { CountryFlag } from "@/components/country-flag";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
  DashboardDataTableInlineSelectCell,
  DashboardDataTableInlineTextCell,
} from "@/components/dashboard-data-table";
import { DeleteConfirmation, useDeleteConfirmation } from "@/components/delete-confirmation";
import { DialogGlobe } from "@/components/dialog-globe";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { REAL_AIRPORT_OPTIONS, getAirportOption } from "@/lib/airports";
import type { AirportOption } from "@/lib/airports";
import { createAirportFn, deleteAirportFn, updateAirportFieldFn } from "@/lib/queries";
import { createAirportSchema } from "@/lib/schemas";
import { staffAirportsQueryOptions } from "@/lib/staff-queries";

type AirportRow = {
  airport_type: string;
  city: string;
  code: string;
  country: string;
};
type EditableAirportField = "airportType" | "city" | "country";
type AirportCreateFieldErrors = {
  airport?: string;
  type?: string;
};

function getAirportCreateFieldErrors(data: {
  airportType: string;
  selectedAirport: AirportOption | null;
}): AirportCreateFieldErrors {
  const errors: AirportCreateFieldErrors = {};
  if (!data.selectedAirport) errors.airport = "Choose a real airport from the list.";

  const parsedAirportType = createAirportSchema.shape.airportType.safeParse(
    data.airportType.toLowerCase(),
  );
  if (!parsedAirportType.success)
    errors.type = parsedAirportType.error.issues.at(0)?.message ?? "Choose an airport type.";

  return errors;
}

function getAirportRowId(airport: AirportRow) {
  return airport.code;
}

export const Route = createFileRoute("/staff/_dashboard/airports")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffAirportsQueryOptions());
  },
  component: ManageAirportsPage,
});
const airportTypeOptions: Array<
  DashboardDataTableInlineSelectOption<"both" | "domestic" | "international">
> = [
  { label: "Both", value: "both" },
  { label: "Domestic", value: "domestic" },
  { label: "International", value: "international" },
];

function getUniqueOptions(
  airports: Array<AirportRow>,
  valueKey: "airport_type" | "country",
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>();
  for (const airport of airports) {
    const value = airport[valueKey];
    options.set(value, value);
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function ManageAirportsPage() {
  const { data: airports } = useSuspenseQuery(staffAirportsQueryOptions());
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedAirportCode, setSelectedAirportCode] = useState("");
  const [airportType, setAirportType] = useState("");
  const [error, setError] = useState<string | null>(null);
  const deleteConfirm = useDeleteConfirmation();
  const queryClient = useQueryClient();
  const router = useRouter();

  const selectedAirport = useMemo<AirportOption | null>(
    () => getAirportOption(selectedAirportCode) ?? null,
    [selectedAirportCode],
  );
  const fieldErrors = getAirportCreateFieldErrors({
    airportType,
    selectedAirport,
  });

  const globeMarkers = useMemo(() => {
    if (!selectedAirport) return [];
    return [
      {
        id: selectedAirport.code.toLowerCase(),
        countryCode: selectedAirport.countryCode,
        label: `${selectedAirport.city} (${selectedAirport.code})`,
        location: [selectedAirport.lat, selectedAirport.lng] as [number, number],
      },
    ];
  }, [selectedAirport]);

  async function refreshAirports() {
    await queryClient.invalidateQueries({ queryKey: ["staff-airports"] });
    await router.invalidate();
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (fieldErrors.airport || fieldErrors.type || !selectedAirport) return;

      const result = await createAirportFn({
        data: {
          airportType: airportType.toLowerCase(),
          city: selectedAirport.city,
          code: selectedAirport.code,
          country: selectedAirport.country,
        },
      });
      toast.success(result.message);
      setSelectedAirportCode("");
      setAirportType("");
      setCreateOpen(false);
      await refreshAirports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create airport.");
    }
  }
  const saveAirportField = useCallback(
    async (airport: AirportRow, field: EditableAirportField, value: string) => {
      const result = await updateAirportFieldFn({
        data: {
          code: airport.code,
          field,
          value,
        },
      });
      if ("error" in result && result.error) throw new Error(String(result.error));
      toast.success(result.message);
      await refreshAirports();
    },
    [refreshAirports],
  );

  const deleteAirports = useCallback(
    async (rows: Array<AirportRow>) => {
      try {
        const results = await Promise.all(
          rows.map((airport) => deleteAirportFn({ data: { code: airport.code } })),
        );
        const failed = results.find((result) => "error" in result && result.error);
        if (failed && "error" in failed) {
          toast.error(String(failed.error));
          return;
        }

        toast.success(`Deleted ${rows.length} airport${rows.length === 1 ? "" : "s"}.`);
        await refreshAirports();
      } catch {
        toast.error("Failed to delete airports. They may have dependent flights.");
      }
    },
    [refreshAirports],
  );

  const requestDeleteAirports = useCallback(
    (rows: Array<AirportRow>) => {
      const label = rows.length === 1 ? rows[0].code : `${rows.length} selected airports`;
      deleteConfirm.requestDelete(label, () => void deleteAirports(rows));
    },
    [deleteAirports, deleteConfirm],
  );

  const columns = useMemo<Array<ColumnDef<AirportRow>>>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Code" />,
        cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
      },
      {
        accessorKey: "city",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="City" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update airport ${row.original.code} city`}
            onSave={(value) => saveAirportField(row.original, "city", value)}
            value={row.original.city}
          />
        ),
      },
      {
        accessorKey: "country",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Country" />,
        cell: ({ row }) => {
          const airport = getAirportOption(row.original.code);
          return (
            <div className="flex items-center gap-2">
              {airport ? <CountryFlag countryCode={airport.countryCode} size={18} /> : null}
              <DashboardDataTableInlineTextCell
                ariaLabel={`Update airport ${row.original.code} country`}
                onSave={(value) => saveAirportField(row.original, "country", value)}
                value={row.original.country}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "airport_type",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineSelectCell
            ariaLabel={`Update airport ${row.original.code} type`}
            onSave={(value) => saveAirportField(row.original, "airportType", value)}
            options={airportTypeOptions}
            renderValue={(value) => (
              <Badge variant="secondary" className="capitalize">
                {value}
              </Badge>
            )}
            value={row.original.airport_type as "both" | "domestic" | "international"}
          />
        ),
      },
    ],
    [saveAirportField],
  );

  const filterOptions = useMemo(
    () => [
      {
        columnId: "country",
        label: "Country",
        options: getUniqueOptions(airports, "country"),
      },
      {
        columnId: "airport_type",
        label: "Type",
        options: getUniqueOptions(airports, "airport_type"),
      },
    ],
    [airports],
  );

  const tableActions = useMemo(
    () => [
      {
        label: "Delete airports",
        onSelect: requestDeleteAirports,
      },
    ],
    [requestDeleteAirports],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Airports</h1>
          <p className="text-sm text-muted-foreground">Manage airports in the system</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus data-icon="inline-start" />
          Create
        </Button>
      </div>

      <ResponsiveModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Airport"
        description="Add a real-world airport to the system."
      >
        <div className="-mx-6 -mt-2">
          <DialogGlobe markers={globeMarkers} />
        </div>
        <form onSubmit={handleCreate}>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field data-invalid={Boolean(error || fieldErrors.airport)}>
                <FieldLabel>Airport</FieldLabel>
                <AirportComboboxField
                  items={REAL_AIRPORT_OPTIONS}
                  value={selectedAirportCode}
                  onChange={(value) => {
                    setError(null);
                    setSelectedAirportCode(value);
                  }}
                  placeholder="Search airports"
                />
                {error || fieldErrors.airport ? (
                  <FieldError errors={[{ message: error ?? fieldErrors.airport }]} />
                ) : null}
              </Field>
              <Field>
                <FieldLabel>Country</FieldLabel>
                <Input value={selectedAirport?.country ?? ""} readOnly />
              </Field>
              <Field data-invalid={Boolean(fieldErrors.type)}>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={airportType}
                  onValueChange={(value) => {
                    setError(null);
                    setAirportType(value ?? "");
                  }}
                >
                  <SelectTrigger aria-invalid={Boolean(fieldErrors.type)}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domestic">Domestic</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.type ? <FieldError errors={[{ message: fieldErrors.type }]} /> : null}
              </Field>
            </div>
            <Button type="submit" className="w-full sm:w-auto">
              Create Airport
            </Button>
          </FieldGroup>
        </form>
      </ResponsiveModal>

      <DeleteConfirmation pending={deleteConfirm.pending} onClose={deleteConfirm.close} />

      <DashboardDataTable
        bulkActions={tableActions}
        columns={columns}
        data={airports}
        emptyMessage="No airports."
        enableRowSelection
        getRowId={getAirportRowId}
        filters={filterOptions}
        searchPlaceholder="Search airports..."
        queryPrefix="airports"
        rowActions={tableActions}
      />
    </div>
  );
}
