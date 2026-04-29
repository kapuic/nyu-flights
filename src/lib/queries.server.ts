import { nanoid } from "nanoid";

import type {
  CustomerDashboardData,
  CustomerFlight,
  FlightOption,
  FlightSearchResponse,
  PassengerRecord,
  StaffDashboardData,
} from "@/lib/queries";
import type { AirportOption } from "@/lib/airports";
import { NANOID_LENGTH, db, ensureFlightReadModel } from "@/lib/db";
import { requireUser } from "@/lib/auth.server";
import {
  canManageOperationalAirline,
  getOperationalAirlineScope,
  isSuperadmin,
} from "@/lib/staff-permissions";
import { customerFieldValidators } from "@/lib/schemas";
import { getAirportOption } from "@/lib/airports";

import {
  compareDateTimes,
  isDateTimePast,
  normalizeTimestampForSql,
  serializeDateOnly,
  serializeTimestamp,
} from "@/lib/temporal";

const DEFAULT_STAFF_FLIGHT_WINDOW_DAYS = 30;

function normalizeQueryValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return `%${normalized}%`;
}
async function ensureFlightReadModelReady() {
  await ensureFlightReadModel();
}

type FlightReadModelRow = {
  airline_name: string;
  airplane_id: string;
  arrival_airport_code: string;
  arrival_city: string;
  arrival_datetime: string;
  average_rating: number | null;
  available_seats: number;
  base_price: string;
  departure_airport_code: string;
  departure_city: string;
  departure_datetime: string;
  flight_number: string;
  review_count: number;
  status: "on_time" | "delayed";
  ticket_count: number;
};

function formatAirportName(city: string, code: string) {
  return `${city} · ${code.trim()}`;
}

function mapFlightOption(row: FlightReadModelRow): FlightOption {
  return {
    airlineName: row.airline_name,
    arrivalAirportCode: row.arrival_airport_code,
    arrivalAirportName: formatAirportName(row.arrival_city, row.arrival_airport_code),
    arrivalCity: row.arrival_city,
    arrivalDatetime: serializeTimestamp(row.arrival_datetime),
    averageRating: row.average_rating,
    availableSeats: row.available_seats,
    basePrice: Number(row.base_price),
    departureAirportCode: row.departure_airport_code,
    departureAirportName: formatAirportName(row.departure_city, row.departure_airport_code),
    departureCity: row.departure_city,
    departureDatetime: serializeTimestamp(row.departure_datetime),
    flightNumber: row.flight_number,
    reviewCount: row.review_count,
    status: row.status,
  };
}


export async function listGlobeRoutesInternal() {
  const routes = await db<
    Array<{
      arrival_airport_code: string;
      departure_airport_code: string;
    }>
  >`
    select departure_airport_code, arrival_airport_code
    from (select distinct departure_airport_code, arrival_airport_code from flight) as routes
    order by random()
    limit 10
  `;
  return routes.map((r) => ({
    arrivalCode: r.arrival_airport_code.trim(),
    departureCode: r.departure_airport_code.trim(),
  }));
}

