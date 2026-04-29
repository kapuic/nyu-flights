# Use Cases and Queries

This document describes the main use cases implemented by the air ticket reservation application and the database queries behind them. The app is organized as a traveler-facing product for public visitors and customers, plus a staff-facing dashboard for airline operations and superadmin management.

The SQL shown here is written in the same shape as the app's parameterized PostgreSQL queries. Values such as `sourceQuery`, `destinationQuery`, `customerEmail`, and `airlineScope` are runtime parameters supplied by validated forms, sessions, or staff permissions.

## Search

The public search page is the first page travelers see. It lets visitors search future flights before signing in, compare routes, sort results, and start a booking flow. The page uses a dark, globe-based visual design so the search experience feels more like a real travel product than a class-project form. The controls are intentionally compact: trip type, origin, destination, date, and sorting stay close to the results they affect.

### Globe Routes

The globe background shows a small rotating sample of real routes from the database. This makes the landing page feel connected to live route data instead of using decorative fake paths.

> ```sql
> select departure_airport_code, arrival_airport_code
> from (select distinct departure_airport_code, arrival_airport_code from flight) as routes
> order by random()
> limit 10;
> ```
>
> Lists distinct route pairs from the `flight` table so the globe can draw route arcs between real airport codes.

### Autocomplete

The airport inputs support autocomplete. Typing a city, airport code, or country searches the database and returns matching airports. This makes the search easier because users do not need to memorize three-letter airport codes.

> ```sql
> select airport.city, airport.code, airport.country
> from airport
> where lower(airport.city) like :query
>   or lower(airport.code) like :query
>   or lower(airport.country) like :query
> order by
>   case when lower(airport.code) = lower(:rawQuery) then 0 else 1 end,
>   case when lower(airport.city) = lower(:rawQuery) then 0 else 1 end,
>   airport.city asc,
>   airport.code asc
> limit 8;
> ```
>
> Matches `query` from the `airport` table against city, airport code, and country, then prioritizes exact airport-code and city matches before alphabetical suggestions.

### Airport Reference List

The search page also loads database-backed airport options so the UI can render available airports consistently and combine them with static coordinate metadata for the globe.

> ```sql
> select code, city, country
> from airport
> order by code asc;
> ```
>
> Lists airport records from the `airport` table so the search UI, comboboxes, and globe helpers use the same airport source of truth.

### One-Way Search

One-way search finds future outbound flights. It supports normal origin-to-destination search, but also supports “Any origin” and “Any destination” by allowing either side to be blank. That is better than a rigid required-field search because travelers can browse all destinations from one city, all origins into one city, or every future flight on a specific date.

> ```sql
> select
>   airline_name,
>   airplane_id,
>   flight_number,
>   departure_datetime,
>   arrival_datetime,
>   departure_airport_code,
>   departure_city,
>   arrival_airport_code,
>   arrival_city,
>   base_price,
>   status,
>   ticket_count,
>   available_seats,
>   average_rating,
>   review_count
> from flight_read_model
> where departure_datetime >= now()
>   and (:departureDate::text is null or (departure_datetime >= :departureDate::date and departure_datetime < :departureDate::date + interval '1 day'))
>   and (:sourceQuery::text is null or lower(departure_city) like :sourceQuery or lower(departure_airport_code) like :sourceQuery)
>   and (:destinationQuery::text is null or lower(arrival_city) like :destinationQuery or lower(arrival_airport_code) like :destinationQuery)
> order by departure_datetime asc;
> ```
>
> Searches future rows from the `flight_read_model` view according to optional `departureDate`, `sourceQuery`, and `destinationQuery` parameters, including seat availability and review summary data for each result.

### Round-Trip Search

Round-trip search uses the same outbound query, then runs a second query with origin and destination reversed. The UI separates outbound selection from return selection so the traveler can make one decision at a time instead of scanning two unrelated result lists at once.

> ```sql
> select
>   airline_name,
>   airplane_id,
>   flight_number,
>   departure_datetime,
>   arrival_datetime,
>   departure_airport_code,
>   departure_city,
>   arrival_airport_code,
>   arrival_city,
>   base_price,
>   status,
>   ticket_count,
>   available_seats,
>   average_rating,
>   review_count
> from flight_read_model
> where departure_datetime >= now()
>   and (:returnDate::text is null or (departure_datetime >= :returnDate::date and departure_datetime < :returnDate::date + interval '1 day'))
>   and (:destinationQuery::text is null or lower(departure_city) like :destinationQuery or lower(departure_airport_code) like :destinationQuery)
>   and (:sourceQuery::text is null or lower(arrival_city) like :sourceQuery or lower(arrival_airport_code) like :sourceQuery)
> order by departure_datetime asc;
> ```
>
> Searches return flights from the `flight_read_model` view by reversing the outbound `sourceQuery` and `destinationQuery`, while keeping the same future-flight and date filtering rules.

