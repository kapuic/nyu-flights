import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";

import type { DashboardDataTableFilterOption } from "@/components/dashboard-data-table";

import { StaffPhoneNumbersSheet } from "@/components/staff-phone-numbers-sheet";
import {
  DashboardDataTable,
  DashboardDataTableColumnHeader,
  DashboardDataTableInlineComboboxCell,
  DashboardDataTableInlineTextCell,
} from "@/components/dashboard-data-table";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmation, useDeleteConfirmation } from "@/components/delete-confirmation";
import {
  deleteStaffFn,
  listAllAirlinesFn,
  replaceStaffPhoneNumbersFn,
  updateStaffFieldFn,
} from "@/lib/queries";
import { staffMembersQueryOptions } from "@/lib/staff-queries";
import { getStaffPermission } from "@/lib/staff-permissions";

type StaffRow = {
  airline_name: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_numbers: Array<string>;
  username: string;
};
type EditableStaffField = "airlineName" | "email" | "firstName" | "lastName";

function getStaffRowId(staff: StaffRow) {
  return staff.username;
}

export const Route = createFileRoute("/staff/_dashboard/staff")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(staffMembersQueryOptions());
  },
  component: ManageStaffPage,
});

function getUniqueOptions(
  staff: Array<StaffRow>,
  valueKey: "airline_name" | "role",
): Array<DashboardDataTableFilterOption> {
  const options = new Map<string, string>();
  for (const member of staff) {
    const value = valueKey === "role" ? getStaffPermission(member.username) : member[valueKey];
    options.set(value, valueKey === "role" ? getRoleLabel(value) : value);
  }
  return Array.from(options, ([value, label]) => ({ label, value })).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

function getRoleLabel(role: string) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  return "Staff";
}
function getPhoneSummary(phoneNumbers: Array<string>) {
  const firstPhoneNumber = phoneNumbers[0];
  if (!firstPhoneNumber) return "Not set";
  if (phoneNumbers.length === 1) return firstPhoneNumber;
  return `${firstPhoneNumber} +${phoneNumbers.length - 1} more`;
}

function getStaffExportValue(staff: StaffRow, columnId: string) {
  if (columnId === "role") return getRoleLabel(getStaffPermission(staff.username));
  if (columnId === "phone_numbers") return staff.phone_numbers.join(", ");
  return undefined;
}

