import bcrypt from "bcrypt"

import { db, ensureAppSessionTable } from "@/lib/db"
import type { AuthRole, AuthUser } from "@/lib/auth"
import { useAppSession } from "@/lib/session"

export async function createPersistentSession(user: AuthUser) {
  await ensureAppSessionTable()

  const session = await useAppSession()
  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)

  if (session.data.sessionId) {
    await db`delete from app_session where id = ${session.data.sessionId}`
  }

  if (user.role === "customer") {
    await db`
      insert into app_session (id, role, customer_email, expires_at)
      values (${sessionId}, 'customer', ${user.id}, ${expiresAt})
    `
  } else {
    await db`
      insert into app_session (id, role, staff_username, expires_at)
      values (${sessionId}, 'staff', ${user.id}, ${expiresAt})
    `
  }

  await session.update({ sessionId })
}

export async function deletePersistentSession() {
  await ensureAppSessionTable()

  const session = await useAppSession()
  if (session.data.sessionId) {
    await db`delete from app_session where id = ${session.data.sessionId}`
  }

  await session.clear()
}

type CustomerRow = {
  email: string
  name: string
  password: string
}

type StaffRow = {
  airline_name: string
  email: string
  first_name: string
  last_name: string
  password: string
  username: string
}

export async function lookupCustomer(email: string) {
  const [customer] = await db<CustomerRow[]>`
    select email, name, password
    from customer
    where lower(email) = lower(${email})
    limit 1
  `

  return customer ?? null
}

export async function lookupStaff(username: string) {
  const [staff] = await db<StaffRow[]>`
    select username, airline_name, email, first_name, last_name, password
    from airline_staff
    where lower(username) = lower(${username})
    limit 1
  `

  return staff ?? null
}

export async function getCurrentUser() {
  await ensureAppSessionTable()

  const session = await useAppSession()
  const sessionId = session.data.sessionId
  if (!sessionId) return null

  const [sessionRow] = await db<{
    customer_email: string | null
    expires_at: string
    role: AuthRole
    staff_username: string | null
  }[]>`
    select role, customer_email, staff_username, expires_at
    from app_session
    where id = ${sessionId}
      and expires_at > now()
    limit 1
  `

  if (!sessionRow) {
    await session.clear()
    return null
  }

  if (sessionRow.role === "customer" && sessionRow.customer_email) {
    const customer = await lookupCustomer(sessionRow.customer_email)
    if (!customer) {
      await session.clear()
      return null
    }

    return {
      airlineName: null,
      displayName: customer.name,
      email: customer.email,
      id: customer.email,
      role: "customer",
    } satisfies AuthUser
  }

  if (sessionRow.role === "staff" && sessionRow.staff_username) {
    const staff = await lookupStaff(sessionRow.staff_username)
    if (!staff) {
      await session.clear()
      return null
    }

    return {
      airlineName: staff.airline_name,
      displayName: `${staff.first_name} ${staff.last_name}`,
      email: staff.email,
      id: staff.username,
      role: "staff",
    } satisfies AuthUser
  }

  await session.clear()
  return null
}

export async function requireUser(role?: AuthRole) {
  const user = await getCurrentUser()
  if (!user) throw new Error("AUTH_REQUIRED")
  if (role && user.role !== role) throw new Error("AUTH_FORBIDDEN")
  return user
}

export async function loginUser(data: { password: string; role: AuthRole; username: string }) {
  if (data.role === "customer") {
    const customer = await lookupCustomer(data.username)
    if (!customer) return { error: "We could not match that customer login." }

    const passwordMatches = await bcrypt.compare(data.password, customer.password)
    if (!passwordMatches) return { error: "We could not match that customer login." }

    await createPersistentSession({
      airlineName: null,
      displayName: customer.name,
      email: customer.email,
      id: customer.email,
      role: "customer",
    })

    return { redirectTo: "/customer" as const }
  }

  const staff = await lookupStaff(data.username)
  if (!staff) return { error: "We could not match that staff login." }

  const passwordMatches = await bcrypt.compare(data.password, staff.password)
  if (!passwordMatches) return { error: "We could not match that staff login." }

  await createPersistentSession({
    airlineName: staff.airline_name,
    displayName: `${staff.first_name} ${staff.last_name}`,
    email: staff.email,
    id: staff.username,
    role: "staff",
  })

  return { redirectTo: "/staff" as const }
}

export async function registerCustomer(data: {
  buildingNumber: string
  city: string
  dateOfBirth: string
  email: string
  name: string
  passportCountry: string
  passportExpiration: string
  passportNumber: string
  password: string
  phoneNumber: string
  state: string
  street: string
}) {
  const existingCustomer = await lookupCustomer(data.email)
  if (existingCustomer) {
    return { error: "A customer with that email already exists." }
  }

  const hashedPassword = await bcrypt.hash(data.password, 10)

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
      ${data.email},
      ${data.name},
      ${hashedPassword},
      ${data.buildingNumber},
      ${data.street},
      ${data.city},
      ${data.state},
      ${data.phoneNumber},
      ${data.passportNumber},
      ${data.passportExpiration},
      ${data.passportCountry},
      ${data.dateOfBirth}
    )
  `

  await createPersistentSession({
    airlineName: null,
    displayName: data.name,
    email: data.email,
    id: data.email,
    role: "customer",
  })

  return { redirectTo: "/customer" as const }
}

export async function registerStaff(data: {
  airlineName: string
  dateOfBirth: string
  email: string
  firstName: string
  lastName: string
  password: string
  phoneNumbers: string
  username: string
}) {
  const existingStaff = await lookupStaff(data.username)
  if (existingStaff) {
    return { error: "That staff username is already taken." }
  }

  const [airline] = await db<{ name: string }[]>`
    select name from airline where name = ${data.airlineName} limit 1
  `
  if (!airline) return { error: "Choose an airline that already exists in the system." }

  const hashedPassword = await bcrypt.hash(data.password, 10)

  await db.begin(async (transaction) => {
    await transaction`
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
        ${data.username},
        ${data.airlineName},
        ${hashedPassword},
        ${data.firstName},
        ${data.lastName},
        ${data.dateOfBirth},
        ${data.email}
      )
    `

    const phoneNumbers = data.phoneNumbers
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)

    for (const phoneNumber of phoneNumbers) {
      await transaction`
        insert into airline_staff_phone (username, phone_number)
        values (${data.username}, ${phoneNumber})
      `
    }
  })

  await createPersistentSession({
    airlineName: data.airlineName,
    displayName: `${data.firstName} ${data.lastName}`,
    email: data.email,
    id: data.username,
    role: "staff",
  })

  return { redirectTo: "/staff" as const }
}
