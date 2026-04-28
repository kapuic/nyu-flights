import { useEffect, useMemo, useRef, useState } from "react"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { type VirtualItem, useVirtualizer } from "@tanstack/react-virtual"
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  Columns3Icon,
  FilterIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type DashboardDataTableFilterOption = {
  label: string
  value: string
}

type DashboardDataTableBulkAction<TData> = {
  label: string
  onSelect: (rows: Array<TData>) => Promise<void> | void
}

type DashboardDataTableFilter = {
  columnId: string
  label: string
  options: Array<DashboardDataTableFilterOption>
}

type DashboardDataTableProps<TData, TValue> = {
  bulkActions?: Array<DashboardDataTableBulkAction<TData>>
  columns: Array<ColumnDef<TData, TValue>>
  data: Array<TData>
  emptyMessage: string
  enableRowSelection?: boolean
  enableVirtualization?: boolean
  filters?: Array<DashboardDataTableFilter>
  globalFilterFn?: "auto" | "includesString"
  searchPlaceholder?: string
  queryPrefix?: string
}

function getQueryKey(prefix: string, key: string) {
  if (!prefix) return key
  return `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`
}

export function DashboardDataTable<TData, TValue>({
  bulkActions = [],
  columns,
  data,
  emptyMessage,
  enableRowSelection = false,
  enableVirtualization = false,
  filters = [],
  globalFilterFn = "includesString",
  searchPlaceholder = "Search table...",
  queryPrefix = "",
}: DashboardDataTableProps<TData, TValue>) {
  const queryParsers = useMemo(
    () => ({
      [getQueryKey(queryPrefix, "dir")]: parseAsString.withDefault("asc"),
      [getQueryKey(queryPrefix, "page")]: parseAsInteger.withDefault(1),
      [getQueryKey(queryPrefix, "pageSize")]: parseAsInteger.withDefault(10),
      [getQueryKey(queryPrefix, "q")]: parseAsString.withDefault(""),
      [getQueryKey(queryPrefix, "sort")]: parseAsString.withDefault(""),
    }),
    [queryPrefix]
  )
  const [query, setQuery] = useQueryStates(queryParsers)
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const dirKey = getQueryKey(queryPrefix, "dir")
  const pageKey = getQueryKey(queryPrefix, "page")
  const pageSizeKey = getQueryKey(queryPrefix, "pageSize")
  const qKey = getQueryKey(queryPrefix, "q")
  const sortKey = getQueryKey(queryPrefix, "sort")

  const page = Math.max(1, Number(query[pageKey]))
  const pageSize = Math.max(1, Number(query[pageSizeKey]))
  const search = String(query[qKey] ?? "")
  const sort = String(query[sortKey] ?? "")
  const dir = String(query[dirKey] ?? "asc")

  const sorting = useMemo<SortingState>(() => {
    if (!sort) return []
    return [{ id: sort, desc: dir === "desc" }]
  }, [dir, sort])

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: page - 1, pageSize }),
    [page, pageSize]
  )

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting =
      typeof updater === "function" ? updater(sorting) : updater
    const next = nextSorting[0]
    void setQuery({
      [dirKey]: next?.desc ? "desc" : "asc",
      [pageKey]: 1,
      [sortKey]: next?.id ?? "",
    })
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const nextPagination =
      typeof updater === "function" ? updater(pagination) : updater
    void setQuery({
      [pageKey]: nextPagination.pageIndex + 1,
      [pageSizeKey]: nextPagination.pageSize,
    })
  }

  const selectColumn = useMemo<ColumnDef<TData, TValue>>(
    () => ({
      id: "select",
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all visible rows"
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(Boolean(value))
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
        />
      ),
    }),
    []
  )

  const tableColumns = useMemo(
    () => (enableRowSelection ? [selectColumn, ...columns] : columns),
    [columns, enableRowSelection, selectColumn]
  )

  const table = useReactTable({
    columns: tableColumns,
    data,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: (value) => {
      void setQuery({ [pageKey]: 1, [qKey]: String(value) })
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
  })

  useEffect(() => {
    const pageCount = table.getPageCount()
    if (pageCount === 0 || page <= pageCount) return
    void setQuery({ [pageKey]: pageCount })
  }, [page, pageKey, setQuery, table])

  const visibleColumnCount = table.getVisibleLeafColumns().length
  const rows = enableVirtualization
    ? table.getPrePaginationRowModel().rows
    : table.getRowModel().rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    enabled: enableVirtualization,
    estimateSize: () => 56,
    getScrollElement: () => tableContainerRef.current,
    overscan: 8,
  })
  const virtualRows = enableVirtualization ? virtualizer.getVirtualItems() : []
  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original)
  const hasFilters = columnFilters.length > 0 || search.length > 0

  function clearFilters() {
    setColumnFilters([])
    void setQuery({ [pageKey]: 1, [qKey]: "" })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DashboardDataTableFacetedFilter
                key={filter.columnId}
                column={column}
                label={filter.label}
                options={filter.options}
              />
            )
          })}
          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <XIcon data-icon="inline-start" />
              Clear
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
                      onCheckedChange={(value) =>
                        column.toggleVisibility(Boolean(value))
                      }
                    >
                      {getColumnLabel(column)}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {enableRowSelection && selectedRows.length > 0 ? (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {selectedRows.length} of {table.getFilteredRowModel().rows.length} selected
          </span>
        <div className="flex items-center gap-2">
          {bulkActions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              size="sm"
              onClick={async () => {
                await action.onSelect(selectedRows)
                setRowSelection({})
              }}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear selection
          </Button>
        </div>
        </div>
      ) : null}

      <div
        ref={tableContainerRef}
        className={cn(
          "overflow-auto rounded-md border",
          enableVirtualization && "max-h-[560px]"
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                rows={rows}
                totalSize={virtualizer.getTotalSize()}
                virtualRows={virtualRows}
              />
            ) : (
              rows.map((row) => <DashboardDataTableRow key={row.id} row={row} />)
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        {enableVirtualization ? (
          <div>
            Showing {rows.length} of {table.getFilteredRowModel().rows.length} rows
          </div>
        ) : (
          <div>
            Showing {rows.length} of {table.getFilteredRowModel().rows.length} rows
          </div>
        )}
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
              Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
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
  )
}

type DashboardDataTableColumnHeaderProps<TData, TValue> = {
  className?: string
  column: Column<TData, TValue>
  title: string
}

export function DashboardDataTableColumnHeader<TData, TValue>({
  className,
  column,
  title,
}: DashboardDataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) return <span className={className}>{title}</span>

  const isSorted = column.getIsSorted()

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ms-2 px-2", className)}
      onClick={() => {
        if (isSorted === "desc") {
          column.clearSorting()
          return
        }
        column.toggleSorting(isSorted === "asc")
      }}
    >
      <span>{title}</span>
      {isSorted === "desc" ? (
        <ArrowDownIcon data-icon="inline-end" />
      ) : isSorted === "asc" ? (
        <ArrowUpIcon data-icon="inline-end" />
      ) : (
        <ChevronsUpDownIcon data-icon="inline-end" />
      )}
    </Button>
  )
}

