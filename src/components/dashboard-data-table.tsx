import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  Columns3Icon,
  DownloadIcon,
  FilterIcon,
  Loader2Icon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { VirtualItem } from "@tanstack/react-virtual";
import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DatePickerField, DateTimePickerField } from "@/components/date-time-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DashboardDataTableFilterOption = {
  label: string;
  value: string;
};

export type DashboardDataTableInlineSelectOption<TValue extends string> = {
  label: string;
  value: TValue;
};
type DashboardDataTableInlineComboboxCellProps<TItem, TValue extends string> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  getItemKey: (item: TItem) => string;
  itemToStringLabel: (item: TItem) => string;
  itemToStringValue: (item: TItem) => string;
  items: Array<TItem>;
  onSave: (value: TValue, item: TItem) => Promise<void> | void;
  placeholder?: string;
  renderItem?: (item: TItem) => ReactNode;
  renderValue?: (value: TValue) => ReactNode;
  value: TValue;
  valueFromItem: (item: TItem) => TValue;
};
type DashboardDataTableInlineTextCellProps = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  formatValue?: (value: string) => ReactNode;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  value: string;
};

type DashboardDataTableInlineDateCellProps = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  formatValue?: (value: string) => ReactNode;
  onSave: (value: string) => Promise<void> | void;
  value: string;
};

type DashboardDataTableInlineDateTimeCellProps = DashboardDataTableInlineDateCellProps;

type DashboardDataTableBulkAction<TData> = {
  disabled?: (rows: Array<TData>) => boolean;
  label: string;
  onSelect: (rows: Array<TData>) => Promise<void> | void;
};

type DashboardDataTableRowAction<TData> = {
  label: string;
  onSelect: (rows: Array<TData>) => Promise<void> | void;
};

type DashboardDataTableFilter = {
  columnId: string;
  label: string;
  options: Array<DashboardDataTableFilterOption>;
};
type DashboardDataTableExportOptions<TData> = {
  filename: string;
  getValue?: (row: TData, columnId: string) => string | number | null | undefined;
};

type DashboardDataTableProps<TData, TValue> = {
  bulkActions?: Array<DashboardDataTableBulkAction<TData>>;
  columns: Array<ColumnDef<TData, TValue>>;
  data: Array<TData>;
  emptyMessage: string;
  enableRowSelection?: boolean;
  enableVirtualization?: boolean;
  exportOptions?: DashboardDataTableExportOptions<TData>;
  filters?: Array<DashboardDataTableFilter>;
  globalFilterFn?: "auto" | "includesString";
  queryPrefix?: string;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  rowActions?: Array<DashboardDataTableRowAction<TData>>;
  searchPlaceholder?: string;
};

type DashboardDataTableFilterContextValue = {
  filtersByColumnId: Map<string, DashboardDataTableFilter>;
};

const DashboardDataTableFilterContext = createContext<DashboardDataTableFilterContextValue>({
  filtersByColumnId: new Map(),
});

