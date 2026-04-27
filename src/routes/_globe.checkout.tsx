import { type FormEvent, useEffect, useId, useRef, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useForm } from "@tanstack/react-form"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Plane,
} from "lucide-react"
import { IMaskInput } from "react-imask"
import { z } from "zod"

import { useBookingStore } from "@/lib/booking-store"
import { purchaseTicketFn } from "@/lib/queries"
import type { FlightOption } from "@/lib/queries"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

const paymentSchema = z.object({
  cardType: z.enum(["credit", "debit"]),
  cardNumber: z
    .string()
    .refine(
      (v) => /^\d+$/.test(v.replace(/\s/g, "")) && v.replace(/\s/g, "").length >= 12,
      "Card number must contain only digits and be at least 12 digits."
    ),
  nameOnCard: z.string().min(2, "Name on card is required."),
  cardExpiration: z.string().refine((value) => {
    if (!/^\d{2}\/\d{2}$/.test(value)) return false
    const [monthText, yearText] = value.split("/")
    const month = Number(monthText)
    const year = Number(yearText)
    if (!Number.isInteger(month) || !Number.isInteger(year)) return false
    if (month < 1 || month > 12) return false

    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear() % 100
    if (year < currentYear) return false
    if (year === currentYear && month < currentMonth) return false
    return true
  }, "Enter a valid future expiration (MM/YY)."),
})

