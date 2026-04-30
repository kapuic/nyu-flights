import { createServerFn } from "@tanstack/react-start";

import {
  addAirplaneSchema,
  airportSuggestionSchema,
  changePasswordSchema,
  createAirlineSchema,
  createAirportSchema,
  createFlightSchema,
  customerFlightFiltersSchema,
  deleteAirlineSchema,
  deleteAirplaneSchema,
  deleteAirportSchema,
  deleteCustomerSchema,
  deleteFlightSchema,
  deleteStaffSchema,
  flightPassengersSchema,
  purchaseTicketSchema,
  reportRangeSchema,
  reviewSchema,
  searchFlightsSchema,
  staffFlightFiltersSchema,
  staffPhoneNumbersSchema,
  updateAirlineSchema,
  updateAirplaneFieldSchema,
  updateAirportFieldSchema,
  updateCustomerFieldSchema,
  updateFlightFieldSchema,
  updateManagedCustomerFieldSchema,
  updateStaffFieldSchema,
  updateStatusSchema,
} from "@/lib/schemas";
import {
  addAirplaneInternal,
  changePasswordInternal,
  changeStaffPasswordInternal,
  createAirlineInternal,
  createAirportInternal,
  createFlightInternal,
  deleteAirlineInternal,
  deleteAirplaneInternal,
  deleteAirportInternal,
  deleteCustomerInternal,
  deleteFlightInternal,
  deleteStaffInternal,
  getCustomerDashboardInternal,
  getCustomerProfileInternal,
  getFlightPassengersInternal,
  getPaymentHistoryInternal,
  getStaffDashboardInternal,
  getStaffReportInternal,
  getStaffProfileInternal,
  listAllAirlinesInternal,
  listAllAirportsInternal,
  listAllCustomersInternal,
  listAllStaffInternal,
  listDbAirportsInternal,
  listGlobeRoutesInternal,
  listReferenceData,
  purchaseTicketInternal,
  replaceStaffPhoneNumbersInternal,
  replaceOwnStaffPhoneNumbersInternal,
  searchAirportsInternal,
  searchFlightsInternal,
  submitReviewInternal,
  updateAirlineInternal,
  updateAirplaneFieldInternal,
  updateAirportFieldInternal,
  updateCustomerFieldInternal,
  updateFlightFieldInternal,
  updateFlightStatusInternal,
  updateManagedCustomerFieldInternal,
  updateStaffFieldInternal,
  updateStaffProfileFieldInternal,
} from "@/lib/queries.server";

export type FlightOption = {
  airlineName: string;
  arrivalAirportCode: string;
  arrivalAirportName: string;
  arrivalCountryCode: string;
  arrivalCity: string;
  arrivalDatetime: string;
  averageRating: number | null;
  availableSeats: number;
  basePrice: number;
  departureAirportCode: string;
  departureAirportName: string;
  departureCountryCode: string;
  departureCity: string;
  departureDatetime: string;
  flightNumber: string;
  reviewCount: number;
  status: "on_time" | "delayed";
};

export type FlightSearchResponse = {
  outbound: Array<FlightOption>;
  returnOptions: Array<FlightOption>;
  tripType: "one-way" | "round-trip";
};

export type CustomerFlight = FlightOption & {
  canReview: boolean;
  comment: string | null;
  purchaseDatetime: string;
  rating: number | null;
  ticketId: string;
};

export type CustomerDashboardData = {
  currentUser: {
    displayName: string;
    email: string;
  };
  pastFlights: Array<CustomerFlight>;
  upcomingFlights: Array<CustomerFlight>;
};

export type PassengerRecord = {
  customerEmail: string;
  customerName: string;
  passportNumber: string;
  purchaseDatetime: string;
  ticketId: string;
};

export type StaffDashboardData = {
  airlineName: string;
  airplanes: Array<{
    airlineName: string;
    airplaneId: string;
    manufacturingCompany: string;
    manufacturingDate: string;
    numberOfSeats: number;
  }>;
  airports: Array<{
    city: string;
    code: string;
    country: string;
  }>;
  flights: Array<FlightOption & { airplaneId: string; ticketCount: number }>;
  monthlySales: Array<{ month: string; ticketsSold: number }>;
  ratings: Array<{
    airlineName: string;
    averageRating: number | null;
    comments: Array<{ comment: string | null; rating: number }>;
    departureDatetime: string;
    flightNumber: string;
    reviewCount: number;
  }>;
  reportSummary: {
    lastMonthTickets: number;
    lastYearTickets: number;
    totalTickets: number;
  };
};

export const listReferenceDataFn = createServerFn({ method: "GET" }).handler(async () =>
  listReferenceData(),
);

export type GlobeRoute = {
  arrivalCode: string;
  departureCode: string;
};

export const listGlobeRoutesFn = createServerFn({ method: "GET" }).handler(async () =>
  listGlobeRoutesInternal(),
);
export const listDbAirportsFn = createServerFn({ method: "GET" }).handler(async () =>
  listDbAirportsInternal(),
);

export const searchAirportsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => airportSuggestionSchema.parse(data))
  .handler(async ({ data }) => searchAirportsInternal(data));

export const searchFlightsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchFlightsSchema.parse(data))
  .handler(async ({ data }) => searchFlightsInternal(data));