function getQueryKey(prefix: string, key: string) {
  if (!prefix) return key;
  return `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function DashboardDataTable<TData, TValue>({
  bulkActions = [],
  columns,
  data,
  emptyMessage,
  enableRowSelection = false,
  enableVirtualization = false,
  exportOptions,
  filters = [],
  getRowId,
  globalFilterFn = "includesString",
  queryPrefix = "",
  rowActions = [],
  searchPlaceholder = "Search table...",
}: DashboardDataTableProps<TData, TValue>) {
  const queryParsers = useMemo(
    () => ({
      [getQueryKey(queryPrefix, "dir")]: parseAsString.withDefault("asc"),
      [getQueryKey(queryPrefix, "page")]: parseAsInteger.withDefault(1),
      [getQueryKey(queryPrefix, "pageSize")]: parseAsInteger.withDefault(10),
      [getQueryKey(queryPrefix, "q")]: parseAsString.withDefault(""),
      [getQueryKey(queryPrefix, "sort")]: parseAsString.withDefault(""),
    }),
    [queryPrefix],
  );
  const [query, setQuery] = useQueryStates(queryParsers);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const dirKey = getQueryKey(queryPrefix, "dir");
  const pageKey = getQueryKey(queryPrefix, "page");
  const pageSizeKey = getQueryKey(queryPrefix, "pageSize");
  const qKey = getQueryKey(queryPrefix, "q");
  const sortKey = getQueryKey(queryPrefix, "sort");

  const page = Math.max(1, Number(query[pageKey]));
  const pageSize = Math.max(1, Number(query[pageSizeKey]));
  const search = String(query[qKey] ?? "");
  const sort = String(query[sortKey] ?? "");
  const dir = String(query[dirKey] ?? "asc");

  const sorting = useMemo<SortingState>(() => {
    if (!sort) return [];
    return [{ id: sort, desc: dir === "desc" }];
  }, [dir, sort]);

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize],
  );

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = typeof updater === "function" ? updater(sorting) : updater;
    const [next] = nextSorting as Array<SortingState[number] | undefined>;
    if (!next) {
      void setQuery({
        [dirKey]: "asc",
        [pageKey]: 1,
        [sortKey]: "",
      });
      return;
    }

    void setQuery({
      [dirKey]: next.desc ? "desc" : "asc",
      [pageKey]: 1,
      [sortKey]: next.id,
    });
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const nextPagination = typeof updater === "function" ? updater(pagination) : updater;
    void setQuery({
      [pageKey]: nextPagination.pageIndex + 1,
      [pageSizeKey]: nextPagination.pageSize,
    });
  };

  const selectColumn = useMemo<ColumnDef<TData, TValue>>(
    () => ({
      id: "select",
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => {
        const allRowsSelected = enableVirtualization
          ? table.getIsAllRowsSelected()
          : table.getIsAllPageRowsSelected();
        const someRowsSelected = enableVirtualization
          ? table.getIsSomeRowsSelected()
          : table.getIsSomePageRowsSelected();

        return (
          <Checkbox
            aria-label={
              enableVirtualization ? "Select all filtered rows" : "Select all visible rows"
            }
            checked={allRowsSelected}
            data-indeterminate={someRowsSelected && !allRowsSelected ? "" : undefined}
            onCheckedChange={(value) => {
              if (enableVirtualization) {
                table.toggleAllRowsSelected(Boolean(value));
                return;
              }

              table.toggleAllPageRowsSelected(Boolean(value));
            }}
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
    }),
    [enableVirtualization],
  );

  const tableColumns = useMemo(
    () => (enableRowSelection ? [selectColumn, ...columns] : columns),
    [columns, enableRowSelection, selectColumn],
  );

  const filtersByColumnId = useMemo(
    () => new Map(filters.map((filter) => [filter.columnId, filter])),
    [filters],
  );

  const table = useReactTable({
    columns: tableColumns,
    data,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId,
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater);
      void setQuery({ [pageKey]: 1 });
    },
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: (value) => {
      void setQuery({ [pageKey]: 1, [qKey]: String(value) });
    },
    onPaginationChange: handlePaginationChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: handleSortingChange,
    state: {
      columnFilters,
      columnVisibility,
      globalFilter: search,
      pagination,
      rowSelection,
      sorting,
    },
  });

  useEffect(() => {
    const pageCount = table.getPageCount();
    if (pageCount === 0 || page <= pageCount) return;
    void setQuery({ [pageKey]: pageCount });
  }, [page, pageKey, setQuery, table]);

  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const rows = enableVirtualization
    ? table.getPrePaginationRowModel().rows
    : table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: rows.length,
    enabled: enableVirtualization,
    estimateSize: () => 56,
    getScrollElement: () => tableContainerRef.current,
    overscan: 8,
  });
  const virtualRows = enableVirtualization ? virtualizer.getVirtualItems() : [];
  const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
  const hasFilters = columnFilters.length > 0 || search.length > 0;
  const exportRows =
    selectedRows.length > 0
      ? selectedRows
      : table.getFilteredRowModel().rows.map((row) => row.original);
  const canExport = Boolean(exportOptions && exportRows.length > 0);

  function getContextRows(row: Row<TData>) {
    if (enableRowSelection && row.getIsSelected()) return selectedRows;
    return [row.original];
  }

  async function runRowAction(action: DashboardDataTableRowAction<TData>, row: Row<TData>) {
    await action.onSelect(getContextRows(row));
    setRowSelection({});
  }

  function clearFilters() {
    setColumnFilters([]);
    void setQuery({ [pageKey]: 1, [qKey]: "" });
  }
  function exportCsv() {
    if (!exportOptions) return;
    const exportColumns = table
      .getVisibleLeafColumns()
      .filter((column) => column.id !== "select" && column.id !== "actions");
    const csv = buildCsv(
      exportColumns.map((column) => getColumnLabel(column)),
      exportRows.map((row) =>
        exportColumns.map((column) => getExportCellValue(row, column, exportOptions)),
      ),
    );
    downloadCsv(exportOptions.filename, csv);
  }

  return (
    <DashboardDataTableFilterContext.Provider value={{ filtersByColumnId }}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm lg:flex-1">
            <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="ps-8"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => table.setGlobalFilter(event.target.value)}
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
            {enableRowSelection && selectedRows.length > 0 ? (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedRows.length} of {table.getFilteredRowModel().rows.length} selected
                </span>
                {bulkActions.map((action) => (
                  <Button
                    key={action.label}
                    disabled={action.disabled?.(selectedRows) ?? false}
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await action.onSelect(selectedRows);
                      setRowSelection({});
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
                  Clear selection
                </Button>
              </>
            ) : null}
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <XIcon data-icon="inline-start" />
                Clear filters
              </Button>
            ) : null}
            {exportOptions ? (
              <Button variant="outline" size="sm" disabled={!canExport} onClick={exportCsv}>
                <DownloadIcon data-icon="inline-start" />
                {selectedRows.length > 0 ? "Export selected" : "Export CSV"}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                <Columns3Icon data-icon="inline-start" />
                Columns
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllLeafColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                      >
                        {getColumnLabel(column)}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div
          ref={tableContainerRef}
          className={cn(
            "overflow-auto rounded-md border",
            enableVirtualization && "max-h-[calc(100svh-13rem)] min-h-0",
          )}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur supports-[backdrop-filter]:bg-muted/75">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumnCount}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {data.length === 0 ? emptyMessage : "No rows match this search."}
                  </TableCell>
                </TableRow>
              ) : enableVirtualization ? (
                <VirtualizedRows
                  rowActions={rowActions}
                  runRowAction={runRowAction}
                  rows={rows}
                  totalSize={virtualizer.getTotalSize()}
                  virtualRows={virtualRows}
                />
              ) : (
                rows.map((row) => (
                  <DashboardDataTableRow
                    key={row.id}
                    row={row}
                    rowActions={rowActions}
                    runRowAction={runRowAction}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Showing {rows.length} of {table.getFilteredRowModel().rows.length} rows
          </div>
          {!enableVirtualization ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Previous
              </Button>
              <span className="tabular-nums">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {Math.max(1, table.getPageCount())}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </DashboardDataTableFilterContext.Provider>
  );
}

type DashboardDataTableColumnHeaderProps<TData, TValue> = {
  className?: string;
  column: Column<TData, TValue>;
  title: string;
};

export function DashboardDataTableColumnHeader<TData, TValue>({
  className,
  column,
  title,
}: DashboardDataTableColumnHeaderProps<TData, TValue>) {
  const { filtersByColumnId } = useContext(DashboardDataTableFilterContext);
  const filter = filtersByColumnId.get(column.id);
  const isSorted = column.getIsSorted();

  function toggleSorting() {
    if (isSorted === "desc") {
      column.clearSorting();
      return;
    }

    column.toggleSorting(isSorted === "asc");
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {column.getCanSort() ? (
        <button
          type="button"
          className="-ms-2 inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          onClick={toggleSorting}
        >
          <span>{title}</span>
          {isSorted === "desc" ? (
            <ArrowDownIcon className="size-4" />
          ) : isSorted === "asc" ? (
            <ArrowUpIcon className="size-4" />
          ) : (
            <ChevronsUpDownIcon className="size-4" />
          )}
        </button>
      ) : (
        <span>{title}</span>
      )}
      {filter ? (
        <DashboardDataTableFacetedFilter
          column={column}
          label={filter.label}
          options={filter.options}
        />
      ) : null}
    </div>
  );
}

function getColumnLabel<TData, TValue>(column: Column<TData, TValue>) {
  const header = column.columnDef.header;
  if (typeof header === "string") return header;

  return column.id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getExportCellValue<TData, TValue>(
  row: TData,
  column: Column<TData, TValue>,
  exportOptions: DashboardDataTableExportOptions<TData>,
) {
  const customValue = exportOptions.getValue?.(row, column.id);
  if (customValue !== undefined) return customValue ?? "";
  const value = column.accessorFn?.(row, 0);
  if (value === null || value === undefined) return "";
  return value;
}

function escapeCsvCell(value: unknown) {
  const text = String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(headers: Array<string>, rows: Array<Array<unknown>>) {
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DashboardDataTableRow<TData>({
  row,
  rowActions,
  runRowAction,
}: {
  row: Row<TData>;
  rowActions: Array<DashboardDataTableRowAction<TData>>;
  runRowAction: (action: DashboardDataTableRowAction<TData>, row: Row<TData>) => Promise<void>;
}) {
  function renderRow() {
    return (
      <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    );
  }

  if (rowActions.length === 0) return renderRow();

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger render={renderRow()} />
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Positioner className="isolate z-50 outline-none">
          <ContextMenuPrimitive.Popup className="relative z-50 min-w-40 origin-(--transform-origin) overflow-hidden rounded-md bg-popover/70 p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <ContextMenuPrimitive.Group>
              {rowActions.map((action) => (
                <ContextMenuPrimitive.Item
                  key={action.label}
                  className="relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                  onClick={() => void runRowAction(action, row)}
                >
                  {action.label}
                </ContextMenuPrimitive.Item>
              ))}
            </ContextMenuPrimitive.Group>
          </ContextMenuPrimitive.Popup>
        </ContextMenuPrimitive.Positioner>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

export function DashboardDataTableInlineTextCell({
  ariaLabel,
  className,
  disabled = false,
  formatValue,
  inputMode,
  onSave,
  placeholder,
  type = "text",
  value,
}: DashboardDataTableInlineTextCellProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  async function save(nextValue = draft) {
    const normalized = nextValue.trim();
    if (normalized === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(normalized);
      setEditing(false);
    } catch (err) {
      setDraft(value);
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className={cn("flex min-w-28 flex-col items-start gap-1", className)}>
        <Button
          aria-label={ariaLabel}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          className="h-8 justify-start px-1.5 font-normal"
          onClick={() => setEditing(true)}
        >
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          {formatValue ? formatValue(value) : value}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-28 flex-col items-start gap-1", className)}>
      <Input
        aria-label={ariaLabel}
        autoFocus
        disabled={disabled || saving}
        inputMode={inputMode}
        placeholder={placeholder}
        type={type}
        value={draft}
        onBlur={() => void save()}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void save();
          if (event.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-8 min-w-28 px-1.5"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function DashboardDataTableInlineDateCell({
  ariaLabel,
  className,
  disabled = false,
  formatValue,
  onSave,
  value,
}: DashboardDataTableInlineDateCellProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  async function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setDraft(value);
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className={cn("flex min-w-40 flex-col items-start gap-1", className)}>
        <Button
          aria-label={ariaLabel}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          className="h-8 justify-start px-1.5 font-normal text-muted-foreground"
          onClick={() => setEditing(true)}
        >
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          {formatValue ? formatValue(value) : value}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-44 flex-col items-start gap-1", className)}>
      <DatePickerField
        value={draft}
        onChange={setDraft}
        onBlur={() => void save()}
        placeholder="Pick date"
      />
      <div className="flex items-center gap-1">
        <Button type="button" size="xs" disabled={disabled || saving} onClick={() => void save()}>
          Save
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function DashboardDataTableInlineDateTimeCell({
  ariaLabel,
  className,
  disabled = false,
  formatValue,
  onSave,
  value,
}: DashboardDataTableInlineDateTimeCellProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  async function save() {
    if (draft === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      setDraft(value);
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className={cn("flex min-w-40 flex-col items-start gap-1", className)}>
        <Button
          aria-label={ariaLabel}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          className="h-8 justify-start px-1.5 font-normal text-muted-foreground"
          onClick={() => setEditing(true)}
        >
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          {formatValue ? formatValue(value) : value}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-48 flex-col items-start gap-1", className)}>
      <DateTimePickerField
        value={draft}
        onChange={setDraft}
        onBlur={() => void save()}
        placeholder="Pick date and time"
      />
      <div className="flex items-center gap-1">
        <Button type="button" size="xs" disabled={disabled || saving} onClick={() => void save()}>
          Save
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={saving}
          onClick={() => {
            setDraft(value);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type DashboardDataTableInlineSelectCellProps<TValue extends string> = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onSave: (value: TValue) => Promise<void> | void;
  options: Array<DashboardDataTableInlineSelectOption<TValue>>;
  renderValue?: (value: TValue) => ReactNode;
  value: TValue;
};
export function DashboardDataTableInlineComboboxCell<TItem, TValue extends string>({
  ariaLabel,
  className,
  disabled = false,
  getItemKey,
  itemToStringLabel,
  itemToStringValue,
  items,
  onSave,
  placeholder = "Search",
  renderItem,
  renderValue,
  value,
  valueFromItem,
}: DashboardDataTableInlineComboboxCellProps<TItem, TValue>) {
  const selectedItem = items.find((item) => valueFromItem(item) === value) ?? null;
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleValueChange(item: TItem | Array<TItem> | null) {
    if (!item || Array.isArray(item)) return;
    const nextValue = valueFromItem(item);
    if (nextValue === value) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(nextValue, item);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("flex min-w-40 flex-col items-start gap-1", className)}>
      {open ? (
        <Combobox
          items={items}
          open={open}
          value={selectedItem}
          itemToStringLabel={itemToStringLabel}
          itemToStringValue={itemToStringValue}
          onOpenChange={setOpen}
          onValueChange={handleValueChange}
        >
          <ComboboxInput
            aria-label={ariaLabel}
            autoFocus
            disabled={disabled || saving}
            placeholder={placeholder}
            showClear
            className="h-8 w-full"
          />
          <ComboboxContent>
            <ComboboxEmpty>No matches found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={getItemKey(item)} value={item}>
                  {renderItem ? renderItem(item) : itemToStringLabel(item)}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      ) : (
        <Button
          aria-label={ariaLabel}
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || saving}
          className={cn(
            "h-8 w-full justify-start px-1.5 font-normal text-left [&_span]:min-w-0",
            className,
          )}
          onClick={() => setOpen(true)}
        >
          {saving ? <Loader2Icon className="animate-spin" /> : null}
          {renderValue ? renderValue(value) : value}
        </Button>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function DashboardDataTableInlineSelectCell<TValue extends string>({
  ariaLabel,
  className,
  disabled = false,
  onSave,
  options,
  renderValue,
  value,
}: DashboardDataTableInlineSelectCellProps<TValue>) {
  const [draft, setDraft] = useState<TValue>(value);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setDraft(value);
  }, [open, value]);

  async function handleValueChange(nextValue: TValue | Array<TValue> | null) {
    if (!nextValue || Array.isArray(nextValue)) return;

    setDraft(nextValue);
    if (nextValue === value) return;

    setSaving(true);
    setError("");
    try {
      await onSave(nextValue);
      setOpen(false);
    } catch (err) {
      setDraft(value);
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("flex min-w-32 flex-col items-start gap-1", className)}>
      <Select open={open} value={draft} onOpenChange={setOpen} onValueChange={handleValueChange}>
        <SelectTrigger
          aria-label={ariaLabel}
          disabled={disabled || saving}
          size="sm"
          className="w-full min-w-32 justify-between border-transparent bg-transparent px-1.5 shadow-none hover:bg-muted/70 data-[popup-open]:border-input data-[popup-open]:bg-background"
        >
          <SelectValue>{renderValue ? renderValue(draft) : draft}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="min-w-36">
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {renderValue ? renderValue(option.value) : option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

type VirtualizedRowsProps<TData> = {
  rowActions: Array<DashboardDataTableRowAction<TData>>;
  rows: Array<Row<TData>>;
  runRowAction: (action: DashboardDataTableRowAction<TData>, row: Row<TData>) => Promise<void>;
  totalSize: number;
  virtualRows: Array<VirtualItem>;
};

function VirtualizedRows<TData>({
  rowActions,
  rows,
  runRowAction,
  totalSize,
  virtualRows,
}: VirtualizedRowsProps<TData>) {
  if (virtualRows.length === 0) return null;

  const firstVirtualRow = virtualRows[0];
  const lastVirtualRow = virtualRows[virtualRows.length - 1];
  const paddingTop = firstVirtualRow.start;
  const paddingBottom = Math.max(0, totalSize - lastVirtualRow.end);

  return (
    <>
      {paddingTop > 0 ? (
        <TableRow aria-hidden="true">
          <TableCell
            colSpan={rows[0]?.getVisibleCells().length ?? 1}
            style={{ height: paddingTop }}
          />
        </TableRow>
      ) : null}
      {virtualRows.map((virtualRow) => {
        const row = rows[virtualRow.index];
        return (
          <DashboardDataTableRow
            key={virtualRow.key}
            row={row}
            rowActions={rowActions}
            runRowAction={runRowAction}
          />
        );
      })}
      {paddingBottom > 0 ? (
        <TableRow aria-hidden="true">
          <TableCell
            colSpan={rows[0]?.getVisibleCells().length ?? 1}
            style={{ height: paddingBottom }}
          />
        </TableRow>
      ) : null}
    </>
  );
}

function DashboardDataTableFacetedFilter<TData, TValue>({
  column,
  label,
  options,
}: {
  column: Column<TData, TValue>;
  label: string;
  options: Array<DashboardDataTableFilterOption>;
}) {
  const selectedValues = new Set(
    Array.isArray(column.getFilterValue()) ? (column.getFilterValue() as Array<string>) : [],
  );
  const facetedValues = column.getFacetedUniqueValues();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Filter ${label}`}
            variant={selectedValues.size > 0 ? "secondary" : "ghost"}
            size={selectedValues.size > 0 ? "xs" : "icon-xs"}
            className="-my-1"
          />
        }
      >
        <FilterIcon className="size-3.5" />
        {selectedValues.size > 0 ? <span>{selectedValues.size}</span> : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label} is</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);
            const count = facetedValues.get(option.value) ?? 0;
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={isSelected}
                onCheckedChange={(checked) => {
                  const next = new Set(selectedValues);
                  if (checked) next.add(option.value);
                  else next.delete(option.value);
                  column.setFilterValue(next.size ? Array.from(next) : undefined);
                }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {isSelected ? <CheckIcon data-icon="inline-start" /> : null}
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="ms-auto text-xs text-muted-foreground tabular-nums">{count}</span>
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
