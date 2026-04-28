import bcrypt from "bcrypt"
import { nanoid } from "nanoid"

import type { AuthRole, AuthUser } from "@/lib/auth"
import { NANOID_LENGTH, db, ensureAppSessionTable } from "@/lib/db"
import { getStaffPermission } from "@/lib/staff-permissions"
import { useAppSession } from "@/lib/session"

function getSessionIdentityFields(user: AuthUser) {
  if (user.role === "customer") {
    return {
      customerEmail: user.id,
      staffUsername: null,
    }
  }

  return {
    customerEmail: null,
    staffUsername: user.id,
  }
}

export async function createPersistentSession(user: AuthUser) {
  await ensureAppSessionTable()

  const session = await useAppSession()
  const sessionId = nanoid(NANOID_LENGTH)
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)

  if (session.data.sessionId) {
    await db`delete from app_session where id = ${session.data.sessionId}`
  }

  const sessionIdentity = getSessionIdentityFields(user)

  await db`
    insert into app_session (id, role, customer_email, staff_username, expires_at)
    values (${sessionId}, ${user.role}, ${sessionIdentity.customerEmail}, ${sessionIdentity.staffUsername}, ${expiresAt})
  `

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

async function lookupSingleRecord<TRecord>(query: Promise<Array<TRecord>>) {
  const [record] = await query
  return record ?? null
}

function createCustomerAuthUser(customer: {
  email: string
  name: string
}): AuthUser {
  return {
    airlineName: null,
    displayName: customer.name,
    email: customer.email,
    id: customer.email,
    role: "customer",
    staffPermission: null,
  }
}

function createStaffAuthUser(staff: {
  airline_name: string
  email: string
  first_name: string
  last_name: string
  username: string
}): AuthUser {
  return {
    airlineName: staff.airline_name,
    displayName: `${staff.first_name} ${staff.last_name}`,
    email: staff.email,
    id: staff.username,
    role: "staff",
    staffPermission: getStaffPermission(staff.username),
  }
}

export async function lookupCustomer(email: string) {
  return lookupSingleRecord(db<Array<CustomerRow>>`
    select email, name, password
    from customer
    where lower(email) = lower(${email})
    limit 1
  `)
}

export async function lookupStaff(username: string) {
  return lookupSingleRecord(db<Array<StaffRow>>`
    select username, airline_name, email, first_name, last_name, password
    from airline_staff
    where lower(username) = lower(${username})
    limit 1
  `)
}

export async function getCurrentUser() {
  await ensureAppSessionTable()

  const session = await useAppSession()
  const sessionId = session.data.sessionId
  if (!sessionId) return null

  const sessionRows = await db<
    Array<{
      customer_email: string | null
      expires_at: string
      role: AuthRole
      staff_username: string | null
    }>
  >`
    select role, customer_email, staff_username, expires_at
    from app_session
    where id = ${sessionId}
      and expires_at > now()
    limit 1
  `
  if (!sessionRows.length) {
    await session.clear()
    return null
  }

  const sessionRow = sessionRows[0]

  if (sessionRow.role === "customer" && sessionRow.customer_email) {
    const customer = await lookupCustomer(sessionRow.customer_email)
    if (!customer) {
      await session.clear()
      return null
    }

    return createCustomerAuthUser(customer)
  }

  if (sessionRow.role === "staff" && sessionRow.staff_username) {
    const staff = await lookupStaff(sessionRow.staff_username)
    if (!staff) {
      await session.clear()
      return null
    }

    return createStaffAuthUser(staff)
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

async function authenticateUser<TRecord>(options: {
  createAuthUser: (record: TRecord) => AuthUser
  errorMessage: string
  lookup: () => Promise<TRecord | null>
  password: string
  redirectTo: "/trips" | "/staff"
  selectPassword: (record: TRecord) => string
}) {
  const record = await options.lookup()
  if (!record) return { error: options.errorMessage }

  const passwordMatches = await bcrypt.compare(
    options.password,
    options.selectPassword(record)
  )
  if (!passwordMatches) return { error: options.errorMessage }

  await createPersistentSession(options.createAuthUser(record))
  return { redirectTo: options.redirectTo }
}

export async function loginUser(data: {
  password: string
  role: AuthRole
  username: string
}) {
  if (data.role === "customer") {
    return authenticateUser({
      createAuthUser: createCustomerAuthUser,
      errorMessage: "We could not match that customer login.",
      lookup: () => lookupCustomer(data.username),
      password: data.password,
      redirectTo: "/trips",
      selectPassword: (customer) => customer.password,
    })
  }

  return authenticateUser({
    createAuthUser: createStaffAuthUser,
    errorMessage: "We could not match that staff login.",
    lookup: () => lookupStaff(data.username),
    password: data.password,
    redirectTo: "/staff",
    selectPassword: (staff) => staff.password,
  })
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
  if (existingCustomer !== null) {
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

  await createPersistentSession(
    createCustomerAuthUser({ email: data.email, name: data.name })
  )

  return { redirectTo: "/trips" as const }
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
  if (existingStaff !== null) {
    return { error: "That staff username is already taken." }
  }

  const airlines = await db<Array<{ name: string }>>`
    select name from airline where name = ${data.airlineName} limit 1
  `
  if (!airlines.length)
    return { error: "Choose an airline that already exists in the system." }

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

  await createPersistentSession(
    createStaffAuthUser({
      airline_name: data.airlineName,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      username: data.username,
    })
  )

  return { redirectTo: "/staff" as const }
}
