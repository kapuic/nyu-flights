import postgres from "postgres"

import { env } from "@/lib/env"

export const NANOID_LENGTH = 21

export const db = postgres(env.databaseUrl, {
  idle_timeout: 20,
  max: 10,
  prepare: false,
})

let ensureSessionTablePromise: Promise<void> | null = null

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