export async function searchAirportsInternal(input: { query: string }) {
  const query = normalizeQueryValue(input.query);
  if (!query) return [];

  return db<
    Array<{
      city: string;
      code: string;
      country: string;
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
  `;
}
export async function listDbAirportsInternal(): Promise<Array<AirportOption>> {
  const rows = await db<
    Array<{ city: string; code: string; country: string }>
  >`select code, city, country from airport order by code asc`;

  return rows.map((row) => {
    const coord = getAirportOption(row.code.trim());
    return {
      code: row.code.trim(),
      city: row.city,
      country: row.country,
      countryCode: coord?.countryCode ?? row.country.trim(),
      lat: coord?.lat ?? 0,
      lng: coord?.lng ?? 0,
      name: coord?.name ?? row.city,
    };
  });
}

export async function listReferenceData() {
  const airlines = await db<Array<{ name: string }>>`select name from airline order by name asc`;
  const airports = await db<
    Array<{ city: string; code: string }>
  >`select city, code from airport order by city asc`;

  return {
    airlines: airlines.map((airline) => airline.name),
    airports,
  };
}

export async function searchFlightsInternal(input: {
  departureDate?: string;
  destination?: string;
  returnDate?: string;
  source?: string;
  tripType: "one-way" | "round-trip";
}) {
  const departureDate = input.departureDate?.trim() || null;
  const returnDate = input.returnDate?.trim() || null;
  const sourceQuery = normalizeQueryValue(input.source);
  const destinationQuery = normalizeQueryValue(input.destination);

  async function searchFlightLeg(options: {
    date: string | null;
    destinationQuery: string | null;
    sourceQuery: string | null;
  }) {
    await ensureFlightReadModelReady();
    return db<Array<FlightReadModelRow>>`
      select
        airline_name,
        airplane_id,
        flight_number,
        departure_datetime,
        arrival_datetime,
        departure_airport_code,
        departure_city,
        arrival_airport_code,
        arrival_city,
        base_price,
        status,
        ticket_count,
        available_seats,
        average_rating,
        review_count
      from flight_read_model
      where departure_datetime >= now()
        and (${options.date}::text is null or (departure_datetime >= ${options.date}::date and departure_datetime < ${options.date}::date + interval '1 day'))
        and (${options.sourceQuery}::text is null or lower(departure_city) like ${options.sourceQuery} or lower(departure_airport_code) like ${options.sourceQuery})
        and (${options.destinationQuery}::text is null or lower(arrival_city) like ${options.destinationQuery} or lower(arrival_airport_code) like ${options.destinationQuery})
      order by departure_datetime asc
    `;
  }

  const outbound = await searchFlightLeg({
    date: departureDate,
    destinationQuery,
    sourceQuery,
  });

  const returnOptions =
    input.tripType === "round-trip" && sourceQuery && destinationQuery
      ? await searchFlightLeg({
          date: returnDate,
          destinationQuery: sourceQuery,
          sourceQuery: destinationQuery,
        })
      : [];

  return {
    outbound: outbound.map(mapFlightOption),
    returnOptions: returnOptions.map(mapFlightOption),
    tripType: input.tripType,
  } satisfies FlightSearchResponse;
}

function normalizeFilterDate(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getStaffOperationalAirlineScope(user: Awaited<ReturnType<typeof requireUser>>) {
  return getOperationalAirlineScope(user.staffPermission ?? "staff", user.airlineName);
}

function canStaffManageOperationalAirline(
  user: Awaited<ReturnType<typeof requireUser>>,
  airlineName: string,
) {
  return canManageOperationalAirline(
    user.staffPermission ?? "staff",
    user.airlineName,
    airlineName,
  );
}
type OperationalAirlineResolution =
  | { airlineName: string; ok: true }
  | { error: string; ok: false };

async function resolveOperationalAirlineForCreate(
  user: Awaited<ReturnType<typeof requireUser>>,
  requestedAirlineName: string | undefined,
): Promise<OperationalAirlineResolution> {
  const airlineScope = getStaffOperationalAirlineScope(user);
  const targetAirlineName = airlineScope ?? requestedAirlineName?.trim();
  if (!targetAirlineName) return { error: "Choose an airline before continuing.", ok: false };
  if (!canStaffManageOperationalAirline(user, targetAirlineName))
    return { error: "You can only manage airlines you are allowed to manage.", ok: false };

  const rows = await db<Array<{ name: string }>>`
    select name
    from airline
    where name = ${targetAirlineName}
    limit 1
  `;
  if (!rows.length) return { error: "Choose a valid airline.", ok: false };

  return { airlineName: targetAirlineName, ok: true };
}

export async function getCustomerDashboardInternal(filters: {
  destination?: string;
  endDate?: string;
  source?: string;
  startDate?: string;
}) {
  const user = await requireUser("customer");
  const sourceQuery = normalizeQueryValue(filters.source);
  const destinationQuery = normalizeQueryValue(filters.destination);
  const startDate = normalizeFilterDate(filters.startDate);
  const endDate = normalizeFilterDate(filters.endDate);

  await ensureFlightReadModelReady();

  const flights = await db<
    Array<
      FlightReadModelRow & {
        comment: string | null;
        purchase_datetime: string;
        rating: number | null;
        ticket_id: string;
      }
    >
  >`
    select
      flight_read_model.airline_name,
      flight_read_model.airplane_id,
      flight_read_model.flight_number,
      flight_read_model.departure_datetime,
      flight_read_model.arrival_datetime,
      flight_read_model.departure_airport_code,
      flight_read_model.departure_city,
      flight_read_model.arrival_airport_code,
      flight_read_model.arrival_city,
      flight_read_model.base_price,
      flight_read_model.status,
      flight_read_model.ticket_count,
      flight_read_model.available_seats,
      flight_read_model.average_rating,
      flight_read_model.review_count,
      ticket.ticket_id,
      ticket.purchase_datetime,
      review.rating,
      review.comment
    from ticket
    join flight_read_model on flight_read_model.airline_name = ticket.airline_name
      and flight_read_model.flight_number = ticket.flight_number
      and flight_read_model.departure_datetime = ticket.departure_datetime
    left join review on review.customer_email = ticket.customer_email and review.airline_name = ticket.airline_name and review.flight_number = ticket.flight_number and review.departure_datetime = ticket.departure_datetime
    where ticket.customer_email = ${user.email}
      and (${startDate}::text is null or flight_read_model.departure_datetime >= ${startDate}::date)
      and (${endDate}::text is null or flight_read_model.departure_datetime < ${endDate}::date + interval '1 day')
      and (${sourceQuery}::text is null or lower(flight_read_model.departure_city) like ${sourceQuery} or lower(flight_read_model.departure_airport_code) like ${sourceQuery})
      and (${destinationQuery}::text is null or lower(flight_read_model.arrival_city) like ${destinationQuery} or lower(flight_read_model.arrival_airport_code) like ${destinationQuery})
    order by flight_read_model.departure_datetime desc
  `;

  const mappedFlights = flights.map((row) => ({
    airlineName: row.airline_name,
    arrivalAirportCode: row.arrival_airport_code,
    arrivalAirportName: formatAirportName(row.arrival_city, row.arrival_airport_code),
    arrivalCity: row.arrival_city,
    arrivalDatetime: serializeTimestamp(row.arrival_datetime),
    averageRating: row.average_rating,
    availableSeats: row.available_seats,
    basePrice: Number(row.base_price),
    canReview: isDateTimePast(serializeTimestamp(row.arrival_datetime)) && row.rating === null,
    comment: row.comment,
    departureAirportCode: row.departure_airport_code,
    departureAirportName: formatAirportName(row.departure_city, row.departure_airport_code),
    departureCity: row.departure_city,
    departureDatetime: serializeTimestamp(row.departure_datetime),
    flightNumber: row.flight_number,
    purchaseDatetime: serializeTimestamp(row.purchase_datetime),
    rating: row.rating,
    reviewCount: row.review_count,
    status: row.status,
    ticketId: row.ticket_id,
  })) satisfies Array<CustomerFlight>;

  return {
    currentUser: {
      displayName: user.displayName,
      email: user.email,
    },
    pastFlights: mappedFlights.filter((flight) => isDateTimePast(flight.arrivalDatetime)),
    upcomingFlights: mappedFlights.filter((flight) => !isDateTimePast(flight.arrivalDatetime)),
  } satisfies CustomerDashboardData;
}

export async function getStaffDashboardInternal(filters: {
  destination?: string;
  endDate?: string;
  source?: string;
  startDate?: string;
}) {
  const user = await requireUser("staff");
  const airlineScope = getStaffOperationalAirlineScope(user);
  const sourceQuery = normalizeQueryValue(filters.source);
  const destinationQuery = normalizeQueryValue(filters.destination);
  const startDate = normalizeFilterDate(filters.startDate);
  const endDate = normalizeFilterDate(filters.endDate);

  await ensureFlightReadModelReady();

  const flights = await db<Array<FlightReadModelRow>>`
    select
      airline_name,
      airplane_id,
      flight_number,
      departure_datetime,
      arrival_datetime,
      departure_airport_code,
      departure_city,
      arrival_airport_code,
      arrival_city,
      base_price,
      status,
      ticket_count,
      available_seats,
      average_rating,
      review_count
    from flight_read_model
    where (${airlineScope}::text is null or airline_name = ${airlineScope})
      and (
        (${startDate}::text is null and ${endDate}::text is null and departure_datetime between now() and now() + make_interval(days => ${DEFAULT_STAFF_FLIGHT_WINDOW_DAYS}))
        or (${startDate}::text is not null and departure_datetime >= ${startDate}::date)
      )
      and (${endDate}::text is null or departure_datetime < ${endDate}::date + interval '1 day')
      and (${sourceQuery}::text is null or lower(departure_city) like ${sourceQuery} or lower(departure_airport_code) like ${sourceQuery})
      and (${destinationQuery}::text is null or lower(arrival_city) like ${destinationQuery} or lower(arrival_airport_code) like ${destinationQuery})
    order by departure_datetime asc
  `;

  const airplanes = await db<
    Array<{
      airline_name: string;
      airplane_id: string;
      manufacturing_company: string;
      manufacturing_date: string;
      number_of_seats: number;
    }>
  >`
    select airline_name, airplane_id, manufacturing_company, manufacturing_date::text as manufacturing_date, number_of_seats
    from airplane
    where (${airlineScope}::text is null or airline_name = ${airlineScope})
    order by airline_name asc, airplane_id asc
  `;

  const airports = await db<
    Array<{
      city: string;
      code: string;
      country: string;
    }>
  >`
    select code, city, country
    from airport
    order by code asc
  `;

  const ratings = await db<
    Array<{
      airline_name: string;
      comment: string | null;
      departure_datetime: string;
      flight_number: string;
      rating: number;
    }>
  >`
    select
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      review.rating,
      review.comment
    from flight f
    join review on review.airline_name = f.airline_name and review.flight_number = f.flight_number and review.departure_datetime = f.departure_datetime
    where (${airlineScope}::text is null or f.airline_name = ${airlineScope})
    order by f.departure_datetime desc, review.review_datetime asc
  `;

  const summaryRows = await db<
    Array<{
      last_month_tickets: number;
      last_year_tickets: number;
      total_tickets: number;
    }>
  >`
    select
      count(*)::int as total_tickets,
      count(*) filter (where purchase_datetime >= now() - interval '1 month')::int as last_month_tickets,
      count(*) filter (where purchase_datetime >= now() - interval '1 year')::int as last_year_tickets
    from ticket
    where (${airlineScope}::text is null or airline_name = ${airlineScope})
  `;
  const summary = summaryRows[0];

  const monthlySales = await db<
    Array<{
      month_start: string;
      tickets_sold: number;
    }>
  >`
    select
      date_trunc('month', purchase_datetime)::text as month_start,
      count(*)::int as tickets_sold
    from ticket
    where (${airlineScope}::text is null or airline_name = ${airlineScope})
      and purchase_datetime >= now() - interval '12 month'
    group by date_trunc('month', purchase_datetime)
    order by date_trunc('month', purchase_datetime) asc
  `;

  return {
    airlineName: airlineScope ?? "All airlines",
    airplanes: airplanes.map((row) => ({
      airlineName: row.airline_name,
      airplaneId: row.airplane_id,
      manufacturingCompany: row.manufacturing_company,
      manufacturingDate: serializeDateOnly(row.manufacturing_date),
      numberOfSeats: row.number_of_seats,
    })),
    airports,
    flights: flights.map((row) => ({
      ...mapFlightOption(row),
      airplaneId: row.airplane_id,
      ticketCount: row.ticket_count,
    })),
    monthlySales: monthlySales.map((row) => ({
      month: serializeDateOnly(row.month_start).slice(0, 7),
      ticketsSold: row.tickets_sold,
    })),
    ratings: (() => {
      type RatingGroup = {
        airlineName: string;
        comments: Array<{ comment: string | null; rating: number }>;
        departureDatetime: string;
        flightNumber: string;
        ratingsTotal: number;
        reviewCount: number;
      };

      const groupedRatings: Record<string, RatingGroup> = {};
      for (const row of ratings) {
        const key = `${row.airline_name}|${row.flight_number}|${row.departure_datetime}`;
        const entry = groupedRatings[key] ?? {
          airlineName: row.airline_name,
          comments: [],
          departureDatetime: serializeTimestamp(row.departure_datetime),
          flightNumber: row.flight_number,
          ratingsTotal: 0,
          reviewCount: 0,
        };
        entry.comments.push({ comment: row.comment?.trim() || null, rating: row.rating });
        entry.ratingsTotal += row.rating;
        entry.reviewCount += 1;
        groupedRatings[key] = entry;
      }

      return Object.values(groupedRatings).map((entry) => ({
        airlineName: entry.airlineName,
        averageRating: Math.round((entry.ratingsTotal / entry.reviewCount) * 10) / 10,
        comments: entry.comments,
        departureDatetime: entry.departureDatetime,
        flightNumber: entry.flightNumber,
        reviewCount: entry.reviewCount,
      }));
    })(),
    reportSummary: {
      lastMonthTickets: summary.last_month_tickets,
      lastYearTickets: summary.last_year_tickets,
      totalTickets: summary.total_tickets,
    },
  } satisfies StaffDashboardData;
}

export async function purchaseTicketInternal(data: {
  airlineName: string;
  cardExpiration: string;
  cardNumber: string;
  cardType: "credit" | "debit";
  departureDatetime: string;
  flightNumber: string;
  nameOnCard: string;
}) {
  const user = await requireUser("customer");

  const result = await db.begin(async (transaction) => {
    const flightRows = await transaction<
      Array<{
        base_price: string;
        departure_datetime: string;
        is_future: boolean;
        number_of_seats: number;
      }>
    >`
      select
        f.base_price,
        f.departure_datetime::text as departure_datetime,
        f.departure_datetime > now() as is_future,
        airplane.number_of_seats
      from flight f
      join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
      where f.airline_name = ${data.airlineName}
        and f.flight_number = ${data.flightNumber}
        and f.departure_datetime = ${normalizeTimestampForSql(data.departureDatetime)}::text::timestamp
      for update
    `;
    if (!flightRows.length) throw new Error("That flight could not be found anymore.");

    const flight = flightRows[0];
    if (!flight.is_future) throw new Error("Tickets can only be purchased for future flights.");

    const ticketCountRows = await transaction<Array<{ ticket_count: number }>>`
      select count(*)::int as ticket_count
      from ticket
      where airline_name = ${data.airlineName}
        and flight_number = ${data.flightNumber}
        and departure_datetime = ${flight.departure_datetime}
    `;
    const ticketCount = ticketCountRows[0].ticket_count;

    if (ticketCount >= flight.number_of_seats) throw new Error("That flight is already full.");

    const nextTicketId = nanoid(NANOID_LENGTH);

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
        ${nextTicketId},
        ${user.email},
        ${data.airlineName},
        ${data.flightNumber},
        ${serializeTimestamp(flight.departure_datetime).replace("T", " ")}::text::timestamp,
        now(),
        ${data.cardType},
        ${data.cardNumber},
        ${data.nameOnCard},
        ${data.cardExpiration.length === 5 ? `20${data.cardExpiration.slice(3)}-${data.cardExpiration.slice(0, 2)}-01` : data.cardExpiration}
      )
    `;

    return {
      nextTicketId,
      price: Number(flight.base_price),
    };
  });

  return {
    message: `Ticket #${result.nextTicketId} confirmed for ${data.flightNumber}.`,
    price: result.price,
    ticketId: result.nextTicketId,
  };
}

