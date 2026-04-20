import { createServerFn } from "@tanstack/react-start"

import {
  addAirplaneSchema,
  createFlightSchema,
  flightPassengersSchema,
  purchaseTicketSchema,
  reportRangeSchema,
  reviewSchema,
  searchFlightsSchema,
  updateStatusSchema,
} from "@/lib/schemas"
import {
  addAirplaneInternal,
  createFlightInternal,
  getCustomerDashboardInternal,
  getFlightPassengersInternal,
  getStaffDashboardInternal,
  getStaffReportInternal,
  listReferenceData,
  purchaseTicketInternal,
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
  outbound: FlightOption[]
  returnOptions: FlightOption[]
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
  pastFlights: CustomerFlight[]
  upcomingFlights: CustomerFlight[]
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
    comments: string[]
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

export const listReferenceDataFn = createServerFn({ method: "GET" }).handler(async () => listReferenceData())

export const searchFlightsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchFlightsSchema.parse(data))
  .handler(async ({ data }) => searchFlightsInternal(data))

export const getCustomerDashboardFn = createServerFn({ method: "GET" }).handler(async () => getCustomerDashboardInternal())

export const getStaffDashboardFn = createServerFn({ method: "GET" }).handler(async () => getStaffDashboardInternal())

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
