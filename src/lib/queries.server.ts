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
import { NANOID_LENGTH, db, ensureTicketIdColumn } from "@/lib/db";
import { requireUser } from "@/lib/auth.server";
import {
  canManageOperationalAirline,
  getOperationalAirlineScope,
  isSuperadmin,
} from "@/lib/staff-permissions";
import { customerFieldValidators } from "@/lib/schemas";
import { getAirportOption } from "@/lib/airports";

const DEFAULT_STAFF_FLIGHT_WINDOW_DAYS = 30;

function serializeTimestamp(value: Date | string) {
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const seconds = String(value.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  return value.replace(" ", "T").replace(/\.\d+Z?$/, "");
}

function normalizeQueryValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  return `%${normalized}%`;
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
      countryCode: coord?.countryCode ?? "",
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

  const outbound = await db<
    Array<{
      airline_name: string;
      arrival_airport_code: string;
      arrival_airport_name: string;
      arrival_city: string;
      arrival_datetime: string;
      average_rating: number | null;
      available_seats: number;
      base_price: string;
      departure_airport_code: string;
      departure_airport_name: string;
      departure_city: string;
      departure_datetime: string;
      flight_number: string;
      review_count: number;
      status: "on_time" | "delayed";
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
  `;

  let returnOptions = outbound.slice(0, 0);
  if (input.tripType === "round-trip" && sourceQuery && destinationQuery) {
    returnOptions = await db<
      Array<{
        airline_name: string;
        arrival_airport_code: string;
        arrival_airport_name: string;
        arrival_city: string;
        arrival_datetime: string;
        average_rating: number | null;
        available_seats: number;
        base_price: string;
        departure_airport_code: string;
        departure_airport_name: string;
        departure_city: string;
        departure_datetime: string;
        flight_number: string;
        review_count: number;
        status: "on_time" | "delayed";
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
    `;
  }

  function mapFlights(
    rows: Array<{
      airline_name: string;
      arrival_airport_code: string;
      arrival_airport_name: string;
      arrival_city: string;
      arrival_datetime: string;
      average_rating: number | null;
      available_seats: number;
      base_price: string;
      departure_airport_code: string;
      departure_airport_name: string;
      departure_city: string;
      departure_datetime: string;
      flight_number: string;
      review_count: number;
      status: "on_time" | "delayed";
    }>,
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
    }));
  }

  return {
    outbound: mapFlights(outbound),
    returnOptions: mapFlights(returnOptions),
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

  const flights = await db<
    Array<{
      airline_name: string;
      arrival_airport_code: string;
      arrival_airport_name: string;
      arrival_city: string;
      arrival_datetime: string;
      base_price: string;
      comment: string | null;
      departure_airport_code: string;
      departure_airport_name: string;
      departure_city: string;
      departure_datetime: string;
      flight_number: string;
      purchase_datetime: string;
      rating: number | null;
      status: "on_time" | "delayed";
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
  `;

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
      new Date(serializeTimestamp(row.arrival_datetime)) < new Date() && row.rating === null,
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
  })) satisfies Array<CustomerFlight>;

  return {
    currentUser: {
      displayName: user.displayName,
      email: user.email,
    },
    pastFlights: mappedFlights.filter((flight) => new Date(flight.arrivalDatetime) < new Date()),
    upcomingFlights: mappedFlights.filter(
      (flight) => new Date(flight.arrivalDatetime) >= new Date(),
    ),
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

  const flights = await db<
    Array<{
      airline_name: string;
      airplane_id: string;
      arrival_airport_code: string;
      arrival_airport_name: string;
      arrival_city: string;
      arrival_datetime: string;
      average_rating: number | null;
      available_seats: number;
      base_price: string;
      departure_airport_code: string;
      departure_airport_name: string;
      departure_city: string;
      departure_datetime: string;
      flight_number: string;
      review_count: number;
      status: "on_time" | "delayed";
      ticket_count: number;
    }>
  >`
    select
      f.airline_name,
      f.airplane_id,
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
    where (${airlineScope}::text is null or f.airline_name = ${airlineScope})
      and (
        (${startDate}::text is null and ${endDate}::text is null and f.departure_datetime between now() and now() + make_interval(days => ${DEFAULT_STAFF_FLIGHT_WINDOW_DAYS}))
        or (${startDate}::text is not null and f.departure_datetime::date >= ${startDate}::date)
      )
      and (${endDate}::text is null or f.departure_datetime::date <= ${endDate}::date)
      and (${sourceQuery}::text is null or lower(departure_airport.city) like ${sourceQuery} or lower(departure_airport.code) like ${sourceQuery})
      and (${destinationQuery}::text is null or lower(arrival_airport.city) like ${destinationQuery} or lower(arrival_airport.code) like ${destinationQuery})
    group by
      f.airline_name,
      f.airplane_id,
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
    select airline_name, airplane_id, manufacturing_company, manufacturing_date, number_of_seats
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
        average_rating: number | null;
        comments: Array<{ comment: string | null; rating: number }>;
        departure_datetime: string;
        flight_number: string;
        review_count: number;
      }>
  >`
    select
      f.airline_name,
      f.flight_number,
      f.departure_datetime,
      round(avg(review.rating)::numeric, 1)::float8 as average_rating,
      count(distinct review.customer_email)::int as review_count,
      coalesce(
        jsonb_agg(
          jsonb_build_object('comment', nullif(btrim(review.comment), ''), 'rating', review.rating)
          order by review.review_datetime
        ) filter (where review.customer_email is not null),
        '[]'::jsonb
      ) as comments
    from flight f
    left join review on review.airline_name = f.airline_name and review.flight_number = f.flight_number and review.departure_datetime = f.departure_datetime
    where (${airlineScope}::text is null or f.airline_name = ${airlineScope})
    group by f.airline_name, f.flight_number, f.departure_datetime
    order by f.departure_datetime desc
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
      month: string;
      tickets_sold: number;
    }>
  >`
    select
      to_char(date_trunc('month', purchase_datetime), 'YYYY-MM') as month,
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
      manufacturingDate: serializeTimestamp(row.manufacturing_date),
      numberOfSeats: row.number_of_seats,
    })),
    airports,
    flights: flights.map((row) => ({
      airlineName: row.airline_name,
      airplaneId: row.airplane_id,
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
    ratings: ratings.map((row) => ({
      airlineName: row.airline_name,
      averageRating: row.average_rating,
      comments: row.comments,
      departureDatetime: serializeTimestamp(row.departure_datetime),
      flightNumber: row.flight_number,
      reviewCount: row.review_count,
    })),
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

  await ensureTicketIdColumn();

  const result = await db.begin(async (transaction) => {
    const flightRows = await transaction<
      Array<{
        base_price: string;
        is_future: boolean;
        number_of_seats: number;
      }>
    >`
      select
        f.base_price,
        f.departure_datetime > now() as is_future,
        airplane.number_of_seats
      from flight f
      join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
      where f.airline_name = ${data.airlineName}
        and f.flight_number = ${data.flightNumber}
        and f.departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
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
        and departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
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
        replace(${data.departureDatetime}, 'T', ' ')::timestamp,
        now(),
        ${data.cardType},
        ${data.cardNumber},
        ${data.nameOnCard},
        ${data.cardExpiration}
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
  `;
  if (!eligibleFlightRecords.length || !eligibleFlightRecords[0].eligible) {
    return {
      error: "Only completed flights that you purchased can be reviewed.",
    };
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
  `;
  if (existingReviewRecords[0].exists) {
    return { error: "You already reviewed this flight." };
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
  return value.replace("T", " ");
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
      departure_datetime,
      departure_airport_code,
      arrival_airport_code,
      arrival_datetime,
      base_price,
      status,
      airplane_id
    from flight
    where airline_name = ${data.airlineName}
      and flight_number = ${data.flightNumber}
      and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
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
      and ticket.departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
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

  if (new Date(data.arrivalDatetime) <= new Date(data.departureDatetime))
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
      ${data.departureDatetime},
      ${data.departureAirportCode},
      ${data.arrivalAirportCode},
      ${data.arrivalDatetime},
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
  const user = await requireUser("staff");
  if (!canStaffManageOperationalAirline(user, data.airlineName))
    return { error: "You can only edit flights you are allowed to manage." };

  await db`
    update flight
    set status = ${data.status}
    where airline_name = ${data.airlineName}
      and flight_number = ${data.flightNumber}
      and departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
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
        and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
    `;
    return { message: `Flight ${data.flightNumber} status updated.` };
  }

  if (data.field === "basePrice") {
    await db`
      update flight
      set base_price = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
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
        and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
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
        and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
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
        and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
    `;
    return { message: `Flight ${data.flightNumber} arrival airport updated.` };
  }

  if (data.field === "departureDatetime") {
    if (new Date(flight.arrival_datetime) <= new Date(data.value)) {
      return { error: "Departure time must be before arrival time." };
    }

    await db`
      update flight
      set departure_datetime = ${data.value}
      where airline_name = ${flight.airline_name}
        and flight_number = ${flight.flight_number}
        and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
    `;
    return { message: `Flight ${data.flightNumber} departure time updated.` };
  }

  if (new Date(data.value) <= new Date(flight.departure_datetime)) {
    return { error: "Arrival time must be after departure time." };
  }

  await db`
    update flight
    set arrival_datetime = ${data.value}
    where airline_name = ${flight.airline_name}
      and flight_number = ${flight.flight_number}
      and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
  `;
  return { message: `Flight ${data.flightNumber} arrival time updated.` };
}

export async function deleteFlightInternal(data: FlightIdentityInput) {
  const flight = await getStaffFlightForMutation(data);
  if (!flight) return { error: "Flight not found." };

  const dependencyRows = await db<Array<{ review_count: number; ticket_count: number }>>`
    select
      count(distinct ticket.ticket_id)::int as ticket_count,
      count(distinct review.customer_email)::int as review_count
    from flight
    left join ticket
      on ticket.airline_name = flight.airline_name
      and ticket.flight_number = flight.flight_number
      and ticket.departure_datetime = flight.departure_datetime
    left join review
      on review.airline_name = flight.airline_name
      and review.flight_number = flight.flight_number
      and review.departure_datetime = flight.departure_datetime
    where flight.airline_name = ${flight.airline_name}
      and flight.flight_number = ${flight.flight_number}
      and flight.departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
  `;
  const dependencyRow = dependencyRows[0];
  if (dependencyRow.ticket_count > 0 || dependencyRow.review_count > 0) {
    return { error: "Flights with tickets or reviews cannot be deleted." };
  }

  await db`
    delete from flight
    where airline_name = ${flight.airline_name}
      and flight_number = ${flight.flight_number}
      and departure_datetime::text = ${formatFlightDateForSql(data.departureDatetime)}
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
      and ticket.departure_datetime::text = replace(${data.departureDatetime}, 'T', ' ')
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

  if (new Date(data.startDate) > new Date(data.endDate)) {
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
      and purchase_datetime::date between ${data.startDate}::date and ${data.endDate}::date
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
  return db<
    Array<{
      airline_name: string;
      email: string;
      first_name: string;
      last_name: string;
      username: string;
    }>
  >`
    select username, airline_name, first_name, last_name, email
    from airline_staff
    order by username asc
  `;
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
  const dependencyRows = await db<Array<{ review_count: number; ticket_count: number }>>`
    select
      count(distinct ticket.ticket_id)::int as ticket_count,
      count(distinct review.departure_datetime)::int as review_count
    from customer
    left join ticket on ticket.customer_email = customer.email
    left join review on review.customer_email = customer.email
    where customer.email = ${data.email}
  `;
  const dependencyRow = dependencyRows[0];
  if (dependencyRow.ticket_count > 0 || dependencyRow.review_count > 0) {
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
           passport_number, passport_expiration, passport_country, date_of_birth
    from customer
    where email = ${user.email}
  `;
  const row = rows.at(0);
  if (!row) throw new Error("Customer not found.");
  return {
    buildingNumber: row.building_number,
    city: row.city,
    dateOfBirth:
      (row.date_of_birth as unknown) instanceof Date
        ? (row.date_of_birth as unknown as Date).toISOString().split("T")[0]
        : String(row.date_of_birth),
    email: row.email,
    name: row.name,
    passportCountry: row.passport_country,
    passportExpiration:
      (row.passport_expiration as unknown) instanceof Date
        ? (row.passport_expiration as unknown as Date).toISOString().split("T")[0]
        : String(row.passport_expiration),
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

export async function changePasswordInternal(data: {
  currentPassword: string;
  newPassword: string;
}) {
  const bcrypt = (await import("bcrypt")).default;
  const user = await requireUser("customer");
  const rows = await db<Array<{ password: string }>>`
    select password from customer where email = ${user.email}
  `;
  const row = rows.at(0);
  if (!row) throw new Error("Customer not found.");
  const valid = await bcrypt.compare(data.currentPassword, row.password);
  if (!valid) throw new Error("Current password is incorrect.");
  if (data.newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
  const hashed = await bcrypt.hash(data.newPassword, 10);
  await db`update customer set password = ${hashed} where email = ${user.email}`;
  return { success: true };
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
    select distinct on (card_number) card_number, card_type, name_on_card, card_expiration
    from ticket
    where customer_email = ${user.email}
    order by card_number, card_expiration desc
  `;
}
