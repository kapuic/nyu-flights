-- Test Scenario Seed Data
--
-- Source: Test_Scenarios_04_27_2026_v1.pdf
--
-- Schema adaptations according to professional software engineering standards:
--   - ticket.ticket_id is VARCHAR(21) (nanoid) instead of BIGINT.
--   - airport.country is CHAR(2) ISO 3166-1 alpha-2 instead of VARCHAR.
--   - customer.passport_country is CHAR(2) ISO 3166-1 alpha-2 instead of VARCHAR.
--   - airline_staff_phone has ON DELETE CASCADE for staff account management.
--   - ticket FK to flight is DEFERRABLE INITIALLY DEFERRED for transactional inserts.
--   - Passwords are stored as bcrypt hashes for security (and project requirements).
--   - app_session table is included for server-side session auth compared to Part 1/2.

BEGIN;

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

-- Schema

CREATE TABLE airline (
    name VARCHAR(100) PRIMARY KEY
);

CREATE TABLE airport (
    code CHAR(3) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    country CHAR(2) NOT NULL,
    airport_type VARCHAR(20) NOT NULL,
    CHECK (code = UPPER(code)),
    CHECK (airport_type IN ('domestic', 'international', 'both'))
);

CREATE TABLE airplane (
    airline_name VARCHAR(100) NOT NULL,
    airplane_id VARCHAR(10) NOT NULL,
    number_of_seats SMALLINT NOT NULL,
    manufacturing_company VARCHAR(100) NOT NULL,
    manufacturing_date DATE NOT NULL,
    PRIMARY KEY (airline_name, airplane_id),
    FOREIGN KEY (airline_name) REFERENCES airline(name),
    CHECK (number_of_seats > 0)
);

CREATE TABLE flight (
    airline_name VARCHAR(100) NOT NULL,
    flight_number VARCHAR(8) NOT NULL,
    departure_datetime TIMESTAMP NOT NULL,
    departure_airport_code CHAR(3) NOT NULL,
    arrival_airport_code CHAR(3) NOT NULL,
    arrival_datetime TIMESTAMP NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    airplane_id VARCHAR(10) NOT NULL,
    PRIMARY KEY (airline_name, flight_number, departure_datetime),
    FOREIGN KEY (airline_name) REFERENCES airline(name),
    FOREIGN KEY (departure_airport_code) REFERENCES airport(code),
    FOREIGN KEY (arrival_airport_code) REFERENCES airport(code),
    FOREIGN KEY (airline_name, airplane_id) REFERENCES airplane(airline_name, airplane_id),
    CHECK (departure_airport_code <> arrival_airport_code),
    CHECK (arrival_datetime > departure_datetime),
    CHECK (base_price >= 0),
    CHECK (status IN ('on_time', 'delayed'))
);

CREATE TABLE airline_staff (
    username VARCHAR(50) PRIMARY KEY,
    airline_name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    FOREIGN KEY (airline_name) REFERENCES airline(name)
);

CREATE TABLE airline_staff_phone (
    username VARCHAR(50) NOT NULL,
    phone_number VARCHAR(16) NOT NULL,
    PRIMARY KEY (username, phone_number),
    FOREIGN KEY (username) REFERENCES airline_staff(username) ON DELETE CASCADE
);

CREATE TABLE customer (
    email VARCHAR(254) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    building_number VARCHAR(20) NOT NULL,
    street VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    phone_number VARCHAR(16) NOT NULL,
    passport_number VARCHAR(50) NOT NULL UNIQUE,
    passport_expiration DATE NOT NULL,
    passport_country CHAR(2) NOT NULL,
    date_of_birth DATE NOT NULL
);

CREATE TABLE ticket (
    ticket_id VARCHAR(21) PRIMARY KEY,
    customer_email VARCHAR(254) NOT NULL,
    airline_name VARCHAR(100) NOT NULL,
    flight_number VARCHAR(8) NOT NULL,
    departure_datetime TIMESTAMP NOT NULL,
    purchase_datetime TIMESTAMP NOT NULL,
    card_type VARCHAR(6) NOT NULL,
    card_number VARCHAR(19) NOT NULL,
    name_on_card VARCHAR(100) NOT NULL,
    card_expiration DATE NOT NULL,
    FOREIGN KEY (customer_email) REFERENCES customer(email),
    FOREIGN KEY (airline_name, flight_number, departure_datetime)
        REFERENCES flight(airline_name, flight_number, departure_datetime)
        DEFERRABLE INITIALLY DEFERRED,
    CHECK (card_type IN ('credit', 'debit'))
);

