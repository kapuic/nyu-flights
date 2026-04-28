import { formatIncompletePhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js/max";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { HTMLInputTypeAttribute } from "react";
import type { DashboardDataTableFilterOption } from "@/components/dashboard-data-table";
import { formatPlainDate } from "@/lib/temporal";

import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
  DashboardDataTableInlineTextCell,
} from "@/components/dashboard-data-table";
import { DeleteConfirmation, useDeleteConfirmation } from "@/components/delete-confirmation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InlineField, InlinePhoneField, InlineStateField } from "@/components/ui/inline-field";
import { deleteCustomerFn, updateManagedCustomerFieldFn } from "@/lib/queries";
import { staffCustomersQueryOptions } from "@/lib/staff-queries";

type CustomerRow = {
  building_number: string;
  city: string;
  date_of_birth: string;
  email: string;
  name: string;
  passport_country: string;
  passport_expiration: string;
  passport_number: string;
  phone_number: string;
  state: string;
  street: string;
};
type EditableCustomerField =
  | "buildingNumber"
  | "city"
  | "name"
  | "passportCountry"
  | "passportExpiration"
  | "passportNumber"
  | "phoneNumber"
  | "state"
  | "street";

function getCustomerRowId(customer: CustomerRow) {
  return customer.email;
}


function formatDisplayDate(value: string) {
  if (!value) return "";
  return formatPlainDate(value);
}

function getEditablePhoneNumber(value: string) {
  if (!value) return "";
  const parsed = parsePhoneNumberFromString(value, "US");
  return parsed?.isValid() ? parsed.number : value;
}

function formatDisplayPhoneNumber(value: string) {
  const editableValue = getEditablePhoneNumber(value);
  if (!editableValue) return "";
  return formatIncompletePhoneNumber(editableValue, "US");
}

function getCustomerExportValue(customer: CustomerRow, columnId: string) {
  if (columnId === "phone_number") return formatDisplayPhoneNumber(customer.phone_number);
  if (columnId === "date_of_birth") return formatDisplayDate(customer.date_of_birth);
  return undefined;
}

function renderEditableTextCell({
  ariaLabel,
  className = "min-w-36",
  onSave,
  type,
  value,
}: {
  ariaLabel: string;
  className?: string;
  onSave: (value: string) => Promise<void>;
  type?: HTMLInputTypeAttribute;
  value: string;
}) {
  return (
    <DashboardDataTableInlineTextCell
      ariaLabel={ariaLabel}
      className={className}
      onSave={onSave}
      type={type}
      value={value}
    />
  );
}

export const Route = createFileRoute("/staff/_dashboard/customers")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffCustomersQueryOptions());
  },
  component: ManageCustomersPage,
});

