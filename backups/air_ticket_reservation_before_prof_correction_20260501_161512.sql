--
-- PostgreSQL database dump
--

\restrict gcSrzYttvRMSh3cf9riNLhJcLm367BkVkK4TQ84NX0aLCVSTCbP0gUyvnXThqAH

-- Dumped from database version 18.3 (Debian 18.3-1.pgdg13+1)
-- Dumped by pg_dump version 18.3 (Debian 18.3-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.ticket DROP CONSTRAINT IF EXISTS ticket_customer_email_fkey;
ALTER TABLE IF EXISTS ONLY public.ticket DROP CONSTRAINT IF EXISTS ticket_airline_name_flight_number_departure_datetime_fkey;
ALTER TABLE IF EXISTS ONLY public.review DROP CONSTRAINT IF EXISTS review_customer_email_fkey;
ALTER TABLE IF EXISTS ONLY public.review DROP CONSTRAINT IF EXISTS review_airline_name_flight_number_departure_datetime_fkey;
ALTER TABLE IF EXISTS ONLY public.flight DROP CONSTRAINT IF EXISTS flight_departure_airport_code_fkey;
ALTER TABLE IF EXISTS ONLY public.flight DROP CONSTRAINT IF EXISTS flight_arrival_airport_code_fkey;
ALTER TABLE IF EXISTS ONLY public.flight DROP CONSTRAINT IF EXISTS flight_airline_name_fkey;
ALTER TABLE IF EXISTS ONLY public.flight DROP CONSTRAINT IF EXISTS flight_airline_name_airplane_id_fkey;
ALTER TABLE IF EXISTS ONLY public.app_session DROP CONSTRAINT IF EXISTS app_session_staff_username_fkey;
ALTER TABLE IF EXISTS ONLY public.app_session DROP CONSTRAINT IF EXISTS app_session_customer_email_fkey;
ALTER TABLE IF EXISTS ONLY public.airplane DROP CONSTRAINT IF EXISTS airplane_airline_name_fkey;
ALTER TABLE IF EXISTS ONLY public.airline_staff_phone DROP CONSTRAINT IF EXISTS airline_staff_phone_username_fkey;
ALTER TABLE IF EXISTS ONLY public.airline_staff DROP CONSTRAINT IF EXISTS airline_staff_airline_name_fkey;
DROP INDEX IF EXISTS public.app_session_expires_at_idx;
ALTER TABLE IF EXISTS ONLY public.ticket DROP CONSTRAINT IF EXISTS ticket_pkey;
ALTER TABLE IF EXISTS ONLY public.review DROP CONSTRAINT IF EXISTS review_pkey;
ALTER TABLE IF EXISTS ONLY public.flight DROP CONSTRAINT IF EXISTS flight_pkey;
ALTER TABLE IF EXISTS ONLY public.customer DROP CONSTRAINT IF EXISTS customer_pkey;
ALTER TABLE IF EXISTS ONLY public.customer DROP CONSTRAINT IF EXISTS customer_passport_number_key;
ALTER TABLE IF EXISTS ONLY public.app_session DROP CONSTRAINT IF EXISTS app_session_pkey;
ALTER TABLE IF EXISTS ONLY public.airport DROP CONSTRAINT IF EXISTS airport_pkey;
ALTER TABLE IF EXISTS ONLY public.airplane DROP CONSTRAINT IF EXISTS airplane_pkey;
ALTER TABLE IF EXISTS ONLY public.airline_staff DROP CONSTRAINT IF EXISTS airline_staff_pkey;
ALTER TABLE IF EXISTS ONLY public.airline_staff_phone DROP CONSTRAINT IF EXISTS airline_staff_phone_pkey;
ALTER TABLE IF EXISTS ONLY public.airline_staff DROP CONSTRAINT IF EXISTS airline_staff_email_key;
ALTER TABLE IF EXISTS ONLY public.airline DROP CONSTRAINT IF EXISTS airline_pkey;
DROP VIEW IF EXISTS public.flight_read_model;
DROP TABLE IF EXISTS public.ticket;
DROP TABLE IF EXISTS public.review;
DROP TABLE IF EXISTS public.flight;
DROP TABLE IF EXISTS public.customer;
DROP TABLE IF EXISTS public.app_session;
DROP TABLE IF EXISTS public.airport;
DROP TABLE IF EXISTS public.airplane;
DROP TABLE IF EXISTS public.airline_staff_phone;
DROP TABLE IF EXISTS public.airline_staff;
DROP TABLE IF EXISTS public.airline;
-- *not* dropping schema, since initdb creates it
--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: airline; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.airline (
    name character varying(100) NOT NULL
);


ALTER TABLE public.airline OWNER TO postgres;

--
-- Name: airline_staff; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.airline_staff (
    username character varying(50) NOT NULL,
    airline_name character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    date_of_birth date NOT NULL,
    email character varying(254) NOT NULL
);


ALTER TABLE public.airline_staff OWNER TO postgres;

--
-- Name: airline_staff_phone; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.airline_staff_phone (
    username character varying(50) NOT NULL,
    phone_number character varying(16) NOT NULL
);


ALTER TABLE public.airline_staff_phone OWNER TO postgres;

--
-- Name: airplane; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.airplane (
    airline_name character varying(100) NOT NULL,
    airplane_id character varying(10) NOT NULL,
    number_of_seats smallint NOT NULL,
    manufacturing_company character varying(100) NOT NULL,
    manufacturing_date date NOT NULL,
    CONSTRAINT airplane_number_of_seats_check CHECK ((number_of_seats > 0))
);


ALTER TABLE public.airplane OWNER TO postgres;

--
-- Name: airport; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.airport (
    code character(3) NOT NULL,
    city character varying(100) NOT NULL,
    country character(2) NOT NULL,
    airport_type character varying(20) NOT NULL,
    CONSTRAINT airport_airport_type_check CHECK (((airport_type)::text = ANY ((ARRAY['domestic'::character varying, 'international'::character varying, 'both'::character varying])::text[]))),
    CONSTRAINT airport_code_check CHECK (((code)::text = upper((code)::text)))
);


ALTER TABLE public.airport OWNER TO postgres;

--
-- Name: app_session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_session (
    id character varying(21) NOT NULL,
    role character varying(20) NOT NULL,
    customer_email character varying(254),
    staff_username character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    CONSTRAINT app_session_check CHECK (((((role)::text = 'customer'::text) AND (customer_email IS NOT NULL) AND (staff_username IS NULL)) OR (((role)::text = 'staff'::text) AND (staff_username IS NOT NULL) AND (customer_email IS NULL)))),
    CONSTRAINT app_session_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'staff'::character varying])::text[])))
);