CREATE TABLE review (
    customer_email VARCHAR(254) NOT NULL,
    airline_name VARCHAR(100) NOT NULL,
    flight_number VARCHAR(8) NOT NULL,
    departure_datetime TIMESTAMP NOT NULL,
    rating SMALLINT NOT NULL,
    comment TEXT,
    review_datetime TIMESTAMP NOT NULL,
    PRIMARY KEY (customer_email, airline_name, flight_number, departure_datetime),
    FOREIGN KEY (customer_email) REFERENCES customer(email),
    FOREIGN KEY (airline_name, flight_number, departure_datetime)
        REFERENCES flight(airline_name, flight_number, departure_datetime),
    CHECK (rating BETWEEN 1 AND 5)
);

CREATE TABLE app_session (
    id VARCHAR(21) PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    customer_email VARCHAR(254),
    staff_username VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    expires_at TIMESTAMP NOT NULL,
    CHECK (role IN ('customer', 'staff')),
    CHECK (
        (role = 'customer' AND customer_email IS NOT NULL AND staff_username IS NULL)
        OR
        (role = 'staff' AND staff_username IS NOT NULL AND customer_email IS NULL)
    ),
    FOREIGN KEY (customer_email) REFERENCES customer(email) ON DELETE CASCADE,
    FOREIGN KEY (staff_username) REFERENCES airline_staff(username) ON DELETE CASCADE
);

CREATE INDEX app_session_expires_at_idx ON app_session (expires_at);

-- Reusable read models

CREATE VIEW flight_read_model AS
SELECT
    flight.airline_name,
    flight.flight_number,
    flight.departure_datetime,
    flight.arrival_datetime,
    flight.departure_airport_code,
    departure_airport.city AS departure_city,
    departure_airport.country AS departure_country,
    flight.arrival_airport_code,
    arrival_airport.city AS arrival_city,
    arrival_airport.country AS arrival_country,
    flight.airplane_id,
    airplane.number_of_seats,
    flight.base_price,
    flight.status,
    COALESCE(ticket_counts.ticket_count, 0)::INTEGER AS ticket_count,
    GREATEST(airplane.number_of_seats - COALESCE(ticket_counts.ticket_count, 0), 0)::INTEGER AS available_seats,
    review_stats.average_rating,
    COALESCE(review_stats.review_count, 0)::INTEGER AS review_count
FROM flight
JOIN airport AS departure_airport ON departure_airport.code = flight.departure_airport_code
JOIN airport AS arrival_airport ON arrival_airport.code = flight.arrival_airport_code
JOIN airplane ON airplane.airline_name = flight.airline_name
    AND airplane.airplane_id = flight.airplane_id
LEFT JOIN (
    SELECT airline_name, flight_number, departure_datetime, COUNT(*)::INTEGER AS ticket_count
    FROM ticket
    GROUP BY airline_name, flight_number, departure_datetime
) AS ticket_counts ON ticket_counts.airline_name = flight.airline_name
    AND ticket_counts.flight_number = flight.flight_number
    AND ticket_counts.departure_datetime = flight.departure_datetime
LEFT JOIN (
    SELECT
        airline_name,
        flight_number,
        departure_datetime,
        ROUND(AVG(rating)::NUMERIC, 1)::FLOAT8 AS average_rating,
        COUNT(*)::INTEGER AS review_count
    FROM review
    GROUP BY airline_name, flight_number, departure_datetime
) AS review_stats ON review_stats.airline_name = flight.airline_name
    AND review_stats.flight_number = flight.flight_number
    AND review_stats.departure_datetime = flight.departure_datetime;

-- Professor-provided data/scenarios

INSERT INTO airline (name) VALUES ('United');

-- Adaptation: password 'abcd' replaced with bcrypt hash for security (and project requirements).
-- Adaptation: phone '111-2222-3333' replaced with '+17182223333' (valid E.164 and area code).
-- Adaptation: phone '444-5555-6666' replaced with '+19175556666' (valid E.164 and area code).
INSERT INTO airline_staff (username, airline_name, password, first_name, last_name, date_of_birth, email)
VALUES ('admin', 'United', '$2b$10$Z/J2ure7w1wwK1kO4z9Q.OukPWaCmcjUgQEkoDBugEicbuH0OtcLu', 'Roe', 'Jones', '1978-05-25', 'staff@nyu.edu');