function getUniqueOptions(
  customers: Array<CustomerRow>,
  valueKey: "city",
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>();
  for (const customer of customers) {
    const value = customer[valueKey];
    options.set(value, value);
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function PassportDialog({
  customer,
  onSave,
}: {
  customer: CustomerRow;
  onSave: (customer: CustomerRow, field: EditableCustomerField, value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Show Passport</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Passport</DialogTitle>
          <DialogDescription>{customer.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <InlineField
            ariaLabel={`Update ${customer.email} passport number`}
            label="Passport #"
            onSave={(value) => onSave(customer, "passportNumber", value)}
            value={customer.passport_number}
            variant="filled"
          />
          <InlineField
            ariaLabel={`Update ${customer.email} passport expiration`}
            label="Expiration"
            onSave={(value) => onSave(customer, "passportExpiration", value)}
            type="date"
            value={customer.passport_expiration}
            variant="filled"
          />
          <InlineField
            ariaLabel={`Update ${customer.email} passport country`}
            label="Country"
            onSave={(value) => onSave(customer, "passportCountry", value)}
            value={customer.passport_country}
            variant="filled"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManageCustomersPage() {
  const { data: customers } = useSuspenseQuery(staffCustomersQueryOptions());
  const deleteConfirm = useDeleteConfirmation();
  const queryClient = useQueryClient();
  const router = useRouter();

  const refreshCustomers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-customers"] });
    await router.invalidate();
  }, [queryClient, router]);
  const saveCustomerField = useCallback(
    async (customer: CustomerRow, field: EditableCustomerField, value: string) => {
      const result = await updateManagedCustomerFieldFn({
        data: {
          email: customer.email,
          field,
          value,
        },
      });
      if ("error" in result && result.error) throw new Error(String(result.error));
      toast.success(result.message);
      await refreshCustomers();
    },
    [refreshCustomers],
  );

  const deleteCustomers = useCallback(
    async (rows: Array<CustomerRow>) => {
      try {
        const results = await Promise.all(
          rows.map((customer) => deleteCustomerFn({ data: { email: customer.email } })),
        );
        const failed = results.find((result) => "error" in result && result.error);
        if (failed && "error" in failed) {
          toast.error(String(failed.error));
          return;
        }

        toast.success(`Deleted ${rows.length} customer${rows.length === 1 ? "" : "s"}.`);
        await refreshCustomers();
      } catch {
        toast.error("Failed to delete customers.");
      }
    },
    [refreshCustomers],
  );

  const requestDeleteCustomers = useCallback(
    (rows: Array<CustomerRow>) => {
      const label = rows.length === 1 ? rows[0].name : `${rows.length} selected customers`;
      deleteConfirm.requestDelete(label, () => void deleteCustomers(rows));
    },
    [deleteConfirm, deleteCustomers],
  );

  const columns = useMemo<Array<ColumnDef<CustomerRow>>>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) =>
          renderEditableTextCell({
            ariaLabel: `Update ${row.original.email} name`,
            onSave: (value) => saveCustomerField(row.original, "name", value),
            className: "min-w-44",
            value: row.original.name,
          }),
      },
      {
        accessorKey: "email",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="block min-w-56 text-sm text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "phone_number",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => (
          <div className="min-w-64">
            <InlinePhoneField
              controls="external"
              displayValue={formatDisplayPhoneNumber(row.original.phone_number)}
              label="Phone"
              onSave={(value) => saveCustomerField(row.original, "phoneNumber", value)}
              showLabel={false}
              value={getEditablePhoneNumber(row.original.phone_number)}
              variant="outline"
            />
          </div>
        ),
      },
      {
        accessorKey: "date_of_birth",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Date of Birth" />
        ),
        cell: ({ row }) => (
          <span className="block min-w-28 text-sm">
            {formatDisplayDate(row.original.date_of_birth)}
          </span>
        ),
      },
      {
        accessorKey: "street",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Street" />,
        cell: ({ row }) =>
          renderEditableTextCell({
            ariaLabel: `Update ${row.original.email} street`,
            onSave: (value) => saveCustomerField(row.original, "street", value),
            className: "min-w-32",
            value: row.original.street,
          }),
      },
      {
        accessorKey: "building_number",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Building #" />
        ),
        cell: ({ row }) =>
          renderEditableTextCell({
            ariaLabel: `Update ${row.original.email} building number`,
            onSave: (value) => saveCustomerField(row.original, "buildingNumber", value),
            className: "min-w-24",
            value: row.original.building_number,
          }),
      },
      {
        accessorKey: "city",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="City" />,
        cell: ({ row }) =>
          renderEditableTextCell({
            ariaLabel: `Update ${row.original.email} city`,
            onSave: (value) => saveCustomerField(row.original, "city", value),
            className: "min-w-32",
            value: row.original.city,
          }),
      },
      {
        accessorKey: "state",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="State" />,
        cell: ({ row }) => (
          <InlineStateField
            controls="external"
            className="min-w-56"
            label="State"
            mode="strict"
            onSave={(value) => saveCustomerField(row.original, "state", value)}
            showLabel={false}
            value={row.original.state}
            variant="outline"
          />
        ),
      },
      {
        accessorKey: "passport_number",
        enableGlobalFilter: true,
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Passport" />,
        cell: ({ row }) => <PassportDialog customer={row.original} onSave={saveCustomerField} />,
      },
    ],
    [saveCustomerField],
  );

  const filterOptions = useMemo(
    () => [
      {
        columnId: "city",
        label: "City",
        options: getUniqueOptions(customers, "city"),
      },
    ],
    [customers],
  );

  const tableActions = useMemo(
    () => [
      {
        label: "Delete customers",
        onSelect: requestDeleteCustomers,
      },
    ],
    [requestDeleteCustomers],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">Manage customer accounts</p>
      </div>

      <DeleteConfirmation pending={deleteConfirm.pending} onClose={deleteConfirm.close} />

      <DashboardDataTable
        bulkActions={tableActions}
        columns={columns}
        data={customers}
        emptyMessage="No customers."
        enableRowSelection
        exportOptions={{
          filename: "customers.csv",
          getValue: getCustomerExportValue,
        }}
        getRowId={getCustomerRowId}
        filters={filterOptions}
        searchPlaceholder="Search customers..."
        queryPrefix="customers"
        rowActions={tableActions}
      />
    </div>
  );
}
