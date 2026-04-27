import type {
  CustomerDashboardData,
  CustomerFlight,
  FlightOption,
  FlightSearchResponse,
  PassengerRecord,
  StaffDashboardData,
} from "@/lib/queries"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/auth.server"
import { isSuperadmin } from "@/lib/staff-permissions"
import { getAirportOption } from "@/lib/airports"
import type { AirportOption } from "@/lib/airports"

const DEFAULT_STAFF_FLIGHT_WINDOW_DAYS = 30

function serializeTimestamp(value: Date | string) {
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, "0")
    const day = String(value.getDate()).padStart(2, "0")
    const hours = String(value.getHours()).padStart(2, "0")
    const minutes = String(value.getMinutes()).padStart(2, "0")
    const seconds = String(value.getSeconds()).padStart(2, "0")
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }

  return value.replace(" ", "T").replace(/\.\d+Z?$/, "")
}

function normalizeQueryValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return null
  return `%${normalized}%`
}

export async function listGlobeRoutesInternal() {
  const routes = await db<
    Array<{
      arrival_airport_code: string
      departure_airport_code: string
    }>
  >`
    select distinct departure_airport_code, arrival_airport_code
    from flight
    order by random()
    limit 10
  `
  return routes.map((r) => ({
    arrivalCode: r.arrival_airport_code.trim(),
    departureCode: r.departure_airport_code.trim(),
  }))
}

export async function searchAirportsInternal(input: { query: string }) {
  const query = normalizeQueryValue(input.query)
  if (!query) return []

  return db<
    Array<{
      city: string
      code: string
      country: string
    }>
  >`
    select airport.city, airport.code, airport.country
    from airport
    where lower(airport.city) like ${query}
      or lower(airport.code) like ${query}
      or lower(airport.country) like ${query}
    order by
      case when lower(airport.code) = lower(${input.query.trim()}) then 0 else 1 end,
      case when lower(airport.city) = lower(${input.query.trim()}) then 0 else 1 end,
      airport.city asc,
      airport.code asc
    limit 8
  `
}
export async function listDbAirportsInternal(): Promise<Array<AirportOption>> {
  const rows = await db<
    Array<{ city: string; code: string; country: string }>
  >`select code, city, country from airport order by code asc`

  return rows.map((row) => {
    const coord = getAirportOption(row.code.trim())
    return {
      code: row.code.trim(),
      city: row.city,
      country: row.country,
      countryCode: coord?.countryCode ?? "",
      lat: coord?.lat ?? 0,
      lng: coord?.lng ?? 0,
      name: coord?.name ?? row.city,
    }
  })
}

export async function listReferenceData() {
  const airlines = await db<
    Array<{ name: string }>
  >`select name from airline order by name asc`
  const airports = await db<
    Array<{ city: string; code: string }>
  >`select city, code from airport order by city asc`

  return {
    airlines: airlines.map((airline) => airline.name),
    airports,
  }
}