ALTER TABLE public.app_session OWNER TO postgres;

--
-- Name: customer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer (
    email character varying(254) NOT NULL,
    name character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    building_number character varying(20) NOT NULL,
    street character varying(150) NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    phone_number character varying(16) NOT NULL,
    passport_number character varying(50) NOT NULL,
    passport_expiration date NOT NULL,
    passport_country character(2) NOT NULL,
    date_of_birth date NOT NULL
);


ALTER TABLE public.customer OWNER TO postgres;

--
-- Name: flight; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flight (
    airline_name character varying(100) NOT NULL,
    flight_number character varying(8) NOT NULL,
    departure_datetime timestamp without time zone NOT NULL,
    departure_airport_code character(3) NOT NULL,
    arrival_airport_code character(3) NOT NULL,
    arrival_datetime timestamp without time zone NOT NULL,
    base_price numeric(10,2) NOT NULL,
    status character varying(20) NOT NULL,
    airplane_id character varying(10) NOT NULL,
    CONSTRAINT flight_base_price_check CHECK ((base_price >= (0)::numeric)),
    CONSTRAINT flight_check CHECK ((departure_airport_code <> arrival_airport_code)),
    CONSTRAINT flight_check1 CHECK ((arrival_datetime > departure_datetime)),
    CONSTRAINT flight_status_check CHECK (((status)::text = ANY ((ARRAY['on_time'::character varying, 'delayed'::character varying])::text[])))
);


ALTER TABLE public.flight OWNER TO postgres;

