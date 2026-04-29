import postgres from "postgres"

import { env } from "@/lib/env"

export const NANOID_LENGTH = 21

export const db = postgres(env.databaseUrl, {
  connect_timeout: 10,
  idle_timeout: 20,
  max: 10,
  prepare: false,
  ssl: env.databaseUrl.includes("sslmode") ? "require" : false,
})

let ensureSessionTablePromise: Promise<void> | null = null
let ensureFlightReadModelPromise: Promise<void> | null = null

export async function ensureFlightReadModel() {
  if (!ensureFlightReadModelPromise) {
    ensureFlightReadModelPromise = (async function initializeFlightReadModel() {
      try {
        await db`
          create or replace view flight_read_model as
          select
            flight.airline_name,
            flight.flight_number,
            flight.departure_datetime,
            flight.arrival_datetime,
            flight.departure_airport_code,
            departure_airport.city as departure_city,
            departure_airport.country as departure_country,
            flight.arrival_airport_code,
            arrival_airport.city as arrival_city,
            arrival_airport.country as arrival_country,
            flight.airplane_id,
            airplane.number_of_seats,
            flight.base_price,
            flight.status::varchar(20) as status,
            coalesce(ticket_counts.ticket_count, 0)::integer as ticket_count,
            greatest(airplane.number_of_seats - coalesce(ticket_counts.ticket_count, 0), 0)::integer as available_seats,
            review_stats.average_rating,
            coalesce(review_stats.review_count, 0)::integer as review_count
          from flight
          join airport as departure_airport on departure_airport.code = flight.departure_airport_code
          join airport as arrival_airport on arrival_airport.code = flight.arrival_airport_code
          join airplane on airplane.airline_name = flight.airline_name
            and airplane.airplane_id = flight.airplane_id
          left join (
            select airline_name, flight_number, departure_datetime, count(*)::integer as ticket_count
            from ticket
            group by airline_name, flight_number, departure_datetime
          ) as ticket_counts on ticket_counts.airline_name = flight.airline_name
            and ticket_counts.flight_number = flight.flight_number
            and ticket_counts.departure_datetime = flight.departure_datetime
          left join (
            select
              airline_name,
              flight_number,
              departure_datetime,
              round(avg(rating)::numeric, 1)::float8 as average_rating,
              count(*)::integer as review_count
            from review
            group by airline_name, flight_number, departure_datetime
          ) as review_stats on review_stats.airline_name = flight.airline_name
            and review_stats.flight_number = flight.flight_number
            and review_stats.departure_datetime = flight.departure_datetime
        `
      } catch (error) {
        ensureFlightReadModelPromise = null
        throw error
      }
    })()
  }

  await ensureFlightReadModelPromise
}


export async function ensureAppSessionTable() {
  if (!ensureSessionTablePromise) {
    ensureSessionTablePromise = (async function initializeAppSessionTable() {
      try {
        await db`
          create table if not exists app_session (
            id varchar(21) primary key,
            role varchar(20) not null,
            customer_email varchar(254),
            staff_username varchar(50),
            created_at timestamp not null default now(),
            expires_at timestamp not null,
            check (role in ('customer', 'staff')),
            check (
              (role = 'customer' and customer_email is not null and staff_username is null)
              or
              (role = 'staff' and staff_username is not null and customer_email is null)
            ),
            foreign key (customer_email) references customer(email) on delete cascade,
            foreign key (staff_username) references airline_staff(username) on delete cascade
          )
        `
        await db`create index if not exists app_session_expires_at_idx on app_session (expires_at)`
        await db`delete from app_session where expires_at <= now()`
      } catch (error) {
        ensureSessionTablePromise = null
        throw error
      }
    })()
  }

  await ensureSessionTablePromise
}