export async function submitReviewInternal(data: {
  airlineName: string;
  comment: string;
  departureDatetime: string;
  flightNumber: string;
  rating: number;
}) {
  const user = await requireUser("customer");

  const eligibleFlightRecords = await db<Array<{ departure_datetime: string }>>`
    select ticket.departure_datetime
    from ticket
    join flight on flight.airline_name = ticket.airline_name and flight.flight_number = ticket.flight_number and flight.departure_datetime = ticket.departure_datetime
    where ticket.customer_email = ${user.email}
      and ticket.airline_name = ${data.airlineName}
      and ticket.flight_number = ${data.flightNumber}
      and ticket.departure_datetime = ${normalizeTimestampForSql(data.departureDatetime)}::text::timestamp
      and flight.arrival_datetime < now()
    except
    select review.departure_datetime
    from review
    where review.customer_email = ${user.email}
      and review.airline_name = ${data.airlineName}
      and review.flight_number = ${data.flightNumber}
    limit 1
  `;
  if (!eligibleFlightRecords.length) {
    return {
      error: "Only completed purchased flights that you have not already reviewed can be reviewed.",
    };
  }
  const eligibleFlight = eligibleFlightRecords[0];

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
      ${serializeTimestamp(eligibleFlight.departure_datetime).replace("T", " ")}::text::timestamp,
      ${data.rating},
      ${data.comment || null},
      now()
    )
  `;

  return { message: "Thanks — your rating is now part of the airline record." };
}

type FlightIdentityInput = {
  airlineName: string;
  departureDatetime: string;
  flightNumber: string;
};

type FlightEditableFieldInput = FlightIdentityInput &
  (
    | { field: "airplaneId"; value: string }
    | { field: "arrivalAirportCode"; value: string }
    | { field: "arrivalDatetime"; value: string }
    | { field: "basePrice"; value: number }
    | { field: "departureAirportCode"; value: string }
    | { field: "departureDatetime"; value: string }
    | { field: "status"; value: "on_time" | "delayed" }
  );

type FlightRowForMutation = {
  airline_name: string;
  airplane_id: string;
  arrival_airport_code: string;
  arrival_datetime: string;
  base_price: number;
  departure_airport_code: string;
  departure_datetime: string;
  flight_number: string;
  status: "on_time" | "delayed";
};
function formatFlightDateForSql(value: string) {
  return normalizeTimestampForSql(value);
}
async function getStaffFlightForMutation(
  data: FlightIdentityInput,
): Promise<FlightRowForMutation | null> {
  const user = await requireUser("staff");
  if (!canStaffManageOperationalAirline(user, data.airlineName))
    throw new Error("You can only edit flights you are allowed to manage.");

  const rows = await db<Array<FlightRowForMutation>>`
    select
      airline_name,
      flight_number,
      departure_datetime::text as departure_datetime,
      departure_airport_code,
      arrival_airport_code,
      arrival_datetime::text as arrival_datetime,
      base_price,
      status,
      airplane_id
    from flight
    where airline_name = ${data.airlineName}
      and flight_number = ${data.flightNumber}
      and departure_datetime = ${formatFlightDateForSql(data.departureDatetime)}::text::timestamp
    limit 1
  `;

  return rows.length ? rows[0] : null;
}

async function assertAirportExists(code: string) {
  const rows = await db<Array<{ code: string }>>`
    select code
    from airport
    where code = ${code}
    limit 1
  `;
  if (!rows.length) throw new Error(`Airport ${code} does not exist.`);
}

async function assertAirplaneCanServeFlight(
  airlineName: string,
  airplaneId: string,
  data: FlightIdentityInput,
) {
  const rows = await db<Array<{ number_of_seats: number; ticket_count: number }>>`
    select
      airplane.number_of_seats,
      count(ticket.ticket_id)::int as ticket_count
    from airplane
    left join ticket
      on ticket.airline_name = ${airlineName}
      and ticket.flight_number = ${data.flightNumber}
      and ticket.departure_datetime = ${formatFlightDateForSql(data.departureDatetime)}::text::timestamp
    where airplane.airline_name = ${airlineName}
      and airplane.airplane_id = ${airplaneId}
    group by airplane.number_of_seats
    limit 1
  `;
  if (!rows.length) throw new Error("Choose one of your airline's airplanes.");
  const row = rows[0];
  if (row.number_of_seats < row.ticket_count) {
    throw new Error("That aircraft has fewer seats than this flight's sold tickets.");
  }
}
export async function createFlightInternal(data: {
  airlineName?: string;
  airplaneId: string;
  arrivalAirportCode: string;
  arrivalDatetime: string;
  basePrice: number;
  departureAirportCode: string;
  departureDatetime: string;
  flightNumber: string;
}) {
  const user = await requireUser("staff");
  const airlineResolution = await resolveOperationalAirlineForCreate(user, data.airlineName);
  if (!airlineResolution.ok) throw new Error(airlineResolution.error);
  const { airlineName } = airlineResolution;

  if (data.departureAirportCode === data.arrivalAirportCode)
    throw new Error("Departure and arrival airports must be different.");

  if (compareDateTimes(data.arrivalDatetime, data.departureDatetime) <= 0)
    throw new Error("Arrival time must be after departure time.");

  const airplaneRows = await db<Array<{ airplane_id: string }>>`
    select airplane_id
    from airplane
    where airline_name = ${airlineName}
      and airplane_id = ${data.airplaneId}
    limit 1
  `;
  if (!airplaneRows.length) throw new Error("Choose one of that airline's airplanes.");

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
      ${airlineName},
      ${data.flightNumber},
      ${normalizeTimestampForSql(data.departureDatetime)}::text::timestamp,
      ${data.departureAirportCode},
      ${data.arrivalAirportCode},
      ${normalizeTimestampForSql(data.arrivalDatetime)}::text::timestamp,
      ${data.basePrice},
      'on_time',
      ${data.airplaneId}
    )
  `;

  return { message: `Flight ${data.flightNumber} is now on the schedule.` };
}

