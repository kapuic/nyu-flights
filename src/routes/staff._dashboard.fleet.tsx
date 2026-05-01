import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2Icon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import type { DashboardDataTableFilterOption } from "@/components/dashboard-data-table";
import { DatePickerField } from "@/components/date-time-picker";
import { DeleteConfirmation, useDeleteConfirmation } from "@/components/delete-confirmation";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
  DashboardDataTableInlineDateCell,
  DashboardDataTableInlineTextCell,
} from "@/components/dashboard-data-table";
import { Button } from "@/components/ui/button";
import { AirlineComboboxField } from "@/components/combobox-fields";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/responsive-modal";
import {
  addAirplaneFn,
  deleteAirplaneFn,
  listReferenceDataFn,
  updateAirplaneFieldFn,
} from "@/lib/queries";
import { addAirplaneSchema } from "@/lib/schemas";
import { staffDashboardQueryOptions } from "@/lib/staff-queries";
import { isAdminOrAbove } from "@/lib/staff-permissions";
import { formatDateOnlyShort } from "@/lib/temporal";

type AirplaneRow = {
  airlineName: string;
  airplaneId: string;
  manufacturingCompany: string;
  manufacturingDate: string;
  numberOfSeats: number;
};
type EditableAirplaneField = "manufacturingCompany" | "manufacturingDate" | "numberOfSeats";

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
    .map((error) => (typeof error === "string" ? error : (error as { message?: string })?.message))
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

function getAirplaneRowId(airplane: AirplaneRow) {
  return `${airplane.airlineName}:${airplane.airplaneId}`;
}

export const Route = createFileRoute("/staff/_dashboard/fleet")({
  component: StaffFleetPage,
});

const staffDashboardRoute = getRouteApi("/staff/_dashboard");

function formatDate(value: string) {
  return formatDateOnlyShort(value);
}

function getFleetExportValue(airplane: AirplaneRow, columnId: string) {
  if (columnId === "manufacturingDate") return formatDate(airplane.manufacturingDate);
  return undefined;
}