function getColumnLabel<TData, TValue>(column: Column<TData, TValue>) {
  const header = column.columnDef.header
  if (typeof header === "string") return header

  return column.id
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase())
}

function DashboardDataTableRow<TData>({ row }: { row: Row<TData> }) {
  return (
    <TableRow data-state={row.getIsSelected() ? "selected" : undefined}>
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

type VirtualizedRowsProps<TData> = {
  rows: Array<Row<TData>>
  totalSize: number
  virtualRows: Array<VirtualItem>
}

function VirtualizedRows<TData>({
  rows,
  totalSize,
  virtualRows,
}: VirtualizedRowsProps<TData>) {
  const firstVirtualRow = virtualRows[0]
  const lastVirtualRow = virtualRows.at(-1)
  const paddingTop = firstVirtualRow?.start ?? 0
  const paddingBottom = lastVirtualRow
    ? Math.max(0, totalSize - lastVirtualRow.end)
    : 0

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
        const row = rows[virtualRow.index]
        if (!row) return null
        return <DashboardDataTableRow key={virtualRow.key} row={row} />
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
  )
}

function DashboardDataTableFacetedFilter<TData, TValue>({
  column,
  label,
  options,
}: {
  column: Column<TData, TValue>
  label: string
  options: Array<DashboardDataTableFilterOption>
}) {
  const selectedValues = new Set(
    Array.isArray(column.getFilterValue())
      ? (column.getFilterValue() as Array<string>)
      : []
  )
  const facetedValues = column.getFacetedUniqueValues()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <FilterIcon data-icon="inline-start" />
        {label}
        {selectedValues.size > 0 ? (
          <span className="ms-1 text-xs text-muted-foreground">
            {selectedValues.size}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{label} is</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value)
            const count = facetedValues.get(option.value) ?? 0
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={isSelected}
                onCheckedChange={(checked) => {
                  const next = new Set(selectedValues)
                  if (checked) next.add(option.value)
                  else next.delete(option.value)
                  column.setFilterValue(next.size ? Array.from(next) : undefined)
                }}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {isSelected ? <CheckIcon data-icon="inline-start" /> : null}
                  <span className="truncate">{option.label}</span>
                </span>
                <span className="ms-auto text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