### Result Comparison and Sorting

Search results show route, departure and arrival time, duration, price, status, seat availability, and rating information. Sorting happens in the client because the same returned result set can be reordered instantly by price, duration, departure time, or arrival time without another database round trip.

## Customer Authentication

Customer authentication is progressive. Visitors can search publicly, but booking, trips, reviews, profile, payment history, and security settings require a customer session. This keeps browsing friction low while still protecting customer-only actions.

### Customer Login

> ```sql
> select email, name, password
> from customer
> where lower(email) = lower(:email)
> limit 1;
> ```
>
> Finds a customer account from the `customer` table using case-insensitive email lookup before bcrypt password verification.

> ```sql
> insert into app_session (id, role, customer_email, staff_username, expires_at)
> values (:sessionId, 'customer', :customerEmail, null, :expiresAt);
> ```
>
> Creates a persistent customer session in the `app_session` table after the submitted password matches the stored bcrypt hash.

### Customer Registration

Customer registration creates a full customer profile, hashes the password, stores passport and contact fields, and immediately signs in the new customer. The UI uses multi-step form organization so identity and address/passport details do not become one overwhelming form.

> ```sql
> select email, name, password
> from customer
> where lower(email) = lower(:email)
> limit 1;
> ```
>
> Checks the `customer` table for an existing account before creating a new customer.

> ```sql
> insert into customer (
>   email,
>   name,
>   password,
>   building_number,
>   street,
>   city,
>   state,
>   phone_number,
>   passport_number,
>   passport_expiration,
>   passport_country,
>   date_of_birth
> )
> values (
>   :email,
>   :name,
>   :hashedPassword,
>   :buildingNumber,
>   :street,
>   :city,
>   :state,
>   :phoneNumber,
>   :passportNumber,
>   :passportExpiration,
>   :passportCountry,
>   :dateOfBirth
> );
> ```
>
> Inserts a new customer into the `customer` table with validated profile, contact, passport, and bcrypt password fields.

### Session Lookup

The app reads the session on page loads and server actions so route guards and role-aware redirects are enforced by the server, not only by the UI.

> ```sql
> select role, customer_email, staff_username, expires_at
> from app_session
> where id = :sessionId
>   and expires_at > now()
> limit 1;
> ```
>
> Finds the active session from the `app_session` table and rejects missing or expired session IDs.

> ```sql
> select email, name, password
> from customer
> where lower(email) = lower(:customerEmail)
> limit 1;
> ```
>
> Resolves the logged-in customer from the `customer` table after a valid customer session is found.

### Logout

> ```sql
> delete from app_session
> where id = :sessionId;
> ```
>
> Deletes the current session from the `app_session` table so the browser cookie no longer points to an authenticated account.

## Checkout and Ticket Purchase

Checkout turns a selected itinerary into one or more tickets. The page is a dedicated transactional flow rather than an inline form, which keeps the booking summary, payment form, validation, and confirmation state visually clear. For round trips, the app purchases the outbound and return selections as separate tickets.

### Flight Lock and Availability Check

Before inserting a ticket, the app locks the selected flight row and checks that it is still a future flight. This prevents a user from buying a ticket for an old flight or racing against another purchase while seat availability is being checked.

> ```sql
> select
>   f.base_price,
>   f.departure_datetime,
>   f.departure_datetime > now() as is_future,
>   airplane.number_of_seats
> from flight f
> join airplane on airplane.airline_name = f.airline_name and airplane.airplane_id = f.airplane_id
> where f.airline_name = :airlineName
>   and f.flight_number = :flightNumber
>   and f.departure_datetime = :departureDatetime::text::timestamp
> for update;
> ```
>
> Locks the selected row from the `flight` table and joins `airplane` to read capacity before ticket purchase.