export const getCustomerDashboardFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerFlightFiltersSchema.parse(data))
  .handler(async ({ data }) => getCustomerDashboardInternal(data));

export const getStaffDashboardFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => staffFlightFiltersSchema.parse(data))
  .handler(async ({ data }) => getStaffDashboardInternal(data));

export const purchaseTicketFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => purchaseTicketSchema.parse(data))
  .handler(async ({ data }) => purchaseTicketInternal(data));

export const submitReviewFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reviewSchema.parse(data))
  .handler(async ({ data }) => submitReviewInternal(data));

export const createFlightFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createFlightSchema.parse(data))
  .handler(async ({ data }) => createFlightInternal(data));

export const updateFlightStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateStatusSchema.parse(data))
  .handler(async ({ data }) => updateFlightStatusInternal(data));

export const updateFlightFieldFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateFlightFieldSchema.parse(data))
  .handler(async ({ data }) => updateFlightFieldInternal(data));

export const deleteFlightFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteFlightSchema.parse(data))
  .handler(async ({ data }) => deleteFlightInternal(data));

export const addAirplaneFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => addAirplaneSchema.parse(data))
  .handler(async ({ data }) => addAirplaneInternal(data));
export const updateAirplaneFieldFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateAirplaneFieldSchema.parse(data))
  .handler(async ({ data }) => updateAirplaneFieldInternal(data));

export const deleteAirplaneFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteAirplaneSchema.parse(data))
  .handler(async ({ data }) => deleteAirplaneInternal(data));

export const getFlightPassengersFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => flightPassengersSchema.parse(data))
  .handler(async ({ data }) => getFlightPassengersInternal(data));

export const getStaffReportFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => reportRangeSchema.parse(data))
  .handler(async ({ data }) => getStaffReportInternal(data));

// --- Superadmin server functions ---

export const listAllAirlinesFn = createServerFn({ method: "GET" }).handler(async () =>
  listAllAirlinesInternal(),
);

export const createAirlineFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createAirlineSchema.parse(data))
  .handler(async ({ data }) => createAirlineInternal(data));
export const updateAirlineFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateAirlineSchema.parse(data))
  .handler(async ({ data }) => updateAirlineInternal(data));

export const deleteAirlineFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteAirlineSchema.parse(data))
  .handler(async ({ data }) => deleteAirlineInternal(data));

export const listAllAirportsFn = createServerFn({ method: "GET" }).handler(async () =>
  listAllAirportsInternal(),
);

export const createAirportFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createAirportSchema.parse(data))
  .handler(async ({ data }) => createAirportInternal(data));
export const updateAirportFieldFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateAirportFieldSchema.parse(data))
  .handler(async ({ data }) => updateAirportFieldInternal(data));

export const deleteAirportFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteAirportSchema.parse(data))
  .handler(async ({ data }) => deleteAirportInternal(data));

export const listAllStaffFn = createServerFn({ method: "GET" }).handler(async () =>
  listAllStaffInternal(),
);

export const deleteStaffFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteStaffSchema.parse(data))
  .handler(async ({ data }) => deleteStaffInternal(data));
export const updateStaffFieldFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateStaffFieldSchema.parse(data))
  .handler(async ({ data }) => updateStaffFieldInternal(data));
export const replaceStaffPhoneNumbersFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => staffPhoneNumbersSchema.parse(data))
  .handler(async ({ data }) => replaceStaffPhoneNumbersInternal(data));

export const listAllCustomersFn = createServerFn({ method: "GET" }).handler(async () =>
  listAllCustomersInternal(),
);

export const deleteCustomerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => deleteCustomerSchema.parse(data))
  .handler(async ({ data }) => deleteCustomerInternal(data));
export const updateManagedCustomerFieldFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateManagedCustomerFieldSchema.parse(data))
  .handler(async ({ data }) => updateManagedCustomerFieldInternal(data));

// --- Account server functions ---

export const getCustomerProfileFn = createServerFn({ method: "GET" }).handler(async () =>
  getCustomerProfileInternal(),
);

export const updateCustomerFieldFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => updateCustomerFieldSchema.parse(data))
  .handler(async ({ data }) => updateCustomerFieldInternal(data));

export const changePasswordFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => changePasswordSchema.parse(data))
  .handler(async ({ data }) => changePasswordInternal(data));

export const getPaymentHistoryFn = createServerFn({ method: "GET" }).handler(async () =>
  getPaymentHistoryInternal(),
);

// --- Staff account server functions ---

export const getStaffProfileFn = createServerFn({ method: "GET" }).handler(async () =>
  getStaffProfileInternal(),
);

export const updateStaffProfileFieldFn = createServerFn({ method: "POST" })
  .inputValidator(
    (data: unknown) => data as { field: "email" | "firstName" | "lastName"; value: string },
  )
  .handler(async ({ data }) => updateStaffProfileFieldInternal(data));

export const replaceOwnStaffPhoneNumbersFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => data as { phoneNumbers: Array<string> })
  .handler(async ({ data }) => replaceOwnStaffPhoneNumbersInternal(data));

export const changeStaffPasswordFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => changePasswordSchema.parse(data))
  .handler(async ({ data }) => changeStaffPasswordInternal(data));
