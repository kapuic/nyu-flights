import { createServerFn } from "@tanstack/react-start"

import {
  addAirplaneSchema,
  airportSuggestionSchema,
  createFlightSchema,
  customerFlightFiltersSchema,
  flightPassengersSchema,
  purchaseTicketSchema,
  reportRangeSchema,
  reviewSchema,
  searchFlightsSchema,
  staffFlightFiltersSchema,
  updateStatusSchema,
} from "@/lib/schemas"
import {
  addAirplaneInternal,
  createFlightInternal,
  getCustomerDashboardInternal,
  getFlightPassengersInternal,
  getStaffDashboardInternal,
  getStaffReportInternal,
  listGlobeRoutesInternal,
  listReferenceData,
  purchaseTicketInternal,
  searchAirportsInternal,
  searchFlightsInternal,
  submitReviewInternal,
  updateFlightStatusInternal,
} from "@/lib/queries.server"

export type FlightOption = {
  airlineName: string
  arrivalAirportCode: string
  arrivalAirportName: string
  arrivalCity: string
  arrivalDatetime: string
  averageRating: number | null
  availableSeats: number
  basePrice: number
  departureAirportCode: string
  departureAirportName: string
  departureCity: string
  departureDatetime: string
  flightNumber: string
  reviewCount: number
  status: "on_time" | "delayed"
}

export type FlightSearchResponse = {
  outbound: Array<FlightOption>
  returnOptions: Array<FlightOption>
  tripType: "one-way" | "round-trip"
}

export type CustomerFlight = FlightOption & {
  canReview: boolean
  comment: string | null
  purchaseDatetime: string
  rating: number | null
}

export type CustomerDashboardData = {
  currentUser: {
    displayName: string
    email: string
  }
  pastFlights: Array<CustomerFlight>
  upcomingFlights: Array<CustomerFlight>
}

export type PassengerRecord = {
  customerEmail: string
  customerName: string
  passportNumber: string
  purchaseDatetime: string
  ticketId: number
}

export type StaffDashboardData = {
  airlineName: string
  airplanes: Array<{
    airplaneId: string
    manufacturingCompany: string
    manufacturingDate: string
    numberOfSeats: number
  }>
  airports: Array<{
    city: string
    code: string
    country: string
  }>
  flights: Array<FlightOption & { ticketCount: number }>
  monthlySales: Array<{ month: string; ticketsSold: number }>
  ratings: Array<{
    averageRating: number | null
    comments: Array<string>
    departureDatetime: string
    flightNumber: string
    reviewCount: number
  }>
  reportSummary: {
    lastMonthTickets: number
    lastYearTickets: number
    totalTickets: number
  }
}

export const listReferenceDataFn = createServerFn({ method: "GET" }).handler(
  async () => listReferenceData()
)

export type GlobeRoute = {
  arrivalCode: string
  departureCode: string
}

export const listGlobeRoutesFn = createServerFn({ method: "GET" }).handler(
  async () => listGlobeRoutesInternal()
)

export const searchAirportsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => airportSuggestionSchema.parse(data))
  .handler(async ({ data }) => searchAirportsInternal(data))

export const searchFlightsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchFlightsSchema.parse(data))
  .handler(async ({ data }) => searchFlightsInternal(data))

export const getCustomerDashboardFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerFlightFiltersSchema.parse(data))
  .handler(async ({ data }) => getCustomerDashboardInternal(data))

export const getStaffDashboardFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => staffFlightFiltersSchema.parse(data))
  .handler(async ({ data }) => getStaffDashboardInternal(data))

export const purchaseTicketFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => purchaseTicketSchema.parse(data))
  .handler(async ({ data }) => purchaseTicketInternal(data))

export const submitReviewFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ data }) => submitReviewInternal(data))

export const createFlightFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createFlightSchema.parse(data))
  .handler(async ({ data }) => createFlightInternal(data))

export const updateFlightStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateStatusSchema.parse(data))
  .handler(async ({ data }) => updateFlightStatusInternal(data))

export const addAirplaneFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => addAirplaneSchema.parse(data))
  .handler(async ({ data }) => addAirplaneInternal(data))

export const getFlightPassengersFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => flightPassengersSchema.parse(data))
  .handler(async ({ data }) => getFlightPassengersInternal(data))

export const getStaffReportFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reportRangeSchema.parse(data))
  .handler(async ({ data }) => getStaffReportInternal(data))