export const Route = createFileRoute("/_globe/checkout")({
  component: CheckoutPage,
})

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDate(datetime: string) {
  return new Date(datetime).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatDuration(departure: string, arrival: string) {
  const diff = new Date(arrival).getTime() - new Date(departure).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

function CheckoutPage() {
  const navigate = useNavigate()
  const selectedOutbound = useBookingStore((s) => s.selectedOutbound)
  const selectedReturn = useBookingStore((s) => s.selectedReturn)
  const confirmation = useBookingStore((s) => s.confirmation)
  const setConfirmation = useBookingStore((s) => s.setConfirmation)
  const reset = useBookingStore((s) => s.reset)

  // Redirect if no flight selected
  useEffect(() => {
    if (!selectedOutbound && !confirmation) {
      void navigate({ to: "/" })
    }
  }, [selectedOutbound, confirmation, navigate])

  if (confirmation) {
    return <ConfirmationView confirmation={confirmation} onReset={reset} />
  }

  if (!selectedOutbound) return null

  return (
    <CheckoutForm
      outbound={selectedOutbound}
      returnFlight={selectedReturn}
      onConfirmation={setConfirmation}
    />
  )
}

// --- Checkout Form ---

function CheckoutForm({
  outbound,
  returnFlight,
  onConfirmation,
}: {
  outbound: FlightOption
  returnFlight: FlightOption | null
  onConfirmation: (data: {
    flights: FlightOption[]
    ticketIds: number[]
    totalPrice: number
  }) => void
}) {
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)

  const totalPrice =
    outbound.basePrice + (returnFlight ? returnFlight.basePrice : 0)

  const form = useForm({
    defaultValues: {
      cardType: "credit" as "credit" | "debit",
      cardNumber: "",
      nameOnCard: "",
      cardExpiration: "",
    },
    validators: {
      onSubmit: paymentSchema,
    },
    onSubmit: async ({ value }) => {
      // Strip mask characters from card number
      const rawCardNumber = value.cardNumber.replace(/\s/g, "")

      const ticketIds: number[] = []
      const flights: FlightOption[] = [outbound]

      // Purchase outbound
      const outboundResult = await purchaseTicketFn({
        data: {
          airlineName: outbound.airlineName,
          flightNumber: outbound.flightNumber,
          departureDatetime: outbound.departureDatetime,
          cardType: value.cardType,
          cardNumber: rawCardNumber,
          nameOnCard: value.nameOnCard,
          cardExpiration: value.cardExpiration,
        },
      })
      ticketIds.push(outboundResult.ticketId)

      // Purchase return if round-trip
      if (returnFlight) {
        flights.push(returnFlight)
        const returnResult = await purchaseTicketFn({
          data: {
            airlineName: returnFlight.airlineName,
            flightNumber: returnFlight.flightNumber,
            departureDatetime: returnFlight.departureDatetime,
            cardType: value.cardType,
            cardNumber: rawCardNumber,
            nameOnCard: value.nameOnCard,
            cardExpiration: value.cardExpiration,
          },
        })
        ticketIds.push(returnResult.ticketId)
      }

      onConfirmation({
        flights,
        ticketIds,
        totalPrice,
      })
    },
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      // Format server errors nicely
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message)
          if (Array.isArray(parsed)) {
            setError(parsed.map((e: { message?: string }) => e.message).filter(Boolean).join(" "))
            return
          }
        } catch {
          // not JSON, use as-is
        }
        setError(err.message)
      } else {
        setError("Booking failed.")
      }
    }
  }

  return (
    <main className="relative z-10 mx-auto max-w-5xl px-4 pt-4 pb-24">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
      >
        <ArrowLeft className="size-3.5" />
        Back to search
      </Link>

      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">
        Complete Your Booking
      </h1>
      <p className="mb-8 text-sm text-white/40">
        Review your flight details and enter payment information.
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left: Payment form */}
        <div>
          {/* Flight review */}
          <div className="mb-6 space-y-3">
            <FlightSummaryCard flight={outbound} label="Outbound" />
            {returnFlight ? (
              <FlightSummaryCard flight={returnFlight} label="Return" />
            ) : null}
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2">
              <CreditCard className="size-4 text-white/40" />
              <h2 className="text-sm font-medium tracking-widest text-white/50 uppercase">
                Payment
              </h2>
            </div>

            <form ref={formRef} onSubmit={handleSubmit}>
              {/* Card type toggle */}
              <div className="mb-5">
                <label className="mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase">
                  Card Type
                </label>
                <form.Field name="cardType">
                  {(field) => (
                    <div className="flex gap-2">
                      {(["credit", "debit"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.handleChange(type)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors",
                            field.state.value === type
                              ? "border-white/20 bg-white/10 text-white"
                              : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </form.Field>
              </div>

              {/* Card number */}
              <div className="mb-5">
                <form.Field name="cardNumber">
                  {(field) => {
                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <>
                        <label
                          htmlFor={`${formId}-card`}
                          className="mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase"
                        >
                          Card Number
                        </label>
                        <IMaskInput
                          id={`${formId}-card`}
                          mask="0000 0000 0000 0000"
                          placeholder="0000 0000 0000 0000"
                          value={field.state.value}
                          onAccept={(value) => field.handleChange(String(value))}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid}
                          className={cn(
                            "h-10 w-full rounded-lg border bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20 focus:ring-1 focus:ring-white/10",
                            isInvalid ? "border-red-500/50" : "border-white/10"
                          )}
                        />
                        {isInvalid && field.state.meta.errors.length > 0 && (
                          <p className="mt-1 text-xs text-red-400">
                            {String(field.state.meta.errors[0])}
                          </p>
                        )}
                      </>
                    )
                  }}
                </form.Field>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <form.Field name="cardExpiration">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <>
                          <label
                            htmlFor={`${formId}-exp`}
                            className="mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase"
                          >
                            Expiration
                          </label>
                          <IMaskInput
                            id={`${formId}-exp`}
                            mask="00/00"
                            placeholder="MM/YY"
                            value={field.state.value}
                            onAccept={(value) =>
                              field.handleChange(String(value))
                            }
                            onBlur={field.handleBlur}
                            aria-invalid={isInvalid}
                            className={cn(
                              "h-10 w-full rounded-lg border bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20 focus:ring-1 focus:ring-white/10",
                              isInvalid ? "border-red-500/50" : "border-white/10"
                            )}
                          />
                          {isInvalid && field.state.meta.errors.length > 0 && (
                            <p className="mt-1 text-xs text-red-400">
                              {String(field.state.meta.errors[0])}
                            </p>
                          )}
                        </>
                      )
                    }}
                  </form.Field>
                </div>
                <div>
                  <form.Field name="nameOnCard">
                    {(field) => {
                      const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <>
                          <label
                            htmlFor={`${formId}-name`}
                            className="mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase"
                          >
                            Name on Card
                          </label>
                          <input
                            id={`${formId}-name`}
                            type="text"
                            placeholder="Full Name"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                            aria-invalid={isInvalid}
                            className={cn(
                              "h-10 w-full rounded-lg border bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20 focus:ring-1 focus:ring-white/10",
                              isInvalid ? "border-red-500/50" : "border-white/10"
                            )}
                          />
                          {isInvalid && field.state.meta.errors.length > 0 && (
                            <p className="mt-1 text-xs text-red-400">
                              {String(field.state.meta.errors[0])}
                            </p>
                          )}
                        </>
                      )
                    }}
                  </form.Field>
                </div>
              </div>

              {error ? (
                <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {/* Submit — visible on mobile, hidden on lg (sidebar has the button) */}
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 lg:hidden"
                  >
                    {isSubmitting
                      ? "Processing…"
                      : `Confirm & Pay ${formatCurrency(totalPrice)}`}
                  </button>
                )}
              </form.Subscribe>
            </form>
          </div>
        </div>

        {/* Right: Sticky sidebar */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
            <h2 className="mb-4 text-sm font-medium tracking-widest text-white/50 uppercase">
              Price Summary
            </h2>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  {outbound.departureAirportCode} →{" "}
                  {outbound.arrivalAirportCode}
                </span>
                <span className="text-white">
                  {formatCurrency(outbound.basePrice)}
                </span>
              </div>
              {returnFlight ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    {returnFlight.departureAirportCode} →{" "}
                    {returnFlight.arrivalAirportCode}
                  </span>
                  <span className="text-white">
                    {formatCurrency(returnFlight.basePrice)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="my-4 border-t border-white/[0.06]" />

            <div className="flex items-end justify-between">
              <span className="text-sm text-white/50">Total</span>
              <span className="text-2xl font-semibold text-white">
                {formatCurrency(totalPrice)}
              </span>
            </div>

            {/* Desktop submit */}
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => formRef.current?.requestSubmit()}
                  className="mt-6 hidden w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 lg:block"
                >
                  {isSubmitting
                    ? "Processing…"
                    : `Confirm & Pay`}
                </button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </main>
  )
}