INSERT INTO airline_staff_phone (username, phone_number)
VALUES
    ('admin', '+17182223333'),
    ('admin', '+19175556666');

INSERT INTO airplane (airline_name, airplane_id, number_of_seats, manufacturing_company, manufacturing_date)
VALUES
    ('United', '1', 4, 'Boeing', '2012-04-10'),
    ('United', '2', 4, 'Airbus', '2012-04-10'),
    ('United', '3', 50, 'Boeing', '2012-04-10');

-- Adaptation: country 'USA' replaced with 'US' (ISO 3166-1 alpha-2).
-- Adaptation: country 'China' replaced with 'CN' (ISO 3166-1 alpha-2).
INSERT INTO airport (code, city, country, airport_type)
VALUES
    ('JFK', 'NYC', 'US', 'both'),
    ('BOS', 'Boston', 'US', 'both'),
    ('PVG', 'Shanghai', 'CN', 'both'),
    ('BEI', 'Beijing', 'CN', 'both'),
    ('SFO', 'San Francisco', 'US', 'both'),
    ('LAX', 'Los Angeles', 'US', 'both'),
    ('HKA', 'Hong Kong', 'CN', 'both'),
    ('SHN', 'Shenzhen', 'CN', 'both');

-- Adaptation: password '1234' replaced with bcrypt hash for security (and project requirements).
-- Adaptation: phone '123-4321-4321' replaced with '+12124321321' (valid E.164 and area code).
-- Adaptation: phone '123-4322-4322' replaced with '+12124322322' (valid E.164 and area code).
-- Adaptation: phone '123-4324-4324' replaced with '+12124324324' (valid E.164 and area code).
-- Adaptation: passport_country 'USA' replaced with 'US' (ISO 3166-1 alpha-2).
INSERT INTO customer (
    email, password, name, building_number, street, city, state,
    phone_number, passport_number, passport_expiration, passport_country, date_of_birth
)
VALUES
    ('testcustomer@nyu.edu', '$2b$10$mWkpYnfVGyIDtflnb9O.A.OzwyroqNiHk/BGcKjeiOQQC2EGx/bkC', 'Jon Snow',    '1555', 'Jay St',     'Brooklyn', 'New York', '+12124321321', '54321', '2025-12-24', 'US', '1999-12-19'),
    ('user1@nyu.edu',        '$2b$10$mWkpYnfVGyIDtflnb9O.A.OzwyroqNiHk/BGcKjeiOQQC2EGx/bkC', 'Alice Bob',   '5405', 'Jay Street', 'Brooklyn', 'New York', '+12124322322', '54322', '2025-12-25', 'US', '1999-11-19'),
    ('user3@nyu.edu',        '$2b$10$mWkpYnfVGyIDtflnb9O.A.OzwyroqNiHk/BGcKjeiOQQC2EGx/bkC', 'Trudy Jones', '1890', 'Jay Street', 'Brooklyn', 'New York', '+12124324324', '54324', '2025-09-24', 'US', '1999-09-19');

-- Adaptation: flight status 'on-time' replaced with 'on_time'.
-- Adaptation: added flight United 102 at 2024-08-09 (not in professor scenario but required by ticket 5 which references this flight or else the FK constraint fails).
INSERT INTO flight (
    airline_name, flight_number, departure_datetime,
    departure_airport_code, arrival_airport_code, arrival_datetime,
    base_price, status, airplane_id
)
VALUES
    ('United', '102', '2026-01-14 13:25:25', 'SFO', 'LAX', '2026-01-14 16:50:25', 300.00,  'on_time', '3'),
    ('United', '104', '2026-02-14 13:25:25', 'PVG', 'BEI', '2026-02-14 16:50:25', 300.00,  'on_time', '3'),
    ('United', '206', '2026-05-19 13:25:25', 'SFO', 'LAX', '2026-05-19 16:50:25', 350.00,  'on_time', '2'),
    ('United', '207', '2026-06-19 13:25:25', 'LAX', 'SFO', '2026-06-19 16:50:25', 300.00,  'on_time', '2'),
    ('United', '296', '2025-12-28 13:25:25', 'PVG', 'SFO', '2025-12-28 16:50:25', 3000.00, 'on_time', '1'),
    ('United', '715', '2026-01-25 10:25:25', 'PVG', 'BEI', '2026-01-25 13:50:25', 500.00,  'delayed', '1'),
    ('United', '102', '2024-08-09 13:25:25', 'SFO', 'LAX', '2024-08-09 16:50:25', 300.00,  'on_time', '3');