function ManageStaffPage() {
  const { data: staff } = useSuspenseQuery(staffMembersQueryOptions());
  const { data: airlines } = useSuspenseQuery({
    queryKey: ["staff-airlines"],
    queryFn: () => listAllAirlinesFn(),
    staleTime: 30_000,
  });
  const deleteConfirm = useDeleteConfirmation();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [phoneSheetStaff, setPhoneSheetStaff] = useState<StaffRow | null>(null);
  const [phoneSheetDraft, setPhoneSheetDraft] = useState<Array<string>>([]);
  const [savingPhoneNumbers, setSavingPhoneNumbers] = useState(false);

  const refreshStaff = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["staff-members"] });
    await router.invalidate();
  }, [queryClient, router]);
  const saveStaffField = useCallback(
    async (member: StaffRow, field: EditableStaffField, value: string) => {
      const result = await updateStaffFieldFn({
        data: {
          field,
          username: member.username,
          value,
        },
      });
      if ("error" in result && typeof result.error === "string" && result.error) {
        throw new Error(result.error);
      }
      toast.success(result.message);
      await refreshStaff();
    },
    [refreshStaff],
  );

  const deleteStaffMembers = useCallback(
    async (rows: Array<StaffRow>) => {
      try {
        await Promise.all(
          rows.map((member) => deleteStaffFn({ data: { username: member.username } })),
        );
        toast.success(`Deleted ${rows.length} staff account${rows.length === 1 ? "" : "s"}.`);
        await refreshStaff();
      } catch {
        toast.error("Failed to delete staff members.");
      }
    },
    [refreshStaff],
  );

  const requestDeleteStaff = useCallback(
    (rows: Array<StaffRow>) => {
      const label = rows.length === 1 ? rows[0].username : `${rows.length} selected staff`;
      deleteConfirm.requestDelete(label, () => void deleteStaffMembers(rows));
    },
    [deleteConfirm, deleteStaffMembers],
  );
  const openPhoneSheet = useCallback((member: StaffRow) => {
    setPhoneSheetStaff(member);
    setPhoneSheetDraft(member.phone_numbers.length ? member.phone_numbers : [""]);
  }, []);
  const closePhoneSheet = useCallback((open: boolean) => {
    if (open) return;
    setPhoneSheetStaff(null);
    setPhoneSheetDraft([]);
  }, []);
  const savePhoneNumbers = useCallback(async () => {
    if (!phoneSheetStaff || savingPhoneNumbers) return;
    setSavingPhoneNumbers(true);
    try {
      const result = await replaceStaffPhoneNumbersFn({
        data: {
          phoneNumbers: phoneSheetDraft,
          username: phoneSheetStaff.username,
        },
      });
      if ("error" in result && typeof result.error === "string" && result.error) {
        throw new Error(result.error);
      }
      toast.success(result.message);
      setPhoneSheetStaff(null);
      setPhoneSheetDraft([]);
      await refreshStaff();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update phone numbers.");
    } finally {
      setSavingPhoneNumbers(false);
    }
  }, [phoneSheetDraft, phoneSheetStaff, refreshStaff, savingPhoneNumbers]);

  const columns = useMemo<Array<ColumnDef<StaffRow>>>(
    () => [
      {
        accessorKey: "username",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Username" />,
        cell: ({ row }) => <span className="font-medium">{row.original.username}</span>,
      },
      {
        accessorKey: "first_name",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="First name" />
        ),
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update ${row.original.username} first name`}
            onSave={(value) => saveStaffField(row.original, "firstName", value)}
            value={row.original.first_name}
          />
        ),
      },
      {
        accessorKey: "last_name",
        header: ({ column }) => (
          <DashboardDataTableColumnHeader column={column} title="Last name" />
        ),
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update ${row.original.username} last name`}
            onSave={(value) => saveStaffField(row.original, "lastName", value)}
            value={row.original.last_name}
          />
        ),
      },
      {
        accessorKey: "airline_name",
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Airline" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineComboboxCell
            ariaLabel={`Update ${row.original.username} airline`}
            className="min-w-40"
            getItemKey={(airline) => airline.name}
            itemToStringLabel={(airline) => airline.name}
            itemToStringValue={(airline) => airline.name}
            items={airlines}
            onSave={(value) => saveStaffField(row.original, "airlineName", value)}
            placeholder="Search airlines"
            value={row.original.airline_name}
            valueFromItem={(airline) => airline.name}
          />
        ),
      },
      {
        accessorKey: "phone_numbers",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Phone" />,
        cell: ({ row }) => (
          <button
            aria-label={`Manage ${row.original.username} phone numbers`}
            className="min-h-8 rounded-md px-2.5 py-1 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={() => openPhoneSheet(row.original)}
            type="button"
          >
            <span
              className={row.original.phone_numbers.length ? "" : "italic text-muted-foreground"}
            >
              {getPhoneSummary(row.original.phone_numbers)}
            </span>
          </button>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <DashboardDataTableInlineTextCell
            ariaLabel={`Update ${row.original.username} email`}
            onSave={(value) => saveStaffField(row.original, "email", value)}
            value={row.original.email}
          />
        ),
      },
      {
        id: "role",
        accessorFn: (row) => getStaffPermission(row.username),
        filterFn: "arrIncludesSome",
        header: ({ column }) => <DashboardDataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => {
          const permission = getStaffPermission(row.original.username);
          if (permission === "staff") {
            return <span className="text-xs text-muted-foreground">Staff</span>;
          }
          return (
            <Badge variant="secondary" className="text-xs capitalize">
              {permission}
            </Badge>
          );
        },
      },
    ],
    [airlines, openPhoneSheet, saveStaffField],
  );

  const filterOptions = useMemo(
    () => [
      {
        columnId: "airline_name",
        label: "Airline",
        options: getUniqueOptions(staff, "airline_name"),
      },
      {
        columnId: "role",
        label: "Role",
        options: getUniqueOptions(staff, "role"),
      },
    ],
    [staff],
  );

  const tableActions = useMemo(
    () => [
      {
        label: "Manage phones",
        disabled: (rows: Array<StaffRow>) => rows.length !== 1,
        onSelect: (rows: Array<StaffRow>) => {
          if (rows.length === 1) openPhoneSheet(rows[0]);
        },
      },
      {
        label: "Delete staff",
        onSelect: requestDeleteStaff,
      },
    ],
    [openPhoneSheet, requestDeleteStaff],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-lg font-semibold">Staff</h1>
        <p className="text-sm text-muted-foreground">Manage airline staff accounts</p>
      </div>

      <DeleteConfirmation pending={deleteConfirm.pending} onClose={deleteConfirm.close} />

      <StaffPhoneNumbersSheet
        description={
          phoneSheetStaff
            ? `Edit phone numbers for ${phoneSheetStaff.first_name} ${phoneSheetStaff.last_name}.`
            : "Edit staff phone numbers."
        }
        onOpenChange={closePhoneSheet}
        onPhoneNumbersChange={setPhoneSheetDraft}
        onSave={savePhoneNumbers}
        open={phoneSheetStaff !== null}
        phoneNumbers={phoneSheetDraft}
        saving={savingPhoneNumbers}
        title="Manage phone numbers"
      />

      <DashboardDataTable
        bulkActions={tableActions}
        columns={columns}
        data={staff}
        emptyMessage="No staff accounts."
        enableRowSelection
        exportOptions={{
          filename: "staff.csv",
          getValue: getStaffExportValue,
        }}
        getRowId={getStaffRowId}
        filters={filterOptions}
        searchPlaceholder="Search staff..."
        queryPrefix="staff"
        rowActions={tableActions}
      />
    </div>
  );
}