export async function updateFlightStatusInternal(data: {
  airlineName: string;
  departureDatetime: string;
  flightNumber: string;
  status: "on_time" | "delayed";
}) {
  const flight = await getStaffFlightForMutation(data);
  if (!flight) return { error: "Flight not found." };

  await db`
    update flight
    set status = ${data.status}
    where airline_name = ${flight.airline_name}
      and flight_number = ${flight.flight_number}
      and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
  `;

  return {
    message: `Flight ${data.flightNumber} is now marked ${data.status.replaceAll("_", " ")}.`,
  };
}

export async function updateFlightFieldInternal(data: FlightEditableFieldInput) {
  const flight = await getStaffFlightForMutation(data);
  if (!flight) return { error: "Flight not found." };

  if (data.field === "status") {
    await db`
      update flight
      set status = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
    `;
    return { message: `Flight ${data.flightNumber} status updated.` };
  }

  if (data.field === "basePrice") {
    await db`
      update flight
      set base_price = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
    `;
    return { message: `Flight ${data.flightNumber} price updated.` };
  }

  if (data.field === "airplaneId") {
    await assertAirplaneCanServeFlight(flight.airline_name, data.value, data);
    await db`
      update flight
      set airplane_id = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
    `;
    return { message: `Flight ${data.flightNumber} aircraft updated.` };
  }

  if (data.field === "departureAirportCode") {
    if (data.value === flight.arrival_airport_code) {
      return { error: "Departure and arrival airports must be different." };
    }
    await assertAirportExists(data.value);
    await db`
      update flight
      set departure_airport_code = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
    `;
    return { message: `Flight ${data.flightNumber} departure airport updated.` };
  }

  if (data.field === "arrivalAirportCode") {
    if (data.value === flight.departure_airport_code) {
      return { error: "Departure and arrival airports must be different." };
    }
    await assertAirportExists(data.value);
    await db`
      update flight
      set arrival_airport_code = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
    `;
    return { message: `Flight ${data.flightNumber} arrival airport updated.` };
  }

  if (data.field === "departureDatetime") {
    if (compareDateTimes(flight.arrival_datetime, data.value) <= 0) {
      return { error: "Departure time must be before arrival time." };
    }

    await db`
      update flight
      set departure_datetime = ${normalizeTimestampForSql(data.value)}::text::timestamp
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
    `;
    return { message: `Flight ${data.flightNumber} departure time updated.` };
  }

  if (compareDateTimes(data.value, flight.departure_datetime) <= 0) {
    return { error: "Arrival time must be after departure time." };
  }

  await db`
    update flight
    set arrival_datetime = ${normalizeTimestampForSql(data.value)}::text::timestamp
    where airline_name = ${flight.airline_name}
      and flight_number = ${flight.flight_number}
      and departure_datetime = ${normalizeTimestampForSql(flight.departure_datetime)}::text::timestamp
  `;
  return { message: `Flight ${data.flightNumber} arrival time updated.` };
}

