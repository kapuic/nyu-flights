import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import type { DashboardDataTableFilterOption } from "@/components/dashboard-data-table";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
} from "@/components/dashboard-data-table";
import { DeleteConfirmation, useDeleteConfirmation } from "@/components/delete-confirmation";
import { InlineField, InlinePhoneField } from "@/components/ui/inline-field";
import { deleteCustomerFn, updateManagedCustomerFieldFn } from "@/lib/queries";
import { staffCustomersQueryOptions } from "@/lib/staff-queries";

type CustomerRow = {
  city: string;
  email: string;
  name: string;
  phone_number: string;
};
type EditableCustomerField = "city" | "name" | "phoneNumber";

function getCustomerRowId(customer: CustomerRow) {
  return customer.email;
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
        cell: ({ row }) => (
          <InlineField
            ariaLabel={`Update ${row.original.email} name`}
            label="Name"
            onSave={(value) => saveCustomerField(row.original, "name", value)}
            value={row.original.name}
            variant="outline"
          />
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "city",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="City" />,
        cell: ({ row }) => (
          <InlineField
            ariaLabel={`Update ${row.original.email} city`}
            label="City"
            onSave={(value) => saveCustomerField(row.original, "city", value)}
            value={row.original.city}
            variant="outline"
          />
        ),
      },
      {
        accessorKey: "phone_number",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => (
          <InlinePhoneField
            controls="external"
            label="Phone"
            onSave={(value) => saveCustomerField(row.original, "phoneNumber", value)}
            value={row.original.phone_number}
            variant="outline"
          />
        ),
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
        getRowId={getCustomerRowId}
        filters={filterOptions}
        searchPlaceholder="Search customers..."
        queryPrefix="customers"
        rowActions={tableActions}
      />
    </div>
  );
}
