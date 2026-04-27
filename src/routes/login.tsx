import { createFileRoute, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import { LoginForm } from "@/components/login-form"
import { pickRandomAuthImage } from "@/lib/auth-images"

export const Route = createFileRoute("/login")({
  loader: () => ({
    heroImageUrl: pickRandomAuthImage(),
  }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { heroImageUrl } = Route.useLoaderData()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#f7f9fb] p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm
          heroImageUrl={heroImageUrl}
          onSuccess={() => {
            toast.success("Booking unlocked.")
            void router.navigate({ to: "/customer" })
          }}
        />
      </div>
    </div>
  )
}