export async function deleteFlightInternal(data: FlightIdentityInput) {
  const flight = await getStaffFlightForMutation(data);
  if (!flight) return { error: "Flight not found." };

  const dependencyRows = await db<Array<{ has_reviews: boolean; has_tickets: boolean }>>`
    select
      exists (
        select 1
        from ticket
        where ticket.airline_name = ${flight.airline_name}
          and ticket.flight_number = ${flight.flight_number}
          and ticket.departure_datetime = ${flight.departure_datetime}
      ) as has_tickets,
      exists (
        select 1
        from review
        where review.airline_name = ${flight.airline_name}
          and review.flight_number = ${flight.flight_number}
          and review.departure_datetime = ${flight.departure_datetime}
      ) as has_reviews
  `;
  const dependencyRow = dependencyRows[0];
  if (dependencyRow.has_tickets || dependencyRow.has_reviews) {
    return { error: "Flights with tickets or reviews cannot be deleted." };
  }

  await db`
    delete from flight
    where airline_name = ${flight.airline_name}
      and flight_number = ${flight.flight_number}
      and departure_datetime = ${flight.departure_datetime}
  `;

  return { message: `Flight ${data.flightNumber} deleted.` };
}

export async function addAirplaneInternal(data: {
  airlineName?: string;
  airplaneId: string;
  manufacturingCompany: string;
  manufacturingDate: string;
  numberOfSeats: number;
}) {
  const user = await requireUser("staff");
  const airlineResolution = await resolveOperationalAirlineForCreate(user, data.airlineName);
  if (!airlineResolution.ok) return { error: airlineResolution.error };
  const { airlineName } = airlineResolution;

  await db`
    insert into airplane (
      airline_name,
      airplane_id,
      number_of_seats,
      manufacturing_company,
      manufacturing_date
    )
    values (
      ${airlineName},
      ${data.airplaneId},
      ${data.numberOfSeats},
      ${data.manufacturingCompany},
      ${data.manufacturingDate}
    )
  `;

  return {
    message: `Airplane ${data.airplaneId} is now available for ${airlineName}.`,
  };
}
export async function updateAirplaneFieldInternal(data: {
  airlineName: string;
  airplaneId: string;
  field: "manufacturingCompany" | "manufacturingDate" | "numberOfSeats";
  value: number | string;
}) {
  const user = await requireUser("staff");
  if (!canStaffManageOperationalAirline(user, data.airlineName)) {
    return { error: "You can only manage airplanes you are allowed to manage." };
  }

  if (data.field === "manufacturingCompany") {
    const value = String(data.value).trim();
    if (value.length < 2) return { error: "Manufacturer is required." };
    await db`
      update airplane
      set manufacturing_company = ${value}
      where airline_name = ${data.airlineName}
        and airplane_id = ${data.airplaneId}
    `;
    return { message: `Airplane ${data.airplaneId} manufacturer updated.` };
  }

  if (data.field === "manufacturingDate") {
    const value = String(data.value).trim();
    if (!value) return { error: "Manufacturing date is required." };
    await db`
      update airplane
      set manufacturing_date = ${value}
      where airline_name = ${data.airlineName}
        and airplane_id = ${data.airplaneId}
    `;
    return { message: `Airplane ${data.airplaneId} manufacturing date updated.` };
  }

  const seats = Number(data.value);
  if (!Number.isInteger(seats) || seats <= 0) return { error: "Seat count must be positive." };
  const dependencyRows = await db<Array<{ max_tickets: number }>>`
    select coalesce(max(ticket_counts.ticket_count), 0)::int as max_tickets
    from airplane
    left join flight
      on flight.airline_name = airplane.airline_name
      and flight.airplane_id = airplane.airplane_id
    left join lateral (
      select count(*)::int as ticket_count
      from ticket
      where ticket.airline_name = flight.airline_name
        and ticket.flight_number = flight.flight_number
        and ticket.departure_datetime = flight.departure_datetime
    ) as ticket_counts on true
    where airplane.airline_name = ${data.airlineName}
      and airplane.airplane_id = ${data.airplaneId}
  `;
  if (seats < dependencyRows[0].max_tickets) {
    return { error: "Seat count cannot be lower than tickets already sold on assigned flights." };
  }

  await db`
    update airplane
    set number_of_seats = ${seats}
    where airline_name = ${data.airlineName}
      and airplane_id = ${data.airplaneId}
  `;
  return { message: `Airplane ${data.airplaneId} seat count updated.` };
}

