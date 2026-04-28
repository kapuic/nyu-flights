import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import { getCurrentUserFn } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { pickRandomAuthImage } from "@/lib/auth-images"

export const Route = createFileRoute("/login")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (currentUser) throw redirect({ to: currentUser.role === "staff" ? "/staff" : "/trips" })
    return { heroImageUrl: pickRandomAuthImage() }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { heroImageUrl } = Route.useLoaderData()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm
          heroImageUrl={heroImageUrl}
          onSuccess={() => {
            toast.success("Booking unlocked.")
            void router.navigate({ to: "/trips" })
          }}
        />
      </div>
    </div>
  )
}