> ```sql
> select count(*)::int as ticket_count
> from ticket
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Counts existing tickets from the `ticket` table for the selected flight so the app can compare sold tickets against airplane capacity.

### Ticket Insert

> ```sql
> insert into ticket (
>   ticket_id,
>   customer_email,
>   airline_name,
>   flight_number,
>   departure_datetime,
>   purchase_datetime,
>   card_type,
>   card_number,
>   name_on_card,
>   card_expiration
> )
> values (
>   :ticketId,
>   :customerEmail,
>   :airlineName,
>   :flightNumber,
>   :departureDatetime,
>   now(),
>   :cardType,
>   :cardNumber,
>   :nameOnCard,
>   :cardExpiration
> );
> ```
>
> Inserts a ticket into the `ticket` table with the logged-in customer, selected flight identity, payment fields, and server-generated purchase timestamp.

## Customer Trips

The trips page is the customer's travel history and upcoming itinerary page. It separates upcoming and past flights, displays status and timing clearly, and opens review actions only when the flight is eligible. The route is protected so staff accounts and anonymous users cannot see customer trip data.

### View My Flights

> ```sql
> select
>   flight_read_model.airline_name,
>   flight_read_model.airplane_id,
>   flight_read_model.flight_number,
>   flight_read_model.departure_datetime,
>   flight_read_model.arrival_datetime,
>   flight_read_model.departure_airport_code,
>   flight_read_model.departure_city,
>   flight_read_model.arrival_airport_code,
>   flight_read_model.arrival_city,
>   flight_read_model.base_price,
>   flight_read_model.status,
>   flight_read_model.ticket_count,
>   flight_read_model.available_seats,
>   flight_read_model.average_rating,
>   flight_read_model.review_count,
>   ticket.ticket_id,
>   ticket.purchase_datetime,
>   review.rating,
>   review.comment
> from ticket
> join flight_read_model on flight_read_model.airline_name = ticket.airline_name
>   and flight_read_model.flight_number = ticket.flight_number
>   and flight_read_model.departure_datetime = ticket.departure_datetime
> left join review on review.customer_email = ticket.customer_email
>   and review.airline_name = ticket.airline_name
>   and review.flight_number = ticket.flight_number
>   and review.departure_datetime = ticket.departure_datetime
> where ticket.customer_email = :customerEmail
>   and (:startDate::text is null or flight_read_model.departure_datetime >= :startDate::date)
>   and (:endDate::text is null or flight_read_model.departure_datetime < :endDate::date + interval '1 day')
>   and (:sourceQuery::text is null or lower(flight_read_model.departure_city) like :sourceQuery or lower(flight_read_model.departure_airport_code) like :sourceQuery)
>   and (:destinationQuery::text is null or lower(flight_read_model.arrival_city) like :destinationQuery or lower(flight_read_model.arrival_airport_code) like :destinationQuery)
> order by flight_read_model.departure_datetime desc;
> ```
>
> Lists the customer's tickets from the `ticket` table, enriches them through `flight_read_model`, and includes any matching `review` row so the page can split upcoming flights, past flights, and already-reviewed flights.

### Submit a Review

Customers can review only completed flights they purchased and have not already reviewed. The UI uses a focused responsive dialog/drawer with star rating and optional comment instead of placing review fields directly on every trip card.

> ```sql
> select ticket.departure_datetime
> from ticket
> join flight on flight.airline_name = ticket.airline_name
>   and flight.flight_number = ticket.flight_number
>   and flight.departure_datetime = ticket.departure_datetime
> where ticket.customer_email = :customerEmail
>   and ticket.airline_name = :airlineName
>   and ticket.flight_number = :flightNumber
>   and ticket.departure_datetime = :departureDatetime::text::timestamp
>   and flight.arrival_datetime < now()
> except
> select review.departure_datetime
> from review
> where review.customer_email = :customerEmail
>   and review.airline_name = :airlineName
>   and review.flight_number = :flightNumber
> limit 1;
> ```
>
> Checks the `ticket`, `flight`, and `review` tables to ensure the customer purchased the flight, the flight has arrived, and no prior review exists.

> ```sql
> insert into review (
>   customer_email,
>   airline_name,
>   flight_number,
>   departure_datetime,
>   rating,
>   comment,
>   review_datetime
> )
> values (
>   :customerEmail,
>   :airlineName,
>   :flightNumber,
>   :departureDatetime,
>   :rating,
>   :comment,
>   now()
> );
> ```
>
> Inserts a customer rating and optional comment into the `review` table with a server-generated review timestamp.

## Customer Account

Customer account pages keep profile, payment history, and security settings separate. This avoids turning the trips page into a crowded account dashboard and gives each task a clear surface.

### View Profile

> ```sql
> select email, name, phone_number, building_number, street, city, state,
>        passport_number, passport_expiration::text as passport_expiration,
>        passport_country, date_of_birth::text as date_of_birth
> from customer
> where email = :customerEmail;
> ```
>
> Reads the logged-in customer's editable profile fields from the `customer` table.

### Update Profile Field

> ```sql
> update customer
> set :column = :validatedValue
> where email = :customerEmail;
> ```
>
> Updates one validated editable profile field in the `customer` table for the logged-in customer.

### Payment History

> ```sql
> select distinct on (card_number) card_number, card_type, name_on_card, card_expiration
> from ticket
> where customer_email = :customerEmail
> order by card_number, card_expiration desc;
> ```
>
> Lists previously used payment cards from the `ticket` table so customers can review their payment history without exposing unrelated ticket details.

### Change Customer Password

> ```sql
> select password
> from customer
> where email = :customerEmail;
> ```
>
> Fetches the current bcrypt password hash from the `customer` table before verifying the submitted current password.

> ```sql
> update customer
> set password = :hashedPassword
> where email = :customerEmail;
> ```
>
> Updates the customer password in the `customer` table after bcrypt verification and hashing of the new password.

## Staff Authentication

Staff authentication is separate from customer authentication because staff users have different identities, permissions, redirects, and dashboards. Staff users log in by username and are scoped to their airline unless they have superadmin permissions.

### Staff Login

> ```sql
> select username, airline_name, email, first_name, last_name, password
> from airline_staff
> where lower(username) = lower(:username)
> limit 1;
> ```
>
> Finds a staff account from the `airline_staff` table using case-insensitive username lookup before bcrypt password verification.

> ```sql
> insert into app_session (id, role, customer_email, staff_username, expires_at)
> values (:sessionId, 'staff', null, :staffUsername, :expiresAt);
> ```
>
> Creates a persistent staff session in the `app_session` table after the submitted password matches the stored bcrypt hash.

### Staff Registration

Staff registration requires an existing airline, then creates the staff account and phone numbers in one transaction. The staff form is visually more compact than traveler signup because it belongs to an internal operations tool.

> ```sql
> select username, airline_name, email, first_name, last_name, password
> from airline_staff
> where lower(username) = lower(:username)
> limit 1;
> ```
>
> Checks the `airline_staff` table for an existing username before creating a staff account.

> ```sql
> select name
> from airline
> where name = :airlineName
> limit 1;
> ```
>
> Verifies the requested airline exists in the `airline` table before assigning a new staff account to it.

> ```sql
> insert into airline_staff (
>   username,
>   airline_name,
>   password,
>   first_name,
>   last_name,
>   date_of_birth,
>   email
> )
> values (
>   :username,
>   :airlineName,
>   :hashedPassword,
>   :firstName,
>   :lastName,
>   :dateOfBirth,
>   :email
> );
> ```
>
> Inserts a staff account into the `airline_staff` table with a bcrypt-hashed password and airline assignment.

> ```sql
> insert into airline_staff_phone (username, phone_number)
> values (:username, :phoneNumber);
> ```
>
> Inserts each staff phone number into the `airline_staff_phone` table inside the same registration transaction.

## Staff Dashboard

The staff dashboard is an operations workspace with left navigation, dense tables, filters, and role-aware actions. Normal staff are scoped to their own airline. Superadmins can manage all airlines and reference data.

### Staff Flight Overview

By default, staff see upcoming flights in the next 30 days. They can expand the range with date filters and narrow results by source or destination. This matches the course requirement while still making the dashboard useful as an operations screen.

> ```sql
> select
>   airline_name,
>   airplane_id,
>   flight_number,
>   departure_datetime,
>   arrival_datetime,
>   departure_airport_code,
>   departure_city,
>   arrival_airport_code,
>   arrival_city,
>   base_price,
>   status,
>   ticket_count,
>   available_seats,
>   average_rating,
>   review_count
> from flight_read_model
> where (:airlineScope::text is null or airline_name = :airlineScope)
>   and (
>     (:startDate::text is null and :endDate::text is null and departure_datetime between now() and now() + make_interval(days => 30))
>     or (:startDate::text is not null and departure_datetime >= :startDate::date)
>   )
>   and (:endDate::text is null or departure_datetime < :endDate::date + interval '1 day')
>   and (:sourceQuery::text is null or lower(departure_city) like :sourceQuery or lower(departure_airport_code) like :sourceQuery)
>   and (:destinationQuery::text is null or lower(arrival_city) like :destinationQuery or lower(arrival_airport_code) like :destinationQuery)
> order by departure_datetime asc;
> ```
>
> Lists staff-visible flights from the `flight_read_model` view, scoped by `airlineScope` and filtered by optional date, source, and destination inputs.

### Staff Fleet Overview

> ```sql
> select airline_name, airplane_id, manufacturing_company, manufacturing_date::text as manufacturing_date, number_of_seats
> from airplane
> where (:airlineScope::text is null or airline_name = :airlineScope)
> order by airline_name asc, airplane_id asc;
> ```
>
> Lists airplanes from the `airplane` table that the staff user is allowed to manage.

### Staff Airport Reference Data

> ```sql
> select code, city, country
> from airport
> order by code asc;
> ```
>
> Lists airport reference rows from the `airport` table for staff flight creation and editing controls.

### Staff Review Overview

> ```sql
> select
>   f.airline_name,
>   f.flight_number,
>   f.departure_datetime,
>   review.rating,
>   review.comment
> from flight f
> join review on review.airline_name = f.airline_name
>   and review.flight_number = f.flight_number
>   and review.departure_datetime = f.departure_datetime
> where (:airlineScope::text is null or f.airline_name = :airlineScope)
> order by f.departure_datetime desc, review.review_datetime asc;
> ```
>
> Lists review rows from the `review` table joined to `flight`, scoped by airline, so staff can see average ratings and customer comments by flight.

### Ticket Sales Summary

> ```sql
> select
>   count(*)::int as total_tickets,
>   count(*) filter (where purchase_datetime >= now() - interval '1 month')::int as last_month_tickets,
>   count(*) filter (where purchase_datetime >= now() - interval '1 year')::int as last_year_tickets
> from ticket
> where (:airlineScope::text is null or airline_name = :airlineScope);
> ```
>
> Counts all, last-month, and last-year ticket sales from the `ticket` table for the current staff airline scope.

### Monthly Sales Chart

> ```sql
> select
>   date_trunc('month', purchase_datetime)::text as month_start,
>   count(*)::int as tickets_sold
> from ticket
> where (:airlineScope::text is null or airline_name = :airlineScope)
>   and purchase_datetime >= now() - interval '12 month'
> group by date_trunc('month', purchase_datetime)
> order by date_trunc('month', purchase_datetime) asc;
> ```
>
> Groups ticket sales from the `ticket` table by purchase month for the staff dashboard's monthly sales chart.

## Staff Flight Management

Staff can create flights, update flight fields, mark delays, and delete flights only when safe. The UI uses data tables and inline editing for quick operational changes, while server-side checks enforce airline permissions and relational safety.

### Create Flight

> ```sql
> select name
> from airline
> where name = :targetAirlineName
> limit 1;
> ```
>
> Verifies the target airline exists in the `airline` table before staff can create a flight for it.

> ```sql
> select airplane_id
> from airplane
> where airline_name = :airlineName
>   and airplane_id = :airplaneId
> limit 1;
> ```
>
> Checks the `airplane` table to ensure the selected airplane belongs to the airline receiving the new flight.

> ```sql
> insert into flight (
>   airline_name,
>   flight_number,
>   departure_datetime,
>   departure_airport_code,
>   arrival_airport_code,
>   arrival_datetime,
>   base_price,
>   status,
>   airplane_id
> )
> values (
>   :airlineName,
>   :flightNumber,
>   :departureDatetime::text::timestamp,
>   :departureAirportCode,
>   :arrivalAirportCode,
>   :arrivalDatetime::text::timestamp,
>   :basePrice,
>   'on_time',
>   :airplaneId
> );
> ```
>
> Inserts a new scheduled flight into the `flight` table after validating airline scope, airplane ownership, different airports, and arrival-after-departure timing.

### Find Flight for Mutation

> ```sql
> select
>   airline_name,
>   flight_number,
>   departure_datetime,
>   departure_airport_code,
>   arrival_airport_code,
>   arrival_datetime,
>   base_price,
>   status,
>   airplane_id
> from flight
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime::text::timestamp
> limit 1;
> ```
>
> Finds the exact flight row from the `flight` table before updates or deletes, after staff airline authorization is checked.

### Update Flight Status

> ```sql
> update flight
> set status = :status
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Updates the `status` field in the `flight` table so staff can mark a flight as `on_time` or `delayed`.