export async function deleteAirplaneInternal(data: { airlineName: string; airplaneId: string }) {
  const user = await requireUser("staff");
  if (!canStaffManageOperationalAirline(user, data.airlineName)) {
    return { error: "You can only manage airplanes you are allowed to manage." };
  }

  const dependencyRows = await db<Array<{ flight_count: number }>>`
    select count(*)::int as flight_count
    from flight
    where airline_name = ${data.airlineName}
      and airplane_id = ${data.airplaneId}
  `;
  if (dependencyRows[0].flight_count > 0) {
    return { error: "Airplanes assigned to flights cannot be deleted." };
  }

  await db`
    delete from airplane
    where airline_name = ${data.airlineName}
      and airplane_id = ${data.airplaneId}
  `;
  return { message: `Airplane ${data.airplaneId} deleted.` };
}

export async function getFlightPassengersInternal(data: {
  airlineName: string;
  departureDatetime: string;
  flightNumber: string;
}) {
  const user = await requireUser("staff");
  if (!canStaffManageOperationalAirline(user, data.airlineName)) return [];

  const passengers = await db<
    Array<{
      customer_email: string;
      customer_name: string;
      passport_number: string;
      purchase_datetime: string;
      ticket_id: string;
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
      and ticket.departure_datetime = ${normalizeTimestampForSql(data.departureDatetime)}::text::timestamp
    order by ticket.purchase_datetime asc
  `;

  return passengers.map((row) => ({
    customerEmail: row.customer_email,
    customerName: row.customer_name,
    passportNumber: row.passport_number,
    purchaseDatetime: serializeTimestamp(row.purchase_datetime),
    ticketId: row.ticket_id,
  })) satisfies Array<PassengerRecord>;
}
export async function getStaffReportInternal(data: { endDate: string; startDate: string }) {
  const user = await requireUser("staff");
  const airlineScope = getStaffOperationalAirlineScope(user);

  if (data.startDate > data.endDate) {
    return {
      endDate: data.endDate,
      error: "Start date must be on or before end date.",
      startDate: data.startDate,
      ticketsSold: 0,
    };
  }

  const rangeSummaryRows = await db<Array<{ tickets_sold: number }>>`
    select count(*)::int as tickets_sold
    from ticket
    where (${airlineScope}::text is null or airline_name = ${airlineScope})
      and purchase_datetime >= ${data.startDate}::date
      and purchase_datetime < ${data.endDate}::date + interval '1 day'
  `;
  return {
    endDate: data.endDate,
    startDate: data.startDate,
    ticketsSold: rangeSummaryRows[0].tickets_sold,
  };
}

// --- Superadmin operations ---

async function requireSuperadmin() {
  const user = await requireUser("staff");
  if (!user.staffPermission || !isSuperadmin(user.staffPermission)) {
    throw new Error("AUTH_FORBIDDEN");
  }
  return user;
}

export async function listAllAirlinesInternal() {
  await requireSuperadmin();
  return db<Array<{ name: string }>>`
    select name from airline order by name asc
  `;
}

export async function createAirlineInternal(data: { name: string }) {
  await requireSuperadmin();
  await db`insert into airline (name) values (${data.name})`;
  return { message: `Airline "${data.name}" created.` };
}
export async function updateAirlineInternal(data: { name: string; value: string }) {
  await requireSuperadmin();
  const value = data.value.trim();
  if (!value) return { error: "Airline name is required." };
  await db`
    update airline
    set name = ${value}
    where name = ${data.name}
  `;
  return { message: `Airline "${data.name}" renamed to "${value}".` };
}

export async function deleteAirlineInternal(data: { name: string }) {
  await requireSuperadmin();
  await db`delete from airline where name = ${data.name}`;
  return { message: `Airline "${data.name}" deleted.` };
}

export async function listAllAirportsInternal() {
  await requireSuperadmin();
  return db<
    Array<{
      airport_type: string;
      city: string;
      code: string;
      country: string;
    }>
  >`
    select code, city, country, airport_type from airport order by code asc
  `;
}

export async function createAirportInternal(data: {
  airportType: string;
  city: string;
  code: string;
  country: string;
}) {
  await requireSuperadmin();
  await db`
    insert into airport (code, city, country, airport_type)
    values (${data.code}, ${data.city}, ${data.country}, ${data.airportType})
  `;
  return { message: `Airport ${data.code} created.` };
}
const AIRPORT_FIELD_UPDATES = {
  airportType: { column: "airport_type", validate: (value: string) => value.toLowerCase() },
  city: { column: "city", validate: (value: string) => value.trim() },
  country: { column: "country", validate: (value: string) => value.trim() },
} as const;

export async function updateAirportFieldInternal(data: {
  code: string;
  field: keyof typeof AIRPORT_FIELD_UPDATES;
  value: string;
}) {
  await requireSuperadmin();
  const entry = AIRPORT_FIELD_UPDATES[data.field];
  const value = entry.validate(data.value);
  if (!value) return { error: "Value is required." };
  if (data.field === "airportType" && !["domestic", "international", "both"].includes(value)) {
    return { error: "Choose a valid airport type." };
  }

  await db`
    update airport
    set ${db(entry.column)} = ${value}
    where code = ${data.code}
  `;
  return { message: `Airport ${data.code} updated.` };
}

export async function deleteAirportInternal(data: { code: string }) {
  await requireSuperadmin();
  await db`delete from airport where code = ${data.code}`;
  return { message: `Airport ${data.code} deleted.` };
}

export async function listAllStaffInternal() {
  await requireSuperadmin();
  const rows = await db<
    Array<{
      airline_name: string;
      email: string;
      first_name: string;
      last_name: string;
      phone_number: string | null;
      username: string;
    }>
  >`
    select airline_staff.username,
           airline_staff.airline_name,
           airline_staff.first_name,
           airline_staff.last_name,
           airline_staff.email,
           airline_staff_phone.phone_number
    from airline_staff
    left join airline_staff_phone on airline_staff_phone.username = airline_staff.username
    order by airline_staff.username asc, airline_staff_phone.phone_number asc
  `;

  const staffByUsername: Record<
    string,
    {
      airline_name: string;
      email: string;
      first_name: string;
      last_name: string;
      phone_numbers: Array<string>;
      username: string;
    }
  > = {};

  for (const row of rows) {
    const staff = staffByUsername[row.username] ?? {
      airline_name: row.airline_name,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone_numbers: [],
      username: row.username,
    };
    if (row.phone_number) staff.phone_numbers.push(row.phone_number);
    staffByUsername[row.username] = staff;
  }

  return Object.values(staffByUsername);
}
const STAFF_FIELD_UPDATES = {
  airlineName: { column: "airline_name", validate: (value: string) => value.trim() },
  email: {
    column: "email",
    validate: (value: string) => {
      const email = value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Use a valid email address.");
      return email;
    },
  },
  firstName: {
    column: "first_name",
    validate: (value: string) => {
      const result = customerFieldValidators.name.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  lastName: {
    column: "last_name",
    validate: (value: string) => {
      const result = customerFieldValidators.name.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
} as const;

function validateStaffFieldUpdate(field: keyof typeof STAFF_FIELD_UPDATES, value: string) {
  const validated = STAFF_FIELD_UPDATES[field].validate(value);
  if (!validated) throw new Error("Value is required.");
  return validated;
}

export async function updateStaffFieldInternal(data: {
  field: keyof typeof STAFF_FIELD_UPDATES;
  username: string;
  value: string;
}) {
  await requireSuperadmin();
  const entry = STAFF_FIELD_UPDATES[data.field];
  const validated = validateStaffFieldUpdate(data.field, data.value);

  if (data.field === "airlineName") {
    const airlineRows = await db<Array<{ name: string }>>`
      select name
      from airline
      where name = ${validated}
      limit 1
    `;
    if (!airlineRows.length) return { error: "Choose a valid airline." };
  }

  await db`
    update airline_staff
    set ${db(entry.column)} = ${validated}
    where username = ${data.username}
  `;

  return { message: `Staff "${data.username}" updated.` };
}

export async function deleteStaffInternal(data: { username: string }) {
  await requireSuperadmin();
  await db.begin(async (transaction) => {
    await transaction`delete from airline_staff_phone where username = ${data.username}`;
    await transaction`delete from airline_staff where username = ${data.username}`;
  });
  return { message: `Staff "${data.username}" deleted.` };
}

export async function listAllCustomersInternal() {
  await requireSuperadmin();
  return db<
    Array<{
      building_number: string;
      city: string;
      date_of_birth: string;
      email: string;
      name: string;
      passport_country: string;
      passport_expiration: string;
      passport_number: string;
      phone_number: string;
      state: string;
      street: string;
    }>
  >`
    select email, name, phone_number, date_of_birth::text as date_of_birth,
           building_number, street, city, state,
           passport_number, passport_expiration::text as passport_expiration,
           passport_country
    from customer
    order by name asc
  `;
}

export async function deleteCustomerInternal(data: { email: string }) {
  await requireSuperadmin();
  const dependencyRows = await db<Array<{ has_reviews: boolean; has_tickets: boolean }>>`
    select
      exists (
        select 1
        from ticket
        where ticket.customer_email = ${data.email}
      ) as has_tickets,
      exists (
        select 1
        from review
        where review.customer_email = ${data.email}
      ) as has_reviews
  `;
  const dependencyRow = dependencyRows[0];
  if (dependencyRow.has_tickets || dependencyRow.has_reviews) {
    return { error: "Customers with tickets or reviews cannot be deleted." };
  }

  await db`delete from customer where email = ${data.email}`;
  return { message: `Customer "${data.email}" deleted.` };
}
const MANAGED_CUSTOMER_FIELD_UPDATES = {
  buildingNumber: {
    column: "building_number",
    validate: (value: string) => {
      const result = customerFieldValidators.buildingNumber.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  city: {
    column: "city",
    validate: (value: string) => {
      const result = customerFieldValidators.city.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  name: {
    column: "name",
    validate: (value: string) => {
      const result = customerFieldValidators.name.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  passportCountry: {
    column: "passport_country",
    validate: (value: string) => {
      const result = customerFieldValidators.passportCountry.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  passportExpiration: {
    column: "passport_expiration",
    validate: (value: string) => {
      const result = customerFieldValidators.passportExpiration.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  passportNumber: {
    column: "passport_number",
    validate: (value: string) => {
      const result = customerFieldValidators.passportNumber.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  phoneNumber: {
    column: "phone_number",
    validate: (value: string) => {
      const result = customerFieldValidators.phoneNumber.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  state: {
    column: "state",
    validate: (value: string) => {
      const result = customerFieldValidators.state.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
  street: {
    column: "street",
    validate: (value: string) => {
      const result = customerFieldValidators.street.safeParse(value);
      if (!result.success) throw new Error(result.error.issues[0].message);
      return result.data;
    },
  },
} as const;

export async function updateManagedCustomerFieldInternal(data: {
  email: string;
  field: keyof typeof MANAGED_CUSTOMER_FIELD_UPDATES;
  value: string;
}) {
  await requireSuperadmin();
  const entry = MANAGED_CUSTOMER_FIELD_UPDATES[data.field];
  const validated = entry.validate(data.value);
  await db`
    update customer
    set ${db(entry.column)} = ${validated}
    where email = ${data.email}
  `;
  return { message: `Customer "${data.email}" updated.` };
}

export async function getCustomerProfileInternal() {
  const user = await requireUser("customer");
  const rows = await db<
    Array<{
      building_number: string;
      city: string;
      date_of_birth: string;
      email: string;
      name: string;
      passport_country: string;
      passport_expiration: string;
      passport_number: string;
      phone_number: string;
      state: string;
      street: string;
    }>
  >`
    select email, name, phone_number, building_number, street, city, state,
           passport_number, passport_expiration::text as passport_expiration, passport_country, date_of_birth::text as date_of_birth
    from customer
    where email = ${user.email}
  `;
  const row = rows.at(0);
  if (!row) throw new Error("Customer not found.");
  return {
    buildingNumber: row.building_number,
    city: row.city,
    dateOfBirth: row.date_of_birth,
    email: row.email,
    name: row.name,
    passportCountry: row.passport_country,
    passportExpiration: row.passport_expiration,
    passportNumber: row.passport_number,
    phoneNumber: row.phone_number,
    state: row.state,
    street: row.street,
  };
}

const EDITABLE_CUSTOMER_FIELDS: Partial<
  Record<string, { column: string; validate: (v: string) => string }>
> = {
  buildingNumber: {
    column: "building_number",
    validate: (v) => {
      const r = customerFieldValidators.buildingNumber.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  city: {
    column: "city",
    validate: (v) => {
      const r = customerFieldValidators.city.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  name: {
    column: "name",
    validate: (v) => {
      const r = customerFieldValidators.name.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  passportCountry: {
    column: "passport_country",
    validate: (v) => {
      const r = customerFieldValidators.passportCountry.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  passportExpiration: {
    column: "passport_expiration",
    validate: (v) => {
      const r = customerFieldValidators.passportExpiration.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  passportNumber: {
    column: "passport_number",
    validate: (v) => {
      const r = customerFieldValidators.passportNumber.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  phoneNumber: {
    column: "phone_number",
    validate: (v) => {
      const r = customerFieldValidators.phoneNumber.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  state: {
    column: "state",
    validate: (v) => {
      const r = customerFieldValidators.state.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
  street: {
    column: "street",
    validate: (v) => {
      const r = customerFieldValidators.street.safeParse(v);
      if (!r.success) throw new Error(r.error.issues[0].message);
      return r.data;
    },
  },
};

export async function updateCustomerFieldInternal(data: { field: string; value: string }) {
  const user = await requireUser("customer");
  const entry = EDITABLE_CUSTOMER_FIELDS[data.field];
  if (!entry) throw new Error(`Field "${data.field}" is not editable.`);
  const validated = entry.validate(data.value);
  await db`
    update customer
    set ${db(entry.column)} = ${validated}
    where email = ${user.email}
  `;
  return { success: true };
}

async function replaceStaffPhoneNumbers(username: string, phoneNumbers: Array<string>) {
  await db.begin(async (transaction) => {
    await transaction`delete from airline_staff_phone where username = ${username}`;
    for (const phoneNumber of phoneNumbers) {
      await transaction`
        insert into airline_staff_phone (username, phone_number)
        values (${username}, ${phoneNumber})
      `;
    }
  });
}

async function changePasswordForAccount(options: {
  accountLabel: string;
  currentPassword: string;
  newPassword: string;
  selectPassword: () => Promise<string | null>;
  updatePassword: (hashedPassword: string) => Promise<unknown>;
}) {
  const bcrypt = await import("bcryptjs");
  const storedPassword = await options.selectPassword();
  if (!storedPassword) throw new Error(`${options.accountLabel} not found.`);
  const valid = await bcrypt.compare(options.currentPassword, storedPassword);
  if (!valid) throw new Error("Current password is incorrect.");
  if (options.newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
  const hashed = await bcrypt.hash(options.newPassword, 10);
  await options.updatePassword(hashed);
  return { success: true };
}

export async function changePasswordInternal(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await requireUser("customer");
  return changePasswordForAccount({
    accountLabel: "Customer",
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
    selectPassword: async () => {
      const rows = await db<Array<{ password: string }>>`
        select password from customer where email = ${user.email}
      `;
      return rows.at(0)?.password ?? null;
    },
    updatePassword: (hashedPassword) =>
      db`update customer set password = ${hashedPassword} where email = ${user.email}`,
  });
}

export async function getPaymentHistoryInternal() {
  const user = await requireUser("customer");
  return db<
    Array<{
      card_expiration: string;
      card_number: string;
      card_type: string;
      name_on_card: string;
    }>
  >`
    select distinct on (card_number) card_number, card_type, name_on_card, card_expiration::text as card_expiration
    from ticket
    where customer_email = ${user.email}
    order by card_number, card_expiration desc
  `;
}

export async function replaceStaffPhoneNumbersInternal(data: {
  phoneNumbers: Array<string>;
  username: string;
}) {
  await requireSuperadmin();
  await replaceStaffPhoneNumbers(data.username, data.phoneNumbers);
  return { message: `Staff "${data.username}" phone numbers updated.` };
}

export async function getStaffProfileInternal() {
  const user = await requireUser("staff");
  const rows = await db<
    Array<{
      airline_name: string;
      date_of_birth: string;
      email: string;
      first_name: string;
      last_name: string;
      username: string;
    }>
  >`
    select username, airline_name, first_name, last_name, email,
           date_of_birth::text as date_of_birth
    from airline_staff
    where username = ${user.id}
    limit 1
  `;
  const staff = rows.at(0);
  if (!staff) throw new Error("Staff account not found.");

  const phoneRows = await db<Array<{ phone_number: string }>>`
    select phone_number from airline_staff_phone
    where username = ${user.id}
    order by phone_number asc
  `;

  return {
    airlineName: staff.airline_name,
    dateOfBirth: staff.date_of_birth,
    email: staff.email,
    firstName: staff.first_name,
    lastName: staff.last_name,
    phoneNumbers: phoneRows.map((r) => r.phone_number),
    username: staff.username,
  };
}

export async function updateStaffProfileFieldInternal(data: {
  field: "email" | "firstName" | "lastName";
  value: string;
}) {
  const user = await requireUser("staff");
  const fieldMap = {
    email: "email",
    firstName: "first_name",
    lastName: "last_name",
  } as const;
  const column = fieldMap[data.field];
  const trimmed = data.value.trim();
  if (!trimmed) return { error: "Value is required." };
  if (data.field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { error: "Use a valid email address." };
  }
  await db`
    update airline_staff
    set ${db(column)} = ${trimmed}
    where username = ${user.id}
  `;
  return { message: "Profile updated." };
}

export async function replaceOwnStaffPhoneNumbersInternal(data: { phoneNumbers: Array<string> }) {
  const user = await requireUser("staff");
  await replaceStaffPhoneNumbers(user.id, data.phoneNumbers);
  return { message: "Phone numbers updated." };
}

export async function changeStaffPasswordInternal(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const user = await requireUser("staff");
  return changePasswordForAccount({
    accountLabel: "Staff account",
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
    selectPassword: async () => {
      const rows = await db<Array<{ password: string }>>`
        select password from airline_staff where username = ${user.id}
      `;
      return rows.at(0)?.password ?? null;
    },
    updatePassword: (hashedPassword) =>
      db`update airline_staff set password = ${hashedPassword} where username = ${user.id}`,
  });
}

