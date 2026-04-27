/**
 * Query option factories for staff data.
 *
 * Loaders call `ensureQueryData()` to prewarm the cache.
 * Components call `useSuspenseQuery()` to subscribe to live data.
 */

import { queryOptions } from "@tanstack/react-query"

import type { StaffDashboardData } from "@/lib/queries"
import {
  getFlightPassengersFn,
  getStaffDashboardFn,
  getStaffReportFn,
  listAllAirlinesFn,
  listAllAirportsFn,
  listAllCustomersFn,
  listAllStaffFn,
} from "@/lib/queries"

export type StaffFilters = {
  destination: string
  endDate: string
  source: string
  startDate: string
}

const DEFAULT_FILTERS: StaffFilters = {
  destination: "",
  endDate: "",
  source: "",
  startDate: "",
}

export function staffDashboardQueryOptions(filters?: StaffFilters) {
  const f = filters ?? DEFAULT_FILTERS
  return queryOptions<StaffDashboardData>({
    queryKey: ["staff-dashboard", f] as const,
    queryFn: () => getStaffDashboardFn({ data: f }),
    staleTime: 30_000,
  })
}

export function staffPassengersQueryOptions(flight: {
  airlineName: string
  departureDatetime: string
  flightNumber: string
}) {
  return queryOptions({
    queryKey: [
      "staff-passengers",
      flight.airlineName,
      flight.flightNumber,
      flight.departureDatetime,
    ] as const,
    queryFn: () => getFlightPassengersFn({ data: flight }),
    staleTime: 15_000,
  })
}

export function staffReportQueryOptions(range: {
  endDate: string
  startDate: string
}) {
  return queryOptions({
    queryKey: ["staff-report", range.startDate, range.endDate] as const,
    queryFn: () => getStaffReportFn({ data: range }),
    staleTime: 60_000,
  })
}

export function staffCustomersQueryOptions() {
  return queryOptions({
    queryKey: ["staff-customers"] as const,
    queryFn: () => listAllCustomersFn(),
    staleTime: 30_000,
  })
}

export function staffMembersQueryOptions() {
  return queryOptions({
    queryKey: ["staff-members"] as const,
    queryFn: () => listAllStaffFn(),
    staleTime: 30_000,
  })
}

export function staffAirlinesQueryOptions() {
  return queryOptions({
    queryKey: ["staff-airlines"] as const,
    queryFn: () => listAllAirlinesFn(),
    staleTime: 30_000,
  })
}

export function staffAirportsQueryOptions() {
  return queryOptions({
    queryKey: ["staff-airports"] as const,
    queryFn: () => listAllAirportsFn(),
    staleTime: 30_000,
  })
}