### Update Flight Price

> ```sql
> update flight
> set base_price = :basePrice
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Updates the `base_price` field in the `flight` table for the selected flight.

### Update Flight Aircraft

> ```sql
> select
>   airplane.number_of_seats,
>   count(ticket.ticket_id)::int as ticket_count
> from airplane
> left join ticket
>   on ticket.airline_name = :airlineName
>   and ticket.flight_number = :flightNumber
>   and ticket.departure_datetime = :departureDatetime::text::timestamp
> where airplane.airline_name = :airlineName
>   and airplane.airplane_id = :airplaneId
> group by airplane.number_of_seats
> limit 1;
> ```
>
> Checks the `airplane` and `ticket` tables to ensure the replacement aircraft belongs to the airline and has enough seats for tickets already sold.

> ```sql
> update flight
> set airplane_id = :airplaneId
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Updates the `airplane_id` field in the `flight` table after capacity and airline ownership checks pass.

### Update Flight Airports

> ```sql
> select code
> from airport
> where code = :airportCode
> limit 1;
> ```
>
> Checks the `airport` table to ensure a replacement departure or arrival airport exists.

> ```sql
> update flight
> set departure_airport_code = :departureAirportCode
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Updates the departure airport in the `flight` table after confirming it differs from the arrival airport.

> ```sql
> update flight
> set arrival_airport_code = :arrivalAirportCode
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Updates the arrival airport in the `flight` table after confirming it differs from the departure airport.

