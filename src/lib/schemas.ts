import { z } from "zod"

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

function requiredDateField(message: string) {
  return z.string().min(1, message)
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

const accountCredentialSchema = z.object({
  email: z.email("Use a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
})

const flightIdentitySchema = z.object({
  airlineName: z.string().min(1),
  departureDatetime: z.string().min(1),
  flightNumber: z.string().min(1),
})

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
  role: z.enum(["customer", "staff"]),
  username: z.string().min(1, "Username is required."),
})

export const customerRegistrationSchema = accountCredentialSchema.extend({
  buildingNumber: z.string().min(1, "Building number is required."),
  city: z.string().min(1, "City is required."),
  dateOfBirth: requiredDateField("Date of birth is required."),
  name: z.string().min(2, "Name is required."),
  passportCountry: z.string().min(1, "Passport country is required."),
  passportExpiration: requiredDateField("Passport expiration is required."),
  passportNumber: z.string().min(4, "Passport number is required."),
  phoneNumber: z.string().min(7, "Phone number is required."),
  state: z.string().min(1, "State is required."),
  street: z.string().min(1, "Street is required."),
})

export const staffRegistrationSchema = accountCredentialSchema.extend({
  airlineName: z.string().min(1, "Choose an airline."),
  dateOfBirth: requiredDateField("Date of birth is required."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  phoneNumbers: z.string().default(""),
  username: z.string().min(3, "Username is required."),
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