// --- Flight Summary Card ---

function FlightSummaryCard({
  flight,
  label,
}: {
  flight: FlightOption
  label: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium tracking-widest text-white/60 uppercase">
          {label}
        </span>
        <span className="text-xs text-white/30">
          {formatDate(flight.departureDatetime)}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold text-white">
            {formatTime(flight.departureDatetime)}
          </div>
          <div className="text-xs text-white/40">
            {flight.departureAirportCode}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Clock className="size-3" />
            {formatDuration(flight.departureDatetime, flight.arrivalDatetime)}
          </div>
          <div className="flex w-full items-center gap-1">
            <div className="h-px flex-1 bg-white/15" />
            <Plane className="size-3 text-white/30" />
          </div>
          <div className="text-[10px] text-white/20">
            {flight.flightNumber} · {flight.airlineName}
          </div>
        </div>

        <div className="min-w-0 text-right">
          <div className="text-lg font-semibold text-white">
            {formatTime(flight.arrivalDatetime)}
          </div>
          <div className="text-xs text-white/40">
            {flight.arrivalAirportCode}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Confirmation View ---

function ConfirmationView({
  confirmation,
  onReset,
}: {
  confirmation: {
    flights: FlightOption[]
    ticketIds: number[]
    totalPrice: number
  }
  onReset: () => void
}) {
  return (
    <main className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 pt-16 pb-24 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
        <CheckCircle2 className="size-8 text-emerald-400" />
      </div>

      <h1 className="mb-2 text-2xl font-semibold text-white">
        Booking Confirmed
      </h1>
      <p className="mb-8 text-sm text-white/40">
        Your tickets have been secured. Have a great flight!
      </p>

      <div className="mb-8 w-full space-y-3">
        {confirmation.flights.map((flight, i) => (
          <div
            key={`${flight.flightNumber}-${flight.departureDatetime}`}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm"
            style={{
              animationDelay: `${i * 100}ms`,
              animationDuration: "400ms",
              animationFillMode: "both",
              animationName: "card-enter",
              animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-white/40">
                Ticket #{confirmation.ticketIds[i]}
              </span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                Confirmed
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-semibold text-white">
                  {flight.departureAirportCode}
                </div>
                <div className="text-xs text-white/40">
                  {formatTime(flight.departureDatetime)}
                </div>
              </div>
              <div className="flex flex-1 items-center gap-1">
                <div className="h-px flex-1 bg-white/15" />
                <ArrowRight className="size-3 text-white/30" />
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-white">
                  {flight.arrivalAirportCode}
                </div>
                <div className="text-xs text-white/40">
                  {formatTime(flight.arrivalDatetime)}
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-white/30">
              <span>
                {flight.flightNumber} · {formatDate(flight.departureDatetime)}
              </span>
              <span>{formatCurrency(flight.basePrice)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 text-lg font-semibold text-white">
        Total: {formatCurrency(confirmation.totalPrice)}
      </div>

      <div className="flex gap-3">
        <Link
          to="/customer"
          className="rounded-lg border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          View My Trips
        </Link>
        <Link
          to="/"
          onClick={onReset}
          className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Search More Flights
        </Link>
      </div>
    </main>
  )
}