function getUniqueOptions(
  airplanes: Array<AirplaneRow>,
  valueKey: "manufacturingCompany",
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>();
  for (const airplane of airplanes) {
    const value = airplane[valueKey];
    options.set(value, value);
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function StaffFleetPage() {
  const { data } = useSuspenseQuery(staffDashboardQueryOptions());
  const { currentUser } = staffDashboardRoute.useLoaderData();
  const queryClient = useQueryClient();
  const router = useRouter();
  const deleteConfirm = useDeleteConfirmation();
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showAirlineField = isAdminOrAbove(currentUser.staffPermission ?? "staff");
  const referenceDataQuery = useSuspenseQuery({
    queryKey: ["reference-data"],
    queryFn: () => listReferenceDataFn(),
    staleTime: 5 * 60 * 1000,
  });
  const airlineOptions = referenceDataQuery.data.airlines;
  const refreshFleet = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-dashboard"] });
    await router.invalidate();
  }, [queryClient, router]);

  const saveAirplaneField = useCallback(
    async (airplane: AirplaneRow, field: EditableAirplaneField, value: number | string) => {
      const result = await updateAirplaneFieldFn({
        data: {
          airlineName: airplane.airlineName,
          airplaneId: airplane.airplaneId,
          field,
          value,
        },
      });
      if ("error" in result && result.error) throw new Error(String(result.error));
      toast.success(result.message);
      await refreshFleet();
    },
    [refreshFleet],
  );

  const deleteAirplanes = useCallback(
    async (rows: Array<AirplaneRow>) => {
      try {
        const results = await Promise.all(
          rows.map((airplane) =>
            deleteAirplaneFn({
              data: {
                airlineName: airplane.airlineName,
                airplaneId: airplane.airplaneId,
              },
            }),
          ),
        );
        const failed = results.find((result) => "error" in result && result.error);
        if (failed && "error" in failed) {
          toast.error(String(failed.error));
          return;
        }

        toast.success(`Deleted ${rows.length} airplane${rows.length === 1 ? "" : "s"}.`);
        await refreshFleet();
      } catch {
        toast.error("Failed to delete airplanes.");
      }
    },
    [refreshFleet],
  );

  const requestDeleteAirplanes = useCallback(
    (rows: Array<AirplaneRow>) => {
      const label = rows.length === 1 ? rows[0].airplaneId : `${rows.length} selected airplanes`;
      deleteConfirm.requestDelete(label, () => void deleteAirplanes(rows));
    },
    [deleteAirplanes, deleteConfirm],
  );

  const form = useForm({
    defaultValues: {
      airlineName: "",
      airplaneId: "",
      numberOfSeats: "",
      manufacturingCompany: "",
      manufacturingDate: "",
    },
    validators: {
      onSubmit: ({ value }) => getSchemaErrors(addAirplaneSchema, value),
    },
    onSubmit: async ({ value }) => {
      const result = await addAirplaneFn({
        data: {
          airlineName: value.airlineName,
          airplaneId: value.airplaneId,
          numberOfSeats: Number(value.numberOfSeats),
          manufacturingCompany: value.manufacturingCompany,
          manufacturingDate: value.manufacturingDate,
        },
      });
      const mutationError = getMutationError(result);
      if (mutationError) throw new Error(mutationError);
      toast.success(result.message);
      form.reset();
      setCreateOpen(false);
      await refreshFleet();
    },
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await form.handleSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add airplane.");
    }
  }

  const columns = useMemo<Array<ColumnDef<AirplaneRow>>>(
    () => [
      {
        accessorKey: "airlineName",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Airline" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.airlineName}</span>
        ),
      },
      {
        accessorKey: "airplaneId",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Airplane ID" />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.airplaneId}</span>,
      },
      {
        accessorKey: "manufacturingCompany",
        filterFn: "arrIncludesSome",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Manufacturer" />
        ),
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update ${row.original.airplaneId} manufacturer`}
            onSave={(value) => saveAirplaneField(row.original, "manufacturingCompany", value)}
            value={row.original.manufacturingCompany}
          />
        ),
      },
      {
        accessorKey: "manufacturingDate",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Mfg. Date" />
        ),
        cell: ({ row }) => (
          <DashboardDataTableInlineDateCell
            ariaLabel={`Update ${row.original.airplaneId} manufacturing date`}
            formatValue={formatDate}
            onSave={(value) => saveAirplaneField(row.original, "manufacturingDate", value)}
            value={row.original.manufacturingDate}
          />
        ),
      },
      {
        accessorKey: "numberOfSeats",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Seats" className="ms-auto" />
        ),
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update ${row.original.airplaneId} seats`}
            className="items-end"
            formatValue={(value) => <span className="text-right tabular-nums">{value}</span>}
            inputMode="numeric"
            onSave={(value) => saveAirplaneField(row.original, "numberOfSeats", Number(value))}
            type="number"
            value={String(row.original.numberOfSeats)}
          />
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        enableSorting: false,
        header: () => <span className="sr-only">Action</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              aria-label={`Delete airplane ${row.original.airplaneId}`}
              variant="destructive"
              size="icon-sm"
              onClick={() => requestDeleteAirplanes([row.original])}
            >
              <Trash2Icon />
            </Button>
          </div>
        ),
      },
    ],
    [requestDeleteAirplanes, saveAirplaneField],
  );

  const filterOptions = useMemo(
    () => [
      ...(showAirlineField
        ? [
            {
              columnId: "airlineName",
              label: "Airline",
              options: Array.from(
                new Map(
                  data.airplanes.map((airplane) => [airplane.airlineName, airplane.airlineName]),
                ),
                ([value, label]) => ({ label, value }),
              ),
            },
          ]
        : []),
      {
        columnId: "manufacturingCompany",
        label: "Manufacturer",
        options: getUniqueOptions(data.airplanes, "manufacturingCompany"),
      },
    ],
    [data.airplanes, showAirlineField],
  );
  const tableActions = useMemo(
    () => [
      {
        label: "Delete airplanes",
        onSelect: requestDeleteAirplanes,
      },
    ],
    [requestDeleteAirplanes],
  );

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
        <form.Subscribe
          selector={(state) => ({
            errorMap: state.errorMap,
            isSubmitting: state.isSubmitting,
            submissionAttempts: state.submissionAttempts,
          })}
        >
          {({ errorMap, isSubmitting, submissionAttempts }) => {
            const formError = getFormErrorMessage(errorMap.onSubmit) ?? error;

            return (
              <form onSubmit={handleSubmit}>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {showAirlineField ? (
                      <form.Field name="airlineName">
                        {(field) => (
                          <Field
                            className="sm:col-span-2"
                            data-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                          >
                            <FieldLabel>Airline</FieldLabel>
                            <AirlineComboboxField
                              items={airlineOptions}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(value) => field.handleChange(value)}
                              placeholder="Search airlines"
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
                    ) : null}
                    <form.Field name="airplaneId">
                      {(field) => (
                        <Field
                          data-invalid={shouldShowFieldError(field.state.meta, submissionAttempts)}
                        >
                          <FieldLabel>Airplane ID</FieldLabel>
                          <Input
                            aria-invalid={shouldShowFieldError(
                              field.state.meta,
                              submissionAttempts,
                            )}
                            placeholder="B737-001"
                            required
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
                    <form.Field name="numberOfSeats">
                      {(field) => (
                        <Field
                          data-invalid={shouldShowFieldError(field.state.meta, submissionAttempts)}
                        >
                          <FieldLabel>Number of Seats</FieldLabel>
                          <Input
                            type="number"
                            min="1"
                            required
                            placeholder="180"
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
                    <form.Field name="manufacturingCompany">
                      {(field) => (
                        <Field
                          data-invalid={shouldShowFieldError(field.state.meta, submissionAttempts)}
                        >
                          <FieldLabel>Manufacturer</FieldLabel>
                          <Input
                            placeholder="Boeing"
                            required
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
                    <form.Field name="manufacturingDate">
                      {(field) => (
                        <Field
                          data-invalid={shouldShowFieldError(field.state.meta, submissionAttempts)}
                        >
                          <FieldLabel>Manufacturing Date</FieldLabel>
                          <DatePickerField
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(value) => field.handleChange(value)}
                            placeholder="Pick manufacturing date"
                          />
                          {shouldShowFieldError(field.state.meta, submissionAttempts) ? (
                            <FieldError
                              errors={[{ message: getFieldErrorMessage(field.state.meta.errors) }]}
                            />
                          ) : null}
                        </Field>
                      )}
                    </form.Field>
                  </div>
                  {formError ? (
                    <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {formError}
                    </div>
                  ) : null}
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting ? "Adding..." : "Add Airplane"}
                  </Button>
                </FieldGroup>
              </form>
            );
          }}
        </form.Subscribe>
      </ResponsiveModal>

      <DeleteConfirmation pending={deleteConfirm.pending} onClose={deleteConfirm.close} />

      <DashboardDataTable
        bulkActions={tableActions}
        columns={columns}
        data={data.airplanes}
        emptyMessage="No aircraft registered."
        enableRowSelection
        enableVirtualization
        exportOptions={{
          filename: "fleet.csv",
          getValue: getFleetExportValue,
        }}
        filters={filterOptions}
        getRowId={getAirplaneRowId}
        searchPlaceholder="Search fleet..."
        queryPrefix="fleet"
        rowActions={tableActions}
      />
    </div>
  );
}