--
-- Name: review; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review (
    customer_email character varying(254) NOT NULL,
    airline_name character varying(100) NOT NULL,
    flight_number character varying(8) NOT NULL,
    departure_datetime timestamp without time zone NOT NULL,
    rating smallint NOT NULL,
    comment text,
    review_datetime timestamp without time zone NOT NULL,
    CONSTRAINT review_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.review OWNER TO postgres;

--
-- Name: ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.ticket (
    ticket_id character varying(21) NOT NULL,
    customer_email character varying(254) NOT NULL,
    airline_name character varying(100) NOT NULL,
    flight_number character varying(8) NOT NULL,
    departure_datetime timestamp without time zone NOT NULL,
    purchase_datetime timestamp without time zone NOT NULL,
    card_type character varying(6) NOT NULL,
    card_number character varying(19) NOT NULL,
    name_on_card character varying(100) NOT NULL,
    card_expiration date NOT NULL,
    CONSTRAINT ticket_card_type_check CHECK (((card_type)::text = ANY ((ARRAY['credit'::character varying, 'debit'::character varying])::text[])))
);


ALTER TABLE public.ticket OWNER TO postgres;

--
-- Name: flight_read_model; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.flight_read_model AS
 SELECT flight.airline_name,
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
    COALESCE(ticket_counts.ticket_count, 0) AS ticket_count,
    GREATEST((airplane.number_of_seats - COALESCE(ticket_counts.ticket_count, 0)), 0) AS available_seats,
    review_stats.average_rating,
    COALESCE(review_stats.review_count, 0) AS review_count
   FROM (((((public.flight
     JOIN public.airport departure_airport ON ((departure_airport.code = flight.departure_airport_code)))
     JOIN public.airport arrival_airport ON ((arrival_airport.code = flight.arrival_airport_code)))
     JOIN public.airplane ON ((((airplane.airline_name)::text = (flight.airline_name)::text) AND ((airplane.airplane_id)::text = (flight.airplane_id)::text))))
     LEFT JOIN ( SELECT ticket.airline_name,
            ticket.flight_number,
            ticket.departure_datetime,
            (count(*))::integer AS ticket_count
           FROM public.ticket
          GROUP BY ticket.airline_name, ticket.flight_number, ticket.departure_datetime) ticket_counts ON ((((ticket_counts.airline_name)::text = (flight.airline_name)::text) AND ((ticket_counts.flight_number)::text = (flight.flight_number)::text) AND (ticket_counts.departure_datetime = flight.departure_datetime))))
     LEFT JOIN ( SELECT review.airline_name,
            review.flight_number,
            review.departure_datetime,
            (round(avg(review.rating), 1))::double precision AS average_rating,
            (count(*))::integer AS review_count
           FROM public.review
          GROUP BY review.airline_name, review.flight_number, review.departure_datetime) review_stats ON ((((review_stats.airline_name)::text = (flight.airline_name)::text) AND ((review_stats.flight_number)::text = (flight.flight_number)::text) AND (review_stats.departure_datetime = flight.departure_datetime))));


ALTER VIEW public.flight_read_model OWNER TO postgres;

--
-- Data for Name: airline; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.airline (name) FROM stdin;
United
\.


--
-- Data for Name: airline_staff; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.airline_staff (username, airline_name, password, first_name, last_name, date_of_birth, email) FROM stdin;
admin	United	$2b$10$Z/J2ure7w1wwK1kO4z9Q.OukPWaCmcjUgQEkoDBugEicbuH0OtcLu	Roe	Jones	1978-05-25	staff@nyu.edu
e2estaff04292354	United	$2b$10$YbFk6C453DLv0Hl0uev/jO8MbGnWC0S2ojCd7lf8cUkXxw40FwMs.	E2E	Staff	1990-01-01	e2estaff04292354@example.com
e2evalphones2	United	$2b$10$RFFCJq/7Do6MAgslXdspaebxeQ0ceu3BrM9X0j.b/KP2KFmtygiR6	Valid	Phones	1990-01-01	e2evalphones2@example.com
testadmim	United	$2b$10$uoo3hGQWzBXTbKsbTCwdaO8Yz41Vi2RNNtpQUBPW5fmZWTAKKs9wy	t	t	2026-01-01	test@a.com
\.


--
-- Data for Name: airline_staff_phone; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.airline_staff_phone (username, phone_number) FROM stdin;
admin	+17182223333
admin	+19175556666
e2estaff04292354	+13321111111
e2estaff04292354	+19891111111
e2evalphones2	+13325551234
e2evalphones2	+19895551234
testadmim	+13323331000
testadmim	+19899999999
\.


--
-- Data for Name: airplane; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.airplane (airline_name, airplane_id, number_of_seats, manufacturing_company, manufacturing_date) FROM stdin;
United	1	4	Boeing	2012-04-10
United	2	4	Airbus	2012-04-10
United	3	50	Boeing	2012-04-10
United	E2EPLN1	9	TestAir	2020-01-01
United	test	10	test	2026-05-01
\.


--
-- Data for Name: airport; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.airport (code, city, country, airport_type) FROM stdin;
JFK	NYC	US	both
BOS	Boston	US	both
PVG	Shanghai	CN	both
BEI	Beijing	CN	both
SFO	San Francisco	US	both
LAX	Los Angeles	US	both
HKA	Hong Kong	CN	both
SHN	Shenzhen	CN	both
CAT	Cat City	US	both
\.


--
-- Data for Name: app_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_session (id, role, customer_email, staff_username, created_at, expires_at) FROM stdin;
WvBwtu2Kz4QK1gCxyN2xy	staff	\N	e2evalphones2	2026-05-01 01:05:22.403612	2026-05-08 01:05:22.402
KWi14y52AuG5ovceK8E2C	customer	catflag@example.com	\N	2026-05-01 02:06:34.109442	2026-05-08 02:06:34.108
vBv6AI243M5P3TtCw9gjn	staff	\N	testadmim	2026-05-01 20:08:38.884433	2026-05-08 20:08:38.883
\.


--
-- Data for Name: customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.customer (email, name, password, building_number, street, city, state, phone_number, passport_number, passport_expiration, passport_country, date_of_birth) FROM stdin;
testcustomer@nyu.edu	Jon Snow	$2b$10$mWkpYnfVGyIDtflnb9O.A.OzwyroqNiHk/BGcKjeiOQQC2EGx/bkC	1555	Jay St	Brooklyn	New York	+12124321321	54321	2025-12-24	US	1999-12-19
user1@nyu.edu	Alice Bob	$2b$10$mWkpYnfVGyIDtflnb9O.A.OzwyroqNiHk/BGcKjeiOQQC2EGx/bkC	5405	Jay Street	Brooklyn	New York	+12124322322	54322	2025-12-25	US	1999-11-19
user3@nyu.edu	Trudy Jones	$2b$10$mWkpYnfVGyIDtflnb9O.A.OzwyroqNiHk/BGcKjeiOQQC2EGx/bkC	1890	Jay Street	Brooklyn	New York	+12124324324	54324	2025-09-24	US	1999-09-19
catflag@example.com	Cat Flag User	$2b$10$UWlS10tRfamQ4Ge/v.otpeob85u1BmybLgLGOd/J5TOfcOcyOxsjm	1	Cat St	Cat City	NY	+13325550001	CATPASS1	2030-01-01	US	1990-01-01
test@tester.com	Test	$2b$10$.rkXoBu4k0n06UW5.YCm4OeIp66i/inQ/9xSt0Pa1dBod8P1uXsnG	684	4959 Dicki Viaduct	Murphychester	Utah	+12025556619	PGL7S5B4L	2029-05-31	RE	1967-07-26
\.


--
-- Data for Name: flight; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flight (airline_name, flight_number, departure_datetime, departure_airport_code, arrival_airport_code, arrival_datetime, base_price, status, airplane_id) FROM stdin;
United	102	2026-01-14 13:25:25	SFO	LAX	2026-01-14 16:50:25	300.00	on_time	3
United	104	2026-02-14 13:25:25	PVG	BEI	2026-02-14 16:50:25	300.00	on_time	3
United	206	2026-05-19 13:25:25	SFO	LAX	2026-05-19 16:50:25	350.00	on_time	2
United	207	2026-06-19 13:25:25	LAX	SFO	2026-06-19 16:50:25	300.00	on_time	2
United	296	2025-12-28 13:25:25	PVG	SFO	2025-12-28 16:50:25	3000.00	on_time	1
United	715	2026-01-25 10:25:25	PVG	BEI	2026-01-25 13:50:25	500.00	delayed	1
United	102	2024-08-09 13:25:25	SFO	LAX	2024-08-09 16:50:25	300.00	on_time	3
United	CAT901	2026-05-22 09:00:00	CAT	LAX	2026-05-22 12:00:00	321.09	on_time	E2EPLN1
United	test	2026-05-13 09:00:00	BOS	HKA	2026-05-23 09:00:00	20.00	on_time	test
United	E2E901	2026-05-20 09:00:00	SFO	LAX	2026-05-21 09:00:00	500.00	on_time	E2EPLN1
\.


--
-- Data for Name: review; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.review (customer_email, airline_name, flight_number, departure_datetime, rating, comment, review_datetime) FROM stdin;
testcustomer@nyu.edu	United	102	2026-01-14 13:25:25	4	Very Comfortable	2026-01-15 11:55:55
user1@nyu.edu	United	102	2026-01-14 13:25:25	5	Relaxing, check-in and onboarding very professional	2026-01-15 11:56:55
testcustomer@nyu.edu	United	104	2026-02-14 13:25:25	1	Customer Care services are not good	2026-02-15 11:55:55
user1@nyu.edu	United	104	2026-02-14 13:25:25	5	Comfortable journey and Professional	2026-02-15 11:56:55
\.


--
-- Data for Name: ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.ticket (ticket_id, customer_email, airline_name, flight_number, departure_datetime, purchase_datetime, card_type, card_number, name_on_card, card_expiration) FROM stdin;
1	testcustomer@nyu.edu	United	102	2026-01-14 13:25:25	2025-12-15 11:55:55	credit	4111111111111111	Test Customer 1	2027-03-01
2	user1@nyu.edu	United	102	2026-01-14 13:25:25	2025-12-20 11:55:55	credit	4242424242424242	User 1	2027-03-01
3	user1@nyu.edu	United	104	2026-02-14 13:25:25	2026-01-21 11:55:55	credit	4242424242424242	User 1	2024-03-01
4	testcustomer@nyu.edu	United	104	2026-02-14 13:25:25	2026-01-28 11:55:55	credit	4111111111111111	Test Customer 1	2027-03-01
5	user3@nyu.edu	United	102	2024-08-09 13:25:25	2025-07-16 11:55:55	credit	4242424242424242	User 3	2024-03-01
6	testcustomer@nyu.edu	United	715	2026-01-25 10:25:25	2025-05-20 11:55:55	credit	4111111111111111	Test Customer 1	2024-03-01
7	user3@nyu.edu	United	206	2026-05-19 13:25:25	2026-03-20 11:55:55	credit	4242424242424242	User 3	2024-03-01
8	user1@nyu.edu	United	206	2026-05-19 13:25:25	2026-02-21 11:55:55	credit	4242424242424242	User 1	2024-03-01
9	user1@nyu.edu	United	207	2026-06-19 13:25:25	2026-04-02 11:55:55	credit	4242424242424242	User 1	2024-03-01
10	testcustomer@nyu.edu	United	207	2026-06-19 13:25:25	2026-03-25 11:55:55	credit	4111111111111111	Test Customer 1	2024-03-01
11	user1@nyu.edu	United	296	2025-12-28 13:25:25	2025-02-22 11:55:55	credit	4111111111111111	Test Customer 1	2024-03-01
12	testcustomer@nyu.edu	United	296	2025-12-28 13:25:25	2025-03-20 11:55:55	credit	4111111111111111	Test Customer 1	2024-03-01
CAT-TICKET-1	testcustomer@nyu.edu	United	CAT901	2026-05-22 09:00:00	2026-05-01 02:02:50.904111	credit	4111111111111111	Jon Snow	2028-01-01
CAT-TICKET-2	catflag@example.com	United	CAT901	2026-05-22 09:00:00	2026-05-01 02:05:53.197901	credit	4111111111111111	Cat Flag User	2028-01-01
-Bw_qMCl1Y3xiJCQNfmrc	test@tester.com	United	E2E901	2026-05-20 09:00:00	2026-05-01 19:39:58.407306	credit	6011360268095421	Tricia Stiedemann	2030-05-01
\.


--
-- Name: airline airline_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airline
    ADD CONSTRAINT airline_pkey PRIMARY KEY (name);


--
-- Name: airline_staff airline_staff_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airline_staff
    ADD CONSTRAINT airline_staff_email_key UNIQUE (email);


--
-- Name: airline_staff_phone airline_staff_phone_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airline_staff_phone
    ADD CONSTRAINT airline_staff_phone_pkey PRIMARY KEY (username, phone_number);


--
-- Name: airline_staff airline_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airline_staff
    ADD CONSTRAINT airline_staff_pkey PRIMARY KEY (username);


--
-- Name: airplane airplane_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airplane
    ADD CONSTRAINT airplane_pkey PRIMARY KEY (airline_name, airplane_id);


--
-- Name: airport airport_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airport
    ADD CONSTRAINT airport_pkey PRIMARY KEY (code);


--
-- Name: app_session app_session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_session
    ADD CONSTRAINT app_session_pkey PRIMARY KEY (id);


--
-- Name: customer customer_passport_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_passport_number_key UNIQUE (passport_number);


--
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (email);


--
-- Name: flight flight_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flight
    ADD CONSTRAINT flight_pkey PRIMARY KEY (airline_name, flight_number, departure_datetime);


--
-- Name: review review_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_pkey PRIMARY KEY (customer_email, airline_name, flight_number, departure_datetime);


--
-- Name: ticket ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_pkey PRIMARY KEY (ticket_id);


--
-- Name: app_session_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX app_session_expires_at_idx ON public.app_session USING btree (expires_at);


--
-- Name: airline_staff airline_staff_airline_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airline_staff
    ADD CONSTRAINT airline_staff_airline_name_fkey FOREIGN KEY (airline_name) REFERENCES public.airline(name);


--
-- Name: airline_staff_phone airline_staff_phone_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airline_staff_phone
    ADD CONSTRAINT airline_staff_phone_username_fkey FOREIGN KEY (username) REFERENCES public.airline_staff(username) ON DELETE CASCADE;


--
-- Name: airplane airplane_airline_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.airplane
    ADD CONSTRAINT airplane_airline_name_fkey FOREIGN KEY (airline_name) REFERENCES public.airline(name);


--
-- Name: app_session app_session_customer_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_session
    ADD CONSTRAINT app_session_customer_email_fkey FOREIGN KEY (customer_email) REFERENCES public.customer(email) ON DELETE CASCADE;


--
-- Name: app_session app_session_staff_username_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_session
    ADD CONSTRAINT app_session_staff_username_fkey FOREIGN KEY (staff_username) REFERENCES public.airline_staff(username) ON DELETE CASCADE;


--
-- Name: flight flight_airline_name_airplane_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flight
    ADD CONSTRAINT flight_airline_name_airplane_id_fkey FOREIGN KEY (airline_name, airplane_id) REFERENCES public.airplane(airline_name, airplane_id);


--
-- Name: flight flight_airline_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flight
    ADD CONSTRAINT flight_airline_name_fkey FOREIGN KEY (airline_name) REFERENCES public.airline(name);


--
-- Name: flight flight_arrival_airport_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flight
    ADD CONSTRAINT flight_arrival_airport_code_fkey FOREIGN KEY (arrival_airport_code) REFERENCES public.airport(code);


--
-- Name: flight flight_departure_airport_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flight
    ADD CONSTRAINT flight_departure_airport_code_fkey FOREIGN KEY (departure_airport_code) REFERENCES public.airport(code);


--
-- Name: review review_airline_name_flight_number_departure_datetime_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_airline_name_flight_number_departure_datetime_fkey FOREIGN KEY (airline_name, flight_number, departure_datetime) REFERENCES public.flight(airline_name, flight_number, departure_datetime);


--
-- Name: review review_customer_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review
    ADD CONSTRAINT review_customer_email_fkey FOREIGN KEY (customer_email) REFERENCES public.customer(email);


--
-- Name: ticket ticket_airline_name_flight_number_departure_datetime_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_airline_name_flight_number_departure_datetime_fkey FOREIGN KEY (airline_name, flight_number, departure_datetime) REFERENCES public.flight(airline_name, flight_number, departure_datetime) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: ticket ticket_customer_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_customer_email_fkey FOREIGN KEY (customer_email) REFERENCES public.customer(email);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict gcSrzYttvRMSh3cf9riNLhJcLm367BkVkK4TQ84NX0aLCVSTCbP0gUyvnXThqAH