-- Adaptation: ticket_id from BIGINT to VARCHAR(21) (nanoid-compatible but values kept).
-- Adaptation: card_number '1111-2222-3333-4444' replaced with '4111111111111111' (Luhn-valid Visa test number).
-- Adaptation: card_number '1111-2222-3333-5555' replaced with '4242424242424242' (Luhn-valid Visa test number).
-- Adaptation: card_expiration 'MM/YYYY' replaced with DATE 'YYYY-MM-01'.
INSERT INTO ticket (
    ticket_id, customer_email, airline_name, flight_number,
    departure_datetime, purchase_datetime,
    card_type, card_number, name_on_card, card_expiration
)
VALUES
    ('1',  'testcustomer@nyu.edu', 'United', '102', '2026-01-14 13:25:25', '2025-12-15 11:55:55', 'credit', '4111111111111111', 'Test Customer 1', '2027-03-01'),
    ('2',  'user1@nyu.edu',        'United', '102', '2026-01-14 13:25:25', '2025-12-20 11:55:55', 'credit', '4242424242424242', 'User 1',           '2027-03-01'),
    ('3',  'user1@nyu.edu',        'United', '104', '2026-02-14 13:25:25', '2026-01-21 11:55:55', 'credit', '4242424242424242', 'User 1',           '2024-03-01'),
    ('4',  'testcustomer@nyu.edu', 'United', '104', '2026-02-14 13:25:25', '2026-01-28 11:55:55', 'credit', '4111111111111111', 'Test Customer 1',  '2027-03-01'),
    ('5',  'user3@nyu.edu',        'United', '102', '2024-08-09 13:25:25', '2025-07-16 11:55:55', 'credit', '4242424242424242', 'User 3',           '2024-03-01'),
    ('6',  'testcustomer@nyu.edu', 'United', '715', '2026-01-25 10:25:25', '2025-05-20 11:55:55', 'credit', '4111111111111111', 'Test Customer 1',  '2024-03-01'),
    ('7',  'user3@nyu.edu',        'United', '206', '2026-05-19 13:25:25', '2026-03-20 11:55:55', 'credit', '4242424242424242', 'User 3',           '2024-03-01'),
    ('8',  'user1@nyu.edu',        'United', '206', '2026-05-19 13:25:25', '2026-02-21 11:55:55', 'credit', '4242424242424242', 'User 1',           '2024-03-01'),
    ('9',  'user1@nyu.edu',        'United', '207', '2026-06-19 13:25:25', '2026-04-02 11:55:55', 'credit', '4242424242424242', 'User 1',           '2024-03-01'),
    ('10', 'testcustomer@nyu.edu', 'United', '207', '2026-06-19 13:25:25', '2026-03-25 11:55:55', 'credit', '4111111111111111', 'Test Customer 1',  '2024-03-01'),
    ('11', 'user1@nyu.edu',        'United', '296', '2025-12-28 13:25:25', '2025-02-22 11:55:55', 'credit', '4111111111111111', 'Test Customer 1',  '2024-03-01'),
    ('12', 'testcustomer@nyu.edu', 'United', '296', '2025-12-28 13:25:25', '2025-03-20 11:55:55', 'credit', '4111111111111111', 'Test Customer 1',  '2024-03-01');

INSERT INTO review (
    customer_email, airline_name, flight_number, departure_datetime,
    rating, comment, review_datetime
)
VALUES
    ('testcustomer@nyu.edu', 'United', '102', '2026-01-14 13:25:25', 4, 'Very Comfortable',                                       '2026-01-15 11:55:55'),
    ('user1@nyu.edu',        'United', '102', '2026-01-14 13:25:25', 5, 'Relaxing, check-in and onboarding very professional',     '2026-01-15 11:56:55'),
    ('testcustomer@nyu.edu', 'United', '104', '2026-02-14 13:25:25', 1, 'Customer Care services are not good',                     '2026-02-15 11:55:55'),
    ('user1@nyu.edu',        'United', '104', '2026-02-14 13:25:25', 5, 'Comfortable journey and Professional',                    '2026-02-15 11:56:55');

COMMIT;