export async function searchFlightsInternal(input: {
  departureDate?: string
  destination?: string
  returnDate?: string
  source?: string
  tripType: "one-way" | "round-trip"
}) {
  const departureDate = input.departureDate?.trim() || null
  const returnDate = input.returnDate?.trim() || null
  const sourceQuery = normalizeQueryValue(input.source)
  const destinationQuery = normalizeQueryValue(input.destination)

  const outbound = await db<
    Array<{
      airline_name: string
      arrival_airport_code: string
      arrival_airport_name: string
      arrival_city: string
      arrival_datetime: string
      average_rating: number | null
      available_seats: number
      base_price: string
      departure_airport_code: string
      departure_airport_name: string
      departure_city: string
      departure_datetime: string
      flight_number: string
      review_count: number
      status: "on_time" | "delayed"
    }>
  >`
    select
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      f.arrival_datetime,
      f.departure_airport_code,
      departure_airport.city as departure_city,
      concat(departure_airport.city, ' · ', departure_airport.code) as departure_airport_name,
      f.arrival_airport_code,
      arrival_airport.city as arrival_city,
      concat(arrival_airport.city, ' · ', arrival_airport.code) as arrival_airport_name,
      f.base_price,
      f.status,
      greatest(airplane.number_of_seats - count(ticket.ticket_id), 0)::int as available_seats,
      round(avg(review.rating)::numeric, 1)::float8 as average_rating,
      count(distinct review.customer_email)::int as review_count
    from flight f
    join airport departure_airport on departure_airport.code = f.departure_airport_code
    join airport arrival_airport on arrival_airport.code = f.arrival_airport_code
    join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
    left join ticket on ticket.airline_name = f.airline_name and ticket.flight_number = f.flight_number and ticket.departure_datetime = f.departure_datetime
    left join review on review.airline_name = f.airline_name and review.flight_number = f.flight_number and review.departure_datetime = f.departure_datetime
    where f.departure_datetime >= now()
      and (${departureDate}::text is null or f.departure_datetime::date = ${departureDate}::date)
      and (${sourceQuery}::text is null or lower(departure_airport.city) like ${sourceQuery} or lower(departure_airport.code) like ${sourceQuery})
      and (${destinationQuery}::text is null or lower(arrival_airport.city) like ${destinationQuery} or lower(arrival_airport.code) like ${destinationQuery})
    group by
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      f.arrival_datetime,
      f.departure_airport_code,
      departure_airport.city,
      departure_airport.code,
      f.arrival_airport_code,
      arrival_airport.city,
      arrival_airport.code,
      f.base_price,
      f.status,
      airplane.number_of_seats
    order by f.departure_datetime asc
  `

  let returnOptions = outbound.slice(0, 0)
  if (
    input.tripType === "round-trip" &&
    sourceQuery &&
    destinationQuery
  ) {
    returnOptions = await db<
      Array<{
        airline_name: string
        arrival_airport_code: string
        arrival_airport_name: string
        arrival_city: string
        arrival_datetime: string
        average_rating: number | null
        available_seats: number
        base_price: string
        departure_airport_code: string
        departure_airport_name: string
        departure_city: string
        departure_datetime: string
        flight_number: string
        review_count: number
        status: "on_time" | "delayed"
      }>
    >`
      select
        f.airline_name,
        f.flight_number,
        f.departure_datetime,
        f.arrival_datetime,
        f.departure_airport_code,
        departure_airport.city as departure_city,
        concat(departure_airport.city, ' · ', departure_airport.code) as departure_airport_name,
        f.arrival_airport_code,
        arrival_airport.city as arrival_city,
        concat(arrival_airport.city, ' · ', arrival_airport.code) as arrival_airport_name,
        f.base_price,
        f.status,
        greatest(airplane.number_of_seats - count(ticket.ticket_id), 0)::int as available_seats,
        round(avg(review.rating)::numeric, 1)::float8 as average_rating,
        count(distinct review.customer_email)::int as review_count
      from flight f
      join airport departure_airport on departure_airport.code = f.departure_airport_code
      join airport arrival_airport on arrival_airport.code = f.arrival_airport_code
      join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
      left join ticket on ticket.airline_name = f.airline_name and ticket.flight_number = f.flight_number and ticket.departure_datetime = f.departure_datetime
      left join review on review.airline_name = f.airline_name and review.flight_number = f.flight_number and review.departure_datetime = f.departure_datetime
      where f.departure_datetime >= now()
        and (${returnDate}::text is null or f.departure_datetime::date = ${returnDate}::date)
        and (lower(departure_airport.city) like ${destinationQuery} or lower(departure_airport.code) like ${destinationQuery})
        and (lower(arrival_airport.city) like ${sourceQuery} or lower(arrival_airport.code) like ${sourceQuery})
      group by
        f.airline_name,
        f.flight_number,
        f.departure_datetime,
        f.arrival_datetime,
        f.departure_airport_code,
        departure_airport.city,
        departure_airport.code,
        f.arrival_airport_code,
        arrival_airport.city,
        arrival_airport.code,
        f.base_price,
        f.status,
        airplane.number_of_seats
      order by f.departure_datetime asc
    `
  }

  function mapFlights(
    rows: Array<{
      airline_name: string
      arrival_airport_code: string
      arrival_airport_name: string
      arrival_city: string
      arrival_datetime: string
      average_rating: number | null
      available_seats: number
      base_price: string
      departure_airport_code: string
      departure_airport_name: string
      departure_city: string
      departure_datetime: string
      flight_number: string
      review_count: number
      status: "on_time" | "delayed"
    }>
  ): Array<FlightOption> {
    return rows.map((row) => ({
      airlineName: row.airline_name,
      arrivalAirportCode: row.arrival_airport_code,
      arrivalAirportName: row.arrival_airport_name,
      arrivalCity: row.arrival_city,
      arrivalDatetime: serializeTimestamp(row.arrival_datetime),
      averageRating: row.average_rating,
      availableSeats: row.available_seats,
      basePrice: Number(row.base_price),
      departureAirportCode: row.departure_airport_code,
      departureAirportName: row.departure_airport_name,
      departureCity: row.departure_city,
      departureDatetime: serializeTimestamp(row.departure_datetime),
      flightNumber: row.flight_number,
      reviewCount: row.review_count,
      status: row.status,
    }))
  }

  return {
    outbound: mapFlights(outbound),
    returnOptions: mapFlights(returnOptions),
    tripType: input.tripType,
  } satisfies FlightSearchResponse
}

