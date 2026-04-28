import { isValidPhoneNumber } from "libphonenumber-js/min"
import { getNames as getCountryNames } from "country-list"
import { z } from "zod"

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

/** Canonical US state list — used by both signup and profile pages. */
export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
  "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
  "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
  "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota",
  "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island",
  "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
] as const

const US_STATES_SET = new Set<string>(US_STATES)
const COUNTRY_NAMES_SET = new Set(getCountryNames())

// ---------------------------------------------------------------------------
// Reusable field-level validators
// ---------------------------------------------------------------------------

/** Parse a YYYY-MM-DD string into a Date, or return undefined. */
function parseDate(value: string): Date | undefined {
  if (!value) return undefined
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export const customerFieldValidators = {
  buildingNumber: z.string().trim().min(1, "Building # is required."),
  city: z.string().trim().min(1, "City is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required.").refine(
    (v) => parseDate(v) !== undefined,
    "Invalid date format.",
  ).refine(
    (v) => { const d = parseDate(v); return d ? d < new Date() : false },
    "Date of birth must be in the past.",
  ),
  name: z.string().trim().min(1, "Name is required."),
  passportCountry: z.string().min(1, "Passport country is required.").refine(
    (v) => COUNTRY_NAMES_SET.has(v),
    "Choose a valid country.",
  ),
  passportExpiration: z.string().min(1, "Passport expiration is required.").refine(
    (v) => parseDate(v) !== undefined,
    "Invalid date format.",
  ).refine(
    (v) => { const d = parseDate(v); return d ? d > new Date() : false },
    "Passport must not be expired.",
  ),
  passportNumber: z.string().trim().min(1, "Passport # is required."),
  phoneNumber: z.string().min(1, "Phone number is required.").refine(
    (v) => isValidPhoneNumber(v, "US"),
    "Enter a valid phone number.",
  ),
  state: z.string().min(1, "State is required.").refine(
    (v) => US_STATES_SET.has(v),
    "Choose a valid US state.",
  ),
  street: z.string().trim().min(1, "Street is required."),
} as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseFlightFiltersSchema = z.object({
  destination: z.string().default(""),
  endDate: z.string().default(""),
  source: z.string().default(""),
  startDate: z.string().default(""),
})

function isChronologicalRange(startDate: string, endDate: string) {
  return new Date(startDate) <= new Date(endDate)
}

function addFieldIssue(
  context: z.core.$RefinementCtx<unknown>,
  path: Array<string>,
  message: string
) {
  context.addIssue({
    code: "custom",
    message,
    path,
  })
}

function validateChronologicalRange(
  context: z.core.$RefinementCtx<unknown>,
  options: {
    endDate: string
    endPath: Array<string>
    message: string
    startDate: string
  }
) {
  if (isChronologicalRange(options.startDate, options.endDate)) return true

  addFieldIssue(context, options.endPath, options.message)
  return false
}

function validateDifferentValues(
  context: z.core.$RefinementCtx<unknown>,
  options: {
    leftValue: string
    message: string
    path: Array<string>
    rightValue: string
  }
) {
  if (options.leftValue !== options.rightValue) return true

  addFieldIssue(context, options.path, options.message)
  return false
}

function withDateRangeValidation(
  shape: {
    endDate: z.ZodType<string>
    startDate: z.ZodType<string>
  },
  options?: {
    allowPartial?: boolean
    message?: string
  }
) {
  const allowPartial = options?.allowPartial ?? false
  const message = options?.message ?? "End date must be on or after start date."

  return z.object(shape).superRefine((value, context) => {
    if (allowPartial && (!value.startDate || !value.endDate)) return

    validateChronologicalRange(context, {
      endDate: value.endDate,
      endPath: ["endDate"],
      message,
      startDate: value.startDate,
    })
  })
}

function validateRoundTripSearch(
  value: {
    departureDate: string
    destination: string
    returnDate: string
    source: string
    tripType: "one-way" | "round-trip"
  },
  context: z.core.$RefinementCtx<unknown>
) {
  validateDifferentValues(context, {
    leftValue: value.source,
    message: "Origin and destination must be different airports.",
    path: ["destination"],
    rightValue: value.destination,
  })

  if (value.tripType !== "round-trip") return

  if (!value.returnDate) {
    addFieldIssue(
      context,
      ["returnDate"],
      "Choose a return date for round-trip travel."
    )
    return
  }

  validateChronologicalRange(context, {
    endDate: value.returnDate,
    endPath: ["returnDate"],
    message: "Return date must be on or after departure date.",
    startDate: value.departureDate,
  })
}

function validateFlightSchedule(
  value: {
    arrivalAirportCode: string
    arrivalDatetime: string
    departureAirportCode: string
    departureDatetime: string
  },
  context: z.core.$RefinementCtx<unknown>
) {
  validateDifferentValues(context, {
    leftValue: value.departureAirportCode,
    message: "Departure and arrival airports must be different.",
    path: ["arrivalAirportCode"],
    rightValue: value.arrivalAirportCode,
  })

  validateChronologicalRange(context, {
    endDate: value.arrivalDatetime,
    endPath: ["arrivalDatetime"],
    message: "Arrival time must be after departure time.",
    startDate: value.departureDatetime,
  })
}

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

const accountCredentialSchema = z.object({
  email: z.email("Use a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
})

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
  role: z.enum(["customer", "staff"]),
  username: z.string().min(1, "Username is required."),
})

export const customerRegistrationSchema = accountCredentialSchema.extend({
  buildingNumber: customerFieldValidators.buildingNumber,
  city: customerFieldValidators.city,
  dateOfBirth: customerFieldValidators.dateOfBirth,
  name: customerFieldValidators.name,
  passportCountry: customerFieldValidators.passportCountry,
  passportExpiration: customerFieldValidators.passportExpiration,
  passportNumber: customerFieldValidators.passportNumber,
  phoneNumber: customerFieldValidators.phoneNumber,
  state: customerFieldValidators.state,
  street: customerFieldValidators.street,
})