### Update Flight Times

> ```sql
> update flight
> set departure_datetime = :newDepartureDatetime::text::timestamp
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :oldDepartureDatetime;
> ```
>
> Updates the departure timestamp in the `flight` table after confirming it remains before arrival time.

> ```sql
> update flight
> set arrival_datetime = :arrivalDatetime::text::timestamp
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Updates the arrival timestamp in the `flight` table after confirming it remains after departure time.

### Delete Flight

> ```sql
> select
>   exists (
>     select 1
>     from ticket
>     where ticket.airline_name = :airlineName
>       and ticket.flight_number = :flightNumber
>       and ticket.departure_datetime = :departureDatetime
>   ) as has_tickets,
>   exists (
>     select 1
>     from review
>     where review.airline_name = :airlineName
>       and review.flight_number = :flightNumber
>       and review.departure_datetime = :departureDatetime
>   ) as has_reviews;
> ```
>
> Checks the `ticket` and `review` tables before deleting a flight so flights with dependent purchases or reviews are protected.

> ```sql
> delete from flight
> where airline_name = :airlineName
>   and flight_number = :flightNumber
>   and departure_datetime = :departureDatetime;
> ```
>
> Deletes a flight from the `flight` table only when no tickets or reviews depend on it.

## Staff Fleet Management

Fleet management lets staff add airplanes, edit aircraft metadata, and delete unused aircraft. The page is a staff operations table rather than a simple form, so staff can scan aircraft and manage them in place.

### Add Airplane

> ```sql
> insert into airplane (
>   airline_name,
>   airplane_id,
>   number_of_seats,
>   manufacturing_company,
>   manufacturing_date
> )
> values (
>   :airlineName,
>   :airplaneId,
>   :numberOfSeats,
>   :manufacturingCompany,
>   :manufacturingDate
> );
> ```
>
> Inserts a new airplane into the `airplane` table for the staff user's permitted airline scope.

### Update Airplane Manufacturer

> ```sql
> update airplane
> set manufacturing_company = :manufacturingCompany
> where airline_name = :airlineName
>   and airplane_id = :airplaneId;
> ```
>
> Updates the `manufacturing_company` field in the `airplane` table after staff airline authorization.

### Update Airplane Manufacturing Date

> ```sql
> update airplane
> set manufacturing_date = :manufacturingDate
> where airline_name = :airlineName
>   and airplane_id = :airplaneId;
> ```
>
> Updates the `manufacturing_date` field in the `airplane` table after staff airline authorization.

### Update Airplane Seat Count

> ```sql
> select coalesce(max(ticket_counts.ticket_count), 0)::int as max_tickets
> from airplane
> left join flight
>   on flight.airline_name = airplane.airline_name
>   and flight.airplane_id = airplane.airplane_id
> left join lateral (
>   select count(*)::int as ticket_count
>   from ticket
>   where ticket.airline_name = flight.airline_name
>     and ticket.flight_number = flight.flight_number
>     and ticket.departure_datetime = flight.departure_datetime
> ) as ticket_counts on true
> where airplane.airline_name = :airlineName
>   and airplane.airplane_id = :airplaneId;
> ```
>
> Finds the largest sold-ticket count for flights assigned to an airplane so seat count cannot be reduced below existing commitments.

> ```sql
> update airplane
> set number_of_seats = :numberOfSeats
> where airline_name = :airlineName
>   and airplane_id = :airplaneId;
> ```
>
> Updates the `number_of_seats` field in the `airplane` table after capacity safety checks pass.

### Delete Airplane

> ```sql
> select count(*)::int as flight_count
> from flight
> where airline_name = :airlineName
>   and airplane_id = :airplaneId;
> ```
>
> Counts flights from the `flight` table that still use the airplane before deletion.

> ```sql
> delete from airplane
> where airline_name = :airlineName
>   and airplane_id = :airplaneId;
> ```
>
> Deletes an airplane from the `airplane` table only when no flights are assigned to it.

## Passenger Manifest

The passenger manifest page lets staff choose a flight and see the customers who bought tickets for it. This supports operational tasks such as checking bookings, reviewing passenger identity, and preparing flight manifests.

> ```sql
> select
>   ticket.ticket_id,
>   ticket.customer_email,
>   customer.name as customer_name,
>   customer.passport_number,
>   ticket.purchase_datetime
> from ticket
> join customer on customer.email = ticket.customer_email
> where ticket.airline_name = :airlineName
>   and ticket.flight_number = :flightNumber
>   and ticket.departure_datetime = :departureDatetime::text::timestamp
> order by ticket.purchase_datetime asc;
> ```
>
> Lists passengers from the `ticket` table joined to `customer` for a selected flight that staff are authorized to manage.

## Staff Reports

The reports page supports both fixed summaries and custom date-range reporting. It gives staff a clear operational view of sales activity without exposing unrelated airlines to normal staff accounts.

### Custom Date-Range Report

> ```sql
> select count(*)::int as tickets_sold
> from ticket
> where (:airlineScope::text is null or airline_name = :airlineScope)
>   and purchase_datetime >= :startDate::date
>   and purchase_datetime < :endDate::date + interval '1 day';
> ```
>
> Counts tickets sold from the `ticket` table for a staff-selected inclusive date range and permitted airline scope.

## Staff Profile and Security

Staff profile pages let staff view and edit their own staff information separately from superadmin staff management. This prevents normal staff from accidentally editing fields that only administrators should control.

### View Staff Profile

> ```sql
> select username, airline_name, first_name, last_name, email,
>        date_of_birth::text as date_of_birth
> from airline_staff
> where username = :staffUsername
> limit 1;
> ```
>
> Reads the logged-in staff user's core profile from the `airline_staff` table.

> ```sql
> select phone_number
> from airline_staff_phone
> where username = :staffUsername
> order by phone_number asc;
> ```
>
> Lists the logged-in staff user's phone numbers from the `airline_staff_phone` table.

### Update Staff Profile Field

> ```sql
> update airline_staff
> set :column = :validatedValue
> where username = :staffUsername;
> ```
>
> Updates an editable staff profile field in the `airline_staff` table for the logged-in staff user.

### Replace Own Staff Phone Numbers

> ```sql
> delete from airline_staff_phone
> where username = :staffUsername;
> ```
>
> Clears old phone numbers from the `airline_staff_phone` table before replacing them with the submitted list.

> ```sql
> insert into airline_staff_phone (username, phone_number)
> values (:staffUsername, :phoneNumber);
> ```
>
> Inserts each replacement phone number into the `airline_staff_phone` table.

### Change Staff Password

> ```sql
> select password
> from airline_staff
> where username = :staffUsername;
> ```
>
> Fetches the current bcrypt password hash from the `airline_staff` table before verifying the submitted current password.

> ```sql
> update airline_staff
> set password = :hashedPassword
> where username = :staffUsername;
> ```
>
> Updates the staff password in the `airline_staff` table after bcrypt verification and hashing of the new password.

## Superadmin Airline Management

Superadmin pages are intentionally separated from normal staff operations. A normal staff member manages flights and fleet for their airline; a superadmin can manage system-wide reference records.

### List Airlines

> ```sql
> select name
> from airline
> order by name asc;
> ```
>
> Lists airline records from the `airline` table for the superadmin airline management page.

### Create Airline

> ```sql
> insert into airline (name)
> values (:name);
> ```
>
> Inserts a new airline into the `airline` table.

### Rename Airline

> ```sql
> update airline
> set name = :newName
> where name = :oldName;
> ```
>
> Updates an airline name in the `airline` table.

### Delete Airline

> ```sql
> delete from airline
> where name = :name;
> ```
>
> Deletes an airline from the `airline` table when database constraints allow it.

## Superadmin Airport Management

Airport management controls the reference data used by public search, flight creation, flight editing, and airport comboboxes. The table UI supports quick scanning and inline edits.

### List Airports

> ```sql
> select code, city, country, airport_type
> from airport
> order by code asc;
> ```
>
> Lists airport records from the `airport` table for superadmin management.

### Create Airport

> ```sql
> insert into airport (code, city, country, airport_type)
> values (:code, :city, :country, :airportType);
> ```
>
> Inserts a new airport into the `airport` table with code, city, country, and airport type.

### Update Airport Field

> ```sql
> update airport
> set :column = :value
> where code = :code;
> ```
>
> Updates one editable airport field in the `airport` table after validating the requested field and value.

### Delete Airport

> ```sql
> delete from airport
> where code = :code;
> ```
>
> Deletes an airport from the `airport` table when database constraints allow it.

## Superadmin Staff Management

Superadmin staff management lets an administrator browse staff accounts, edit their assignment or contact details, replace phone numbers, and delete staff accounts. The page groups phone numbers so one staff account remains one visible row even when it has multiple phone records.

### List Staff

> ```sql
> select airline_staff.username,
>        airline_staff.airline_name,
>        airline_staff.first_name,
>        airline_staff.last_name,
>        airline_staff.email,
>        airline_staff_phone.phone_number
> from airline_staff
> left join airline_staff_phone on airline_staff_phone.username = airline_staff.username
> order by airline_staff.username asc, airline_staff_phone.phone_number asc;
> ```
>
> Lists staff accounts from `airline_staff` and related phone numbers from `airline_staff_phone` for superadmin browsing and editing.

### Update Staff Field

> ```sql
> select name
> from airline
> where name = :airlineName
> limit 1;
> ```
>
> Checks the `airline` table before changing a staff member's airline assignment.

> ```sql
> update airline_staff
> set :column = :validatedValue
> where username = :username;
> ```
>
> Updates one staff field in the `airline_staff` table after superadmin validation.

### Replace Staff Phone Numbers

> ```sql
> delete from airline_staff_phone
> where username = :username;
> ```
>
> Clears existing managed staff phone numbers from the `airline_staff_phone` table.

> ```sql
> insert into airline_staff_phone (username, phone_number)
> values (:username, :phoneNumber);
> ```
>
> Inserts each replacement phone number into the `airline_staff_phone` table for the managed staff account.

### Delete Staff

> ```sql
> delete from airline_staff_phone
> where username = :username;
> ```
>
> Deletes a staff member's phone rows from the `airline_staff_phone` table before deleting the staff account.

> ```sql
> delete from airline_staff
> where username = :username;
> ```
>
> Deletes the staff account from the `airline_staff` table.

## Superadmin Customer Management

Superadmin customer management is for oversight and data correction. It lists customer records, allows validated field edits, and prevents deleting customers who already have tickets or reviews.

### List Customers

> ```sql
> select email, name, phone_number, date_of_birth::text as date_of_birth,
>        building_number, street, city, state,
>        passport_number, passport_expiration::text as passport_expiration,
>        passport_country
> from customer
> order by name asc;
> ```
>
> Lists customer records from the `customer` table for superadmin browsing and editing.

### Update Managed Customer Field

> ```sql
> update customer
> set :column = :validatedValue
> where email = :email;
> ```
>
> Updates one validated customer field in the `customer` table from the superadmin customer management page.

### Delete Customer

> ```sql
> select
>   exists (
>     select 1
>     from ticket
>     where ticket.customer_email = :email
>   ) as has_tickets,
>   exists (
>     select 1
>     from review
>     where review.customer_email = :email
>   ) as has_reviews;
> ```
>
> Checks the `ticket` and `review` tables before deleting a customer so purchase and review history is not orphaned.

> ```sql
> delete from customer
> where email = :email;
> ```
>
> Deletes a customer from the `customer` table only when no tickets or reviews depend on the account.

## Shared Read Model

Several pages use `flight_read_model`, a database view that centralizes flight display data, airport city names, seat availability, ticket counts, and review statistics. This keeps search, trips, and staff dashboards consistent.

> ```sql
> create view flight_read_model as
> select
>   flight.airline_name,
>   flight.flight_number,
>   flight.departure_datetime,
>   flight.arrival_datetime,
>   flight.departure_airport_code,
>   departure_airport.city as departure_city,
>   departure_airport.country as departure_country,
>   flight.arrival_airport_code,
>   arrival_airport.city as arrival_city,
>   arrival_airport.country as arrival_country,
>   flight.airplane_id,
>   airplane.number_of_seats,
>   flight.base_price,
>   flight.status,
>   coalesce(ticket_counts.ticket_count, 0)::integer as ticket_count,
>   greatest(airplane.number_of_seats - coalesce(ticket_counts.ticket_count, 0), 0)::integer as available_seats,
>   review_stats.average_rating,
>   coalesce(review_stats.review_count, 0)::integer as review_count
> from flight
> join airport as departure_airport on departure_airport.code = flight.departure_airport_code
> join airport as arrival_airport on arrival_airport.code = flight.arrival_airport_code
> join airplane on airplane.airline_name = flight.airline_name
>   and airplane.airplane_id = flight.airplane_id
> left join (
>   select airline_name, flight_number, departure_datetime, count(*)::integer as ticket_count
>   from ticket
>   group by airline_name, flight_number, departure_datetime
> ) as ticket_counts on ticket_counts.airline_name = flight.airline_name
>   and ticket_counts.flight_number = flight.flight_number
>   and ticket_counts.departure_datetime = flight.departure_datetime
> left join (
>   select
>     airline_name,
>     flight_number,
>     departure_datetime,
>     round(avg(rating)::numeric, 1)::float8 as average_rating,
>     count(*)::integer as review_count
>   from review
>   group by airline_name, flight_number, departure_datetime
> ) as review_stats on review_stats.airline_name = flight.airline_name
>   and review_stats.flight_number = flight.flight_number
>   and review_stats.departure_datetime = flight.departure_datetime;
> ```
>
> Combines `flight`, `airport`, `airplane`, `ticket`, and `review` data into a reusable read model for search, trip history, and staff dashboard pages.