function normalizeFilterDate(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export async function getCustomerDashboardInternal(filters: {
  destination?: string
  endDate?: string
  source?: string
  startDate?: string
}) {
  const user = await requireUser("customer")
  const sourceQuery = normalizeQueryValue(filters.source)
  const destinationQuery = normalizeQueryValue(filters.destination)
  const startDate = normalizeFilterDate(filters.startDate)
  const endDate = normalizeFilterDate(filters.endDate)

  const flights = await db<
    Array<{
      airline_name: string
      arrival_airport_code: string
      arrival_airport_name: string
      arrival_city: string
      arrival_datetime: string
      base_price: string
      comment: string | null
      departure_airport_code: string
      departure_airport_name: string
      departure_city: string
      departure_datetime: string
      flight_number: string
      purchase_datetime: string
      rating: number | null
      status: "on_time" | "delayed"
    }>
  >`
    select
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      f.arrival_datetime,
      f.departure_airport_code,
      concat(departure_airport.city, ' · ', departure_airport.code) as departure_airport_name,
      departure_airport.city as departure_city,
      f.arrival_airport_code,
      concat(arrival_airport.city, ' · ', arrival_airport.code) as arrival_airport_name,
      arrival_airport.city as arrival_city,
      f.base_price,
      f.status,
      ticket.purchase_datetime,
      review.rating,
      review.comment
    from ticket
    join flight f on f.airline_name = ticket.airline_name and f.flight_number = ticket.flight_number and f.departure_datetime = ticket.departure_datetime
    join airport departure_airport on departure_airport.code = f.departure_airport_code
    join airport arrival_airport on arrival_airport.code = f.arrival_airport_code
    left join review on review.customer_email = ticket.customer_email and review.airline_name = ticket.airline_name and review.flight_number = ticket.flight_number and review.departure_datetime = ticket.departure_datetime
    where ticket.customer_email = ${user.email}
      and (${startDate}::text is null or f.departure_datetime::date >= ${startDate}::date)
      and (${endDate}::text is null or f.departure_datetime::date <= ${endDate}::date)
      and (${sourceQuery}::text is null or lower(departure_airport.city) like ${sourceQuery} or lower(departure_airport.code) like ${sourceQuery})
      and (${destinationQuery}::text is null or lower(arrival_airport.city) like ${destinationQuery} or lower(arrival_airport.code) like ${destinationQuery})
    order by f.departure_datetime desc
  `

  const mappedFlights = flights.map((row) => ({
    airlineName: row.airline_name,
    arrivalAirportCode: row.arrival_airport_code,
    arrivalAirportName: row.arrival_airport_name,
    arrivalCity: row.arrival_city,
    arrivalDatetime: serializeTimestamp(row.arrival_datetime),
    averageRating: row.rating,
    availableSeats: 0,
    basePrice: Number(row.base_price),
    canReview:
      new Date(serializeTimestamp(row.arrival_datetime)) < new Date() &&
      row.rating === null,
    comment: row.comment,
    departureAirportCode: row.departure_airport_code,
    departureAirportName: row.departure_airport_name,
    departureCity: row.departure_city,
    departureDatetime: serializeTimestamp(row.departure_datetime),
    flightNumber: row.flight_number,
    purchaseDatetime: serializeTimestamp(row.purchase_datetime),
    rating: row.rating,
    reviewCount: row.rating ? 1 : 0,
    status: row.status,
  })) satisfies Array<CustomerFlight>

  return {
    currentUser: {
      displayName: user.displayName,
      email: user.email,
    },
    pastFlights: mappedFlights.filter(
      (flight) => new Date(flight.arrivalDatetime) < new Date()
    ),
    upcomingFlights: mappedFlights.filter(
      (flight) => new Date(flight.arrivalDatetime) >= new Date()
    ),
  } satisfies CustomerDashboardData
}

export async function getStaffDashboardInternal(filters: {
  destination?: string
  endDate?: string
  source?: string
  startDate?: string
}) {
  const user = await requireUser("staff")
  const sourceQuery = normalizeQueryValue(filters.source)
  const destinationQuery = normalizeQueryValue(filters.destination)
  const startDate = normalizeFilterDate(filters.startDate)
  const endDate = normalizeFilterDate(filters.endDate)

  const flights = await db<
    Array<{
      airline_name: string
      arrival_airport_code: string
      arrival_airport_name: string
      arrival_city: string
      arrival_datetime: string
      average_rating: number | null
      available_seats: number
      base_price: string
      departure_airport_code: string
      departure_airport_name: string
      departure_city: string
      departure_datetime: string
      flight_number: string
      review_count: number
      status: "on_time" | "delayed"
      ticket_count: number
    }>
  >`
    select
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      f.arrival_datetime,
      f.departure_airport_code,
      concat(departure_airport.city, ' · ', departure_airport.code) as departure_airport_name,
      departure_airport.city as departure_city,
      f.arrival_airport_code,
      concat(arrival_airport.city, ' · ', arrival_airport.code) as arrival_airport_name,
      arrival_airport.city as arrival_city,
      f.base_price,
      f.status,
      count(distinct ticket.ticket_id)::int as ticket_count,
      greatest(airplane.number_of_seats - count(distinct ticket.ticket_id), 0)::int as available_seats,
      round(avg(review.rating)::numeric, 1)::float8 as average_rating,
      count(distinct review.customer_email)::int as review_count
    from flight f
    join airport departure_airport on departure_airport.code = f.departure_airport_code
    join airport arrival_airport on arrival_airport.code = f.arrival_airport_code
    join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
    left join ticket on ticket.airline_name = f.airline_name and ticket.flight_number = f.flight_number and ticket.departure_datetime = f.departure_datetime
    left join review on review.airline_name = f.airline_name and review.flight_number = f.flight_number and review.departure_datetime = f.departure_datetime
    where f.airline_name = ${user.airlineName}
      and (
        (${startDate}::text is null and ${endDate}::text is null and f.departure_datetime between now() and now() + make_interval(days => ${DEFAULT_STAFF_FLIGHT_WINDOW_DAYS}))
        or (${startDate}::text is not null and f.departure_datetime::date >= ${startDate}::date)
      )
      and (${endDate}::text is null or f.departure_datetime::date <= ${endDate}::date)
      and (${sourceQuery}::text is null or lower(departure_airport.city) like ${sourceQuery} or lower(departure_airport.code) like ${sourceQuery})
      and (${destinationQuery}::text is null or lower(arrival_airport.city) like ${destinationQuery} or lower(arrival_airport.code) like ${destinationQuery})
    group by
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      f.arrival_datetime,
      f.departure_airport_code,
      departure_airport.city,
      departure_airport.code,
      f.arrival_airport_code,
      arrival_airport.city,
      arrival_airport.code,
      f.base_price,
      f.status,
      airplane.number_of_seats
    order by f.departure_datetime asc
  `

  const airplanes = await db<
    Array<{
      airplane_id: string
      manufacturing_company: string
      manufacturing_date: string
      number_of_seats: number
    }>
  >`
    select airplane_id, manufacturing_company, manufacturing_date, number_of_seats
    from airplane
    where airline_name = ${user.airlineName}
    order by airplane_id asc
  `

  const airports = await db<
    Array<{
      city: string
      code: string
      country: string
    }>
  >`
    select code, city, country
    from airport
    order by code asc
  `

  const ratings = await db<
    Array<{
      average_rating: number | null
      departure_datetime: string
      flight_number: string
      review_count: number
      comment: string | null
    }>
  >`
    select
      f.flight_number,
      f.departure_datetime,
      round(avg(review.rating)::numeric, 1)::float8 as average_rating,
      count(review.customer_email)::int as review_count,
      review.comment
    from flight f
    left join review on review.airline_name = f.airline_name and review.flight_number = f.flight_number and review.departure_datetime = f.departure_datetime
    where f.airline_name = ${user.airlineName}
    group by f.flight_number, f.departure_datetime, review.comment
    order by f.departure_datetime desc
  `

  const ratingsMap = new Map<
    string,
    {
      averageRating: number | null
      comments: Array<string>
      departureDatetime: string
      flightNumber: string
      reviewCount: number
    }
  >()
  for (const row of ratings) {
    const key = `${row.flight_number}:${row.departure_datetime}`
    const existing = ratingsMap.get(key)
    if (existing) {
      if (row.comment) existing.comments.push(row.comment)
      continue
    }

    ratingsMap.set(key, {
      averageRating: row.average_rating,
      comments: row.comment ? [row.comment] : [],
      departureDatetime: serializeTimestamp(row.departure_datetime),
      flightNumber: row.flight_number,
      reviewCount: row.review_count,
    })
  }

  const summaryRows = await db<
    Array<{
      last_month_tickets: number
      last_year_tickets: number
      total_tickets: number
    }>
  >`
    select
      count(*)::int as total_tickets,
      count(*) filter (where purchase_datetime >= now() - interval '1 month')::int as last_month_tickets,
      count(*) filter (where purchase_datetime >= now() - interval '1 year')::int as last_year_tickets
    from ticket
    where airline_name = ${user.airlineName}
  `
  const summary = summaryRows[0]

  const monthlySales = await db<
    Array<{
      month: string
      tickets_sold: number
    }>
  >`
    select
      to_char(date_trunc('month', purchase_datetime), 'YYYY-MM') as month,
      count(*)::int as tickets_sold
    from ticket
    where airline_name = ${user.airlineName}
      and purchase_datetime >= now() - interval '12 month'
    group by date_trunc('month', purchase_datetime)
    order by date_trunc('month', purchase_datetime) asc
  `

  return {
    airlineName: user.airlineName ?? "",
    airplanes: airplanes.map((row) => ({
      airplaneId: row.airplane_id,
      manufacturingCompany: row.manufacturing_company,
      manufacturingDate: serializeTimestamp(row.manufacturing_date),
      numberOfSeats: row.number_of_seats,
    })),
    airports,
    flights: flights.map((row) => ({
      airlineName: row.airline_name,
      arrivalAirportCode: row.arrival_airport_code,
      arrivalAirportName: row.arrival_airport_name,
      arrivalCity: row.arrival_city,
      arrivalDatetime: serializeTimestamp(row.arrival_datetime),
      averageRating: row.average_rating,
      availableSeats: row.available_seats,
      basePrice: Number(row.base_price),
      departureAirportCode: row.departure_airport_code,
      departureAirportName: row.departure_airport_name,
      departureCity: row.departure_city,
      departureDatetime: serializeTimestamp(row.departure_datetime),
      flightNumber: row.flight_number,
      reviewCount: row.review_count,
      status: row.status,
      ticketCount: row.ticket_count,
    })),
    monthlySales: monthlySales.map((row) => ({
      month: row.month,
      ticketsSold: row.tickets_sold,
    })),
    ratings: Array.from(ratingsMap.values()),
    reportSummary: {
      lastMonthTickets: summary.last_month_tickets,
      lastYearTickets: summary.last_year_tickets,
      totalTickets: summary.total_tickets,
    },
  } satisfies StaffDashboardData
}

export async function purchaseTicketInternal(data: {
  airlineName: string
  cardExpiration: string
  cardNumber: string
  cardType: "credit" | "debit"
  departureDatetime: string
  flightNumber: string
  nameOnCard: string
}) {
  const user = await requireUser("customer")

  const result = await db.begin(async (transaction) => {
    const flightRows = await transaction<
      Array<{
        available_seats: number
        base_price: string
      }>
    >`
      select
        greatest(airplane.number_of_seats - count(ticket.ticket_id), 0)::int as available_seats,
        f.base_price
      from flight f
      join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
      left join ticket on ticket.airline_name = f.airline_name and ticket.flight_number = f.flight_number and ticket.departure_datetime = f.departure_datetime
      where f.airline_name = ${data.airlineName}
        and f.flight_number = ${data.flightNumber}
        and f.departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
      group by f.base_price, airplane.number_of_seats
      limit 1
    `
    if (!flightRows.length)
      throw new Error("That flight could not be found anymore.")

    const flight = flightRows[0]
    if (flight.available_seats <= 0)
      throw new Error("That flight is already full.")

    const [nextTicket] = await transaction<Array<{ next_id: number }>>`
      select coalesce(max(ticket_id), 1000) + 1 as next_id
      from ticket
    `

    await transaction`
      insert into ticket (
        ticket_id,
        customer_email,
        airline_name,
        flight_number,
        departure_datetime,
        purchase_datetime,
        card_type,
        card_number,
        name_on_card,
        card_expiration
      )
      values (
        ${nextTicket.next_id},
        ${user.email},
        ${data.airlineName},
        ${data.flightNumber},
        replace(${data.departureDatetime}, 'T', ' ')::timestamp,
        now(),
        ${data.cardType},
        ${data.cardNumber},
        ${data.nameOnCard},
        ${data.cardExpiration}
      )
    `

    return {
      nextTicketId: nextTicket.next_id,
      price: Number(flight.base_price),
    }
  })

  return {
    message: `Ticket #${result.nextTicketId} confirmed for ${data.flightNumber}.`,
    price: result.price,
    ticketId: result.nextTicketId,
  }
}

export async function submitReviewInternal(data: {
  airlineName: string
  comment: string
  departureDatetime: string
  flightNumber: string
  rating: number
}) {
  const user = await requireUser("customer")

  const eligibleFlightRecords = await db<Array<{ eligible: boolean }>>`
    select exists (
      select 1
      from ticket
      join flight on flight.airline_name = ticket.airline_name and flight.flight_number = ticket.flight_number and flight.departure_datetime = ticket.departure_datetime
      where ticket.customer_email = ${user.email}
        and ticket.airline_name = ${data.airlineName}
        and ticket.flight_number = ${data.flightNumber}
        and ticket.departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
        and flight.arrival_datetime < now()
    ) as eligible
  `
  if (!eligibleFlightRecords.length || !eligibleFlightRecords[0].eligible) {
    return {
      error: "Only completed flights that you purchased can be reviewed.",
    }
  }

  const existingReviewRecords = await db<Array<{ exists: boolean }>>`
    select exists (
      select 1
      from review
      where customer_email = ${user.email}
        and airline_name = ${data.airlineName}
        and flight_number = ${data.flightNumber}
        and departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
    ) as exists
  `
  if (existingReviewRecords[0].exists) {
    return { error: "You already reviewed this flight." }
  }

  await db`
    insert into review (
      customer_email,
      airline_name,
      flight_number,
      departure_datetime,
      rating,
      comment,
      review_datetime
    )
    values (
      ${user.email},
      ${data.airlineName},
      ${data.flightNumber},
      ${data.departureDatetime},
      ${data.rating},
      ${data.comment || null},
      now()
    )
  `

  return { message: "Thanks — your rating is now part of the airline record." }
}

export async function createFlightInternal(data: {
  airplaneId: string
  arrivalAirportCode: string
  arrivalDatetime: string
  basePrice: number
  departureAirportCode: string
  departureDatetime: string
  flightNumber: string
}) {
  const user = await requireUser("staff")

  if (data.departureAirportCode === data.arrivalAirportCode) {
    return { error: "Departure and arrival airports must be different." }
  }

  if (new Date(data.arrivalDatetime) <= new Date(data.departureDatetime)) {
    return { error: "Arrival time must be after departure time." }
  }

  const airplaneRows = await db<Array<{ airplane_id: string }>>`
    select airplane_id
    from airplane
    where airline_name = ${user.airlineName}
      and airplane_id = ${data.airplaneId}
    limit 1
  `
  if (!airplaneRows.length)
    return { error: "Choose one of your airline's airplanes." }

  await db`
    insert into flight (
      airline_name,
      flight_number,
      departure_datetime,
      departure_airport_code,
      arrival_airport_code,
      arrival_datetime,
      base_price,
      status,
      airplane_id
    )
    values (
      ${user.airlineName},
      ${data.flightNumber},
      ${data.departureDatetime},
      ${data.departureAirportCode},
      ${data.arrivalAirportCode},
      ${data.arrivalDatetime},
      ${data.basePrice},
      'on_time',
      ${data.airplaneId}
    )
  `

  return { message: `Flight ${data.flightNumber} is now on the schedule.` }
}

export async function updateFlightStatusInternal(data: {
  airlineName: string
  departureDatetime: string
  flightNumber: string
  status: "on_time" | "delayed"
}) {
  const user = await requireUser("staff")
  if (user.airlineName !== data.airlineName)
    return { error: "You can only edit your airline's flights." }

  await db`
    update flight
    set status = ${data.status}
    where airline_name = ${data.airlineName}
      and flight_number = ${data.flightNumber}
      and departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
  `

  return {
    message: `Flight ${data.flightNumber} is now marked ${data.status.replaceAll("_", " ")}.`,
  }
}

export async function addAirplaneInternal(data: {
  airplaneId: string
  manufacturingCompany: string
  manufacturingDate: string
  numberOfSeats: number
}) {
  const user = await requireUser("staff")

  await db`
    insert into airplane (
      airline_name,
      airplane_id,
      number_of_seats,
      manufacturing_company,
      manufacturing_date
    )
    values (
      ${user.airlineName},
      ${data.airplaneId},
      ${data.numberOfSeats},
      ${data.manufacturingCompany},
      ${data.manufacturingDate}
    )
  `

  return {
    message: `Airplane ${data.airplaneId} is now available for ${user.airlineName}.`,
  }
}

export async function getFlightPassengersInternal(data: {
  airlineName: string
  departureDatetime: string
  flightNumber: string
}) {
  const user = await requireUser("staff")
  if (user.airlineName !== data.airlineName) return []

  const passengers = await db<
    Array<{
      customer_email: string
      customer_name: string
      passport_number: string
      purchase_datetime: string
      ticket_id: number
    }>
  >`
    select
      ticket.ticket_id,
      ticket.customer_email,
      customer.name as customer_name,
      customer.passport_number,
      ticket.purchase_datetime
    from ticket
    join customer on customer.email = ticket.customer_email
    where ticket.airline_name = ${data.airlineName}
      and ticket.flight_number = ${data.flightNumber}
      and ticket.departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
    order by ticket.purchase_datetime asc
  `

  return passengers.map((row) => ({
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    passportNumber: row.passport_number,
    purchaseDatetime: serializeTimestamp(row.purchase_datetime),
    ticketId: row.ticket_id,
  })) satisfies Array<PassengerRecord>
}

export async function getStaffReportInternal(data: {
  endDate: string
  startDate: string
}) {
  const user = await requireUser("staff")

  if (new Date(data.startDate) > new Date(data.endDate)) {
    return {
      endDate: data.endDate,
      error: "Start date must be on or before end date.",
      startDate: data.startDate,
      ticketsSold: 0,
    }
  }

  const rangeSummaryRows = await db<Array<{ tickets_sold: number }>>`
    select count(*)::int as tickets_sold
    from ticket
    where airline_name = ${user.airlineName}
      and purchase_datetime::date between ${data.startDate}::date and ${data.endDate}::date
  `
  return {
    endDate: data.endDate,
    startDate: data.startDate,
    ticketsSold: rangeSummaryRows[0].tickets_sold,
  }
}

// --- Superadmin operations ---

async function requireSuperadmin() {
  const user = await requireUser("staff")
  if (!user.staffPermission || !isSuperadmin(user.staffPermission)) {
    throw new Error("AUTH_FORBIDDEN")
  }
  return user
}

export async function listAllAirlinesInternal() {
  await requireSuperadmin()
  return db<Array<{ name: string }>>`
    select name from airline order by name asc
  `
}

export async function createAirlineInternal(data: { name: string }) {
  await requireSuperadmin()
  await db`insert into airline (name) values (${data.name})`
  return { message: `Airline "${data.name}" created.` }
}

export async function deleteAirlineInternal(data: { name: string }) {
  await requireSuperadmin()
  await db`delete from airline where name = ${data.name}`
  return { message: `Airline "${data.name}" deleted.` }
}

export async function listAllAirportsInternal() {
  await requireSuperadmin()
  return db<
    Array<{
      airport_type: string
      city: string
      code: string
      country: string
    }>
  >`
    select code, city, country, airport_type from airport order by code asc
  `
}

export async function createAirportInternal(data: {
  airportType: string
  city: string
  code: string
  country: string
}) {
  await requireSuperadmin()
  await db`
    insert into airport (code, city, country, airport_type)
    values (${data.code}, ${data.city}, ${data.country}, ${data.airportType})
  `
  return { message: `Airport ${data.code} created.` }
}

export async function deleteAirportInternal(data: { code: string }) {
  await requireSuperadmin()
  await db`delete from airport where code = ${data.code}`
  return { message: `Airport ${data.code} deleted.` }
}

export async function listAllStaffInternal() {
  await requireSuperadmin()
  return db<
    Array<{
      airline_name: string
      email: string
      first_name: string
      last_name: string
      username: string
    }>
  >`
    select username, airline_name, first_name, last_name, email
    from airline_staff
    order by username asc
  `
}

export async function deleteStaffInternal(data: { username: string }) {
  await requireSuperadmin()
  await db`delete from airline_staff_phone where username = ${data.username}`
  await db`delete from airline_staff where username = ${data.username}`
  return { message: `Staff "${data.username}" deleted.` }
}

export async function listAllCustomersInternal() {
  await requireSuperadmin()
  return db<
    Array<{
      city: string
      email: string
      name: string
      phone_number: string
    }>
  >`
    select email, name, city, phone_number
    from customer
    order by name asc
  `
}

export async function deleteCustomerInternal(data: { email: string }) {
  await requireSuperadmin()
  await db`delete from review where customer_email = ${data.email}`
  await db`delete from ticket where customer_email = ${data.email}`
  await db`delete from customer where email = ${data.email}`
  return { message: `Customer "${data.email}" deleted.` }
}
