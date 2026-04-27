import { useEffect, useMemo, useState } from "react"
import {
  type Column,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { parseAsInteger, parseAsString, useQueryStates } from "nuqs"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  Columns3Icon,
  SearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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

type DashboardDataTableProps<TData, TValue> = {
  columns: Array<ColumnDef<TData, TValue>>
  data: Array<TData>
  emptyMessage: string
  globalFilterFn?: "auto" | "includesString"
  searchPlaceholder?: string
  queryPrefix?: string
}

function getQueryKey(prefix: string, key: string) {
  if (!prefix) return key
  return `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`
}

export function DashboardDataTable<TData, TValue>({
  columns,
  data,
  emptyMessage,
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

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

  const table = useReactTable({
    columns,
    data,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: (value) => {
      void setQuery({ [pageKey]: 1, [qKey]: String(value) })
    },
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    state: {
      columnVisibility,
      globalFilter: search,
      pagination,
      sorting,
    },
  })

  useEffect(() => {
    const pageCount = table.getPageCount()
    if (pageCount === 0 || page <= pageCount) return
    void setQuery({ [pageKey]: pageCount })
  }, [page, pageKey, setQuery, table])

  const visibleColumnCount = table.getVisibleLeafColumns().length
  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
          />
        </div>
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

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader className="bg-muted/40">
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
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div>
          Showing {rows.length} of {table.getFilteredRowModel().rows.length} rows
        </div>
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
      onClick={() => column.toggleSorting(isSorted === "asc")}
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
