import { createServerFn } from "@tanstack/react-start"

import { loginSchema, customerRegistrationSchema, staffRegistrationSchema } from "@/lib/schemas"
import {
  deletePersistentSession,
  getCurrentUser,
  loginUser,
  registerCustomer,
  registerStaff,
} from "@/lib/auth.server"

export type AuthRole = "customer" | "staff"

export type AuthUser = {
  airlineName: string | null
  displayName: string
  email: string
  id: string
  role: AuthRole
}

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(async () => {
  return getCurrentUser()
})

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }) => loginUser(data))

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  await deletePersistentSession()
  return { redirectTo: "/" as const }
})

export const registerCustomerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => customerRegistrationSchema.parse(data))
  .handler(async ({ data }) => registerCustomer(data))

export const registerStaffFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => staffRegistrationSchema.parse(data))
  .handler(async ({ data }) => registerStaff(data))