export const staffRegistrationSchema = accountCredentialSchema.extend({
  airlineName: z.string().min(1, "Choose an airline."),
  dateOfBirth: customerFieldValidators.dateOfBirth,
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  phoneNumbers: z.string().default(""),
  username: z.string().min(3, "Username is required."),
})

// ---------------------------------------------------------------------------
// Flight schemas
// ---------------------------------------------------------------------------

const flightIdentitySchema = z.object({
  airlineName: z.string().min(1),
  departureDatetime: z.string().min(1),
  flightNumber: z.string().min(1),
})

export const searchFlightsSchema = baseFlightFiltersSchema.extend({
  departureDate: z.string().default(""),
  returnDate: z.string().default(""),
  tripType: z.enum(["one-way", "round-trip"]).default("one-way"),
})

export const flightSearchFormSchema = z
  .object({
    departureDate: z.string().min(1, "Choose a departure date."),
    destination: z.string().min(1, "Choose a destination airport."),
    returnDate: z.string().default(""),
    source: z.string().min(1, "Choose an origin airport."),
    tripType: z.enum(["one-way", "round-trip"]).default("one-way"),
  })
  .superRefine(validateRoundTripSearch)

export const airportSuggestionSchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "Query is required.")
    .max(50, "Query is too long."),
})

export const purchaseTicketSchema = flightIdentitySchema.extend({
  cardExpiration: z.string().min(1, "Card expiration is required."),
  cardNumber: z.string().min(12, "Card number is required."),
  cardType: z.enum(["credit", "debit"]),
  nameOnCard: z.string().min(2, "Name on card is required."),
})

export const reviewSchema = flightIdentitySchema.extend({
  comment: z.string().trim().max(500).default(""),
  rating: z.coerce.number().int().min(1).max(5),
})

export const createFlightSchema = z
  .object({
    airplaneId: z.string().min(1, "Choose an airplane."),
    arrivalAirportCode: z
      .string()
      .length(3, "Arrival airport code is required."),
    arrivalDatetime: z.string().min(1, "Arrival time is required."),
    basePrice: z.coerce.number().positive("Price must be positive."),
    departureAirportCode: z
      .string()
      .length(3, "Departure airport code is required."),
    departureDatetime: z.string().min(1, "Departure time is required."),
    flightNumber: z.string().min(2, "Flight number is required."),
  })
  .superRefine(validateFlightSchedule)

export const updateStatusSchema = flightIdentitySchema.extend({
  status: z.enum(["on_time", "delayed"]),
})

const flightEditableFieldSchema = z.discriminatedUnion("field", [
  z.object({
    field: z.literal("airplaneId"),
    value: z.string().min(1, "Choose an airplane."),
  }),
  z.object({
    field: z.literal("arrivalAirportCode"),
    value: z.string().length(3, "Arrival airport code is required."),
  }),
  z.object({
    field: z.literal("arrivalDatetime"),
    value: z.string().min(1, "Arrival time is required."),
  }),
  z.object({
    field: z.literal("basePrice"),
    value: z.coerce.number().nonnegative("Price cannot be negative."),
  }),
  z.object({
    field: z.literal("departureAirportCode"),
    value: z.string().length(3, "Departure airport code is required."),
  }),
  z.object({
    field: z.literal("status"),
    value: z.enum(["on_time", "delayed"]),
  }),
])

export const updateFlightFieldSchema = z.intersection(
  flightIdentitySchema,
  flightEditableFieldSchema
)

export const deleteFlightSchema = flightIdentitySchema

export const addAirplaneSchema = z.object({
  airplaneId: z.string().min(2, "Airplane ID is required."),
  manufacturingCompany: z.string().min(2, "Manufacturer is required."),
  manufacturingDate: z.string().min(1, "Manufacturing date is required."),
  numberOfSeats: z.coerce
    .number()
    .int()
    .positive("Seat count must be positive."),
})

export const flightPassengersSchema = flightIdentitySchema

const optionalFlightDateRangeSchema = withDateRangeValidation(
  baseFlightFiltersSchema.shape,
  {
    allowPartial: true,
    message: "Start date must be on or before end date.",
  }
)

export const customerFlightFiltersSchema = optionalFlightDateRangeSchema

export const staffFlightFiltersSchema = optionalFlightDateRangeSchema

export const reportRangeSchema = withDateRangeValidation({
  endDate: z.string().min(1, "End date is required."),
  startDate: z.string().min(1, "Start date is required."),
})

// ---------------------------------------------------------------------------
// Superadmin schemas
// ---------------------------------------------------------------------------

export const createAirlineSchema = z.object({
  name: z.string().min(1, "Airline name is required.").max(100),
})

export const createAirportSchema = z.object({
  code: z
    .string()
    .length(3, "Airport code must be 3 characters.")
    .transform((v) => v.toUpperCase()),
  city: z.string().min(1, "City is required.").max(100),
  country: z.string().min(1, "Country is required.").max(100),
  airportType: z.enum(["domestic", "international", "both"]),
})

export const deleteAirlineSchema = z.object({
  name: z.string().min(1),
})

export const deleteAirportSchema = z.object({
  code: z.string().length(3),
})

export const deleteStaffSchema = z.object({
  username: z.string().min(1),
})

export const deleteCustomerSchema = z.object({
  email: z.email(),
})

// ---------------------------------------------------------------------------
// Account schemas
// ---------------------------------------------------------------------------

export const updateCustomerFieldSchema = z.object({
  field: z.string().min(1),
  value: z.string(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
})
