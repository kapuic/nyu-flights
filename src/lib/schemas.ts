import { z } from "zod"

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
  role: z.enum(["customer", "staff"]),
  username: z.string().min(1, "Username is required."),
})

export const customerRegistrationSchema = z.object({
  buildingNumber: z.string().min(1, "Building number is required."),
  city: z.string().min(1, "City is required."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  email: z.email("Use a valid email address."),
  name: z.string().min(2, "Name is required."),
  passportCountry: z.string().min(1, "Passport country is required."),
  passportExpiration: z.string().min(1, "Passport expiration is required."),
  passportNumber: z.string().min(4, "Passport number is required."),
  password: z.string().min(8, "Use at least 8 characters."),
  phoneNumber: z.string().min(7, "Phone number is required."),
  state: z.string().min(1, "State is required."),
  street: z.string().min(1, "Street is required."),
})

export const staffRegistrationSchema = z.object({
  airlineName: z.string().min(1, "Choose an airline."),
  dateOfBirth: z.string().min(1, "Date of birth is required."),
  email: z.email("Use a valid email address."),
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  password: z.string().min(8, "Use at least 8 characters."),
  phoneNumbers: z.string().default(""),
  username: z.string().min(3, "Username is required."),
})

export const searchFlightsSchema = z.object({
  departureDate: z.string().optional().default(""),
  destination: z.string().optional().default(""),
  returnDate: z.string().optional().default(""),
  source: z.string().optional().default(""),
  tripType: z.enum(["one-way", "round-trip"]).default("one-way"),
})

export const purchaseTicketSchema = z.object({
  airlineName: z.string().min(1),
  cardExpiration: z.string().min(1, "Card expiration is required."),
  cardNumber: z.string().min(12, "Card number is required."),
  cardType: z.enum(["credit", "debit"]),
  departureDatetime: z.string().min(1),
  flightNumber: z.string().min(1),
  nameOnCard: z.string().min(2, "Name on card is required."),
})

export const reviewSchema = z.object({
  airlineName: z.string().min(1),
  comment: z.string().trim().max(500).default(""),
  departureDatetime: z.string().min(1),
  flightNumber: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
})

export const createFlightSchema = z.object({
  airplaneId: z.string().min(1, "Choose an airplane."),
  arrivalAirportCode: z.string().length(3, "Arrival airport code is required."),
  arrivalDatetime: z.string().min(1, "Arrival time is required."),
  basePrice: z.coerce.number().positive("Price must be positive."),
  departureAirportCode: z.string().length(3, "Departure airport code is required."),
  departureDatetime: z.string().min(1, "Departure time is required."),
  flightNumber: z.string().min(2, "Flight number is required."),
})

export const updateStatusSchema = z.object({
  airlineName: z.string().min(1),
  departureDatetime: z.string().min(1),
  flightNumber: z.string().min(1),
  status: z.enum(["on_time", "delayed"]),
})

export const addAirplaneSchema = z.object({
  airplaneId: z.string().min(2, "Airplane ID is required."),
  manufacturingCompany: z.string().min(2, "Manufacturer is required."),
  manufacturingDate: z.string().min(1, "Manufacturing date is required."),
  numberOfSeats: z.coerce.number().int().positive("Seat count must be positive."),
})

export const flightPassengersSchema = z.object({
  airlineName: z.string().min(1),
  departureDatetime: z.string().min(1),
  flightNumber: z.string().min(1),
})

export const reportRangeSchema = z.object({
  endDate: z.string().min(1, "End date is required."),
  startDate: z.string().min(1, "Start date is required."),
})
