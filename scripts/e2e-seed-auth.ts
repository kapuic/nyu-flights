import bcrypt from "bcrypt"

import { db } from "../src/lib/db"

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10)

  await db`delete from airline_staff_phone where username = 'auditstaffscript'`
  await db`delete from airline_staff where username = 'auditstaffscript'`
  await db`delete from customer where email = 'audit.customer.script@example.com'`

  await db`
    insert into customer (
      email,
      name,
      password,
      building_number,
      street,
      city,
      state,
      phone_number,
      passport_number,
      passport_expiration,
      passport_country,
      date_of_birth
    )
    values (
      'audit.customer.script@example.com',
      'Audit Customer Script',
      ${hashedPassword},
      '12A',
      'Main Street',
      'New York City',
      'New York',
      '2125557000',
      'AUDSCRIPT123',
      '2031-01-01',
      'United States',
      '1998-01-15'
    )
  `

  await db`
    insert into airline_staff (
      username,
      airline_name,
      password,
      first_name,
      last_name,
      date_of_birth,
      email
    )
    values (
      'auditstaffscript',
      'Jet Blue',
      ${hashedPassword},
      'Audit',
      'Staff',
      '1990-01-01',
      'audit.staff.script@example.com'
    )
  `

  await db`
    insert into airline_staff_phone (username, phone_number)
    values ('auditstaffscript', '2125558000')
  `

  console.log(
    "seeded audit.customer.script@example.com and auditstaffscript with password123"
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
