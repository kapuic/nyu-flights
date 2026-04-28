import { useCallback, useEffect, useRef, useState } from "react"
import { faker } from "@faker-js/faker"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Dices,
  Plane,
} from "lucide-react"

import type { FormEvent } from "react"

import type { FlightOption } from "@/lib/queries"

import type { PaymentCardFieldErrors, PaymentCardValues } from "@/components/ui/payment-form"
import { PaymentCardForm, validatePaymentCard } from "@/components/ui/payment-form"
import { useBookingStore } from "@/lib/booking-store"
import { formatCurrency } from "@/lib/format"
import { purchaseTicketFn } from "@/lib/queries"
import { formatShortDate, formatTime, getFlightDuration } from "@/lib/temporal"
import { cn, getErrorMessage } from "@/lib/utils"
import { detectCardBrand } from "@/components/ui/credit-card"

export const Route = createFileRoute("/_globe/checkout")({
  component: CheckoutPage,
})

// Helpers
// ---------------------------------------------------------------------------

function formatDuration(departure: string, arrival: string) {
  const dur = getFlightDuration(departure, arrival)
  return `${dur.hours}h ${dur.minutes}m`
}

/**
 * Map detected card brand to DB card_type.
 * The DB only stores "credit" or "debit". Since debit vs credit can't be
 * reliably determined from the PAN alone, we default to "credit" and let
 * the user toggle explicitly.
 */
function inferCardType(cardType: "credit" | "debit"): "credit" | "debit" {
  return cardType
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CheckoutPage() {
  const navigate = useNavigate()
  const selectedOutbound = useBookingStore((s) => s.selectedOutbound)
  const selectedReturn = useBookingStore((s) => s.selectedReturn)
  const confirmation = useBookingStore((s) => s.confirmation)
  const setConfirmation = useBookingStore((s) => s.setConfirmation)
  const reset = useBookingStore((s) => s.reset)

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

// ---------------------------------------------------------------------------
// Checkout form
// ---------------------------------------------------------------------------

const INITIAL_CARD: PaymentCardValues = {
  cardNumber: "",
  nameOnCard: "",
  cardExpiration: "",
  cvv: "",
  brand: "unknown",
}

const FAKER_ISSUERS = [
  "visa",
  "mastercard",
  "american_express",
  "discover",
  "diners_club",
  "jcb",
  "instapayment",
] as const

function generateRandomCard(): PaymentCardValues {
  const issuer = FAKER_ISSUERS[Math.floor(Math.random() * FAKER_ISSUERS.length)]
  const rawNumber = faker.finance.creditCardNumber(issuer).replace(/-/g, "")
  const brand = detectCardBrand(rawNumber)

  // Format with spaces
  let formatted: string
  if (brand === "american-express") {
    formatted = `${rawNumber.slice(0, 4)} ${rawNumber.slice(4, 10)} ${rawNumber.slice(10)}`
  } else {
    const groups: Array<string> = []
    for (let i = 0; i < rawNumber.length; i += 4) groups.push(rawNumber.slice(i, i + 4))
    formatted = groups.join(" ")
  }

  // Random future expiration
  const now = new Date()
  const futureMonth = Math.floor(Math.random() * 12) + 1
  const futureYear = (now.getFullYear() % 100) + Math.floor(Math.random() * 5) + 1
  const expiration = `${String(futureMonth).padStart(2, "0")}/${String(futureYear).padStart(2, "0")}`

  const cvv = faker.finance.creditCardCVV()
  const name = faker.person.fullName()

  return {
    cardNumber: formatted,
    nameOnCard: name,
    cardExpiration: expiration,
    cvv,
    brand,
  }
}

function CheckoutForm({
  outbound,
  returnFlight,
  onConfirmation,
}: {
  outbound: FlightOption
  returnFlight: FlightOption | null
  onConfirmation: (data: {
    flights: Array<FlightOption>
    ticketIds: Array<string>
    totalPrice: number
  }) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cardType, setCardType] = useState<"credit" | "debit">("credit")

  // Payment card state (controlled)
  const [card, setCard] = useState<PaymentCardValues>(INITIAL_CARD)
  const [cardErrors, setCardErrors] = useState<PaymentCardFieldErrors>({})
  const [cardTouched, setCardTouched] = useState<Partial<Record<keyof PaymentCardValues, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)

  const totalPrice =
    outbound.basePrice + (returnFlight ? returnFlight.basePrice : 0)

  const handleCardChange = useCallback((next: PaymentCardValues) => {
    setCard(next)
    setError(null)
  }, [])

  const handleCardBlur = useCallback(
    (field: keyof PaymentCardValues) => {
      setCardTouched((prev) => ({ ...prev, [field]: true }))
      // Validate on blur
      const errs = validatePaymentCard(card)
      setCardErrors(errs)
    },
    [card]
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    setSubmitted(true)

    // Mark all touched
    setCardTouched({
      cardNumber: true,
      nameOnCard: true,
      cardExpiration: true,
      cvv: true,
    })

    const errs = validatePaymentCard(card)
    setCardErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSubmitting(true)
    try {
      const rawCardNumber = card.cardNumber.replace(/\s/g, "")
      const ticketIds: Array<string> = []
      const flights: Array<FlightOption> = [outbound]

      const purchaseData = {
        cardType: inferCardType(cardType),
        cardNumber: rawCardNumber,
        nameOnCard: card.nameOnCard,
        cardExpiration: card.cardExpiration,
      }

      const outboundResult = await purchaseTicketFn({
        data: {
          airlineName: outbound.airlineName,
          flightNumber: outbound.flightNumber,
          departureDatetime: outbound.departureDatetime,
          ...purchaseData,
        },
      })
      ticketIds.push(outboundResult.ticketId)

      if (returnFlight) {
        flights.push(returnFlight)
        const returnResult = await purchaseTicketFn({
          data: {
            airlineName: returnFlight.airlineName,
            flightNumber: returnFlight.flightNumber,
            departureDatetime: returnFlight.departureDatetime,
            ...purchaseData,
          },
        })
        ticketIds.push(returnResult.ticketId)
      }

      onConfirmation({ flights, ticketIds, totalPrice })
    } catch (err) {
      setError(getErrorMessage(err, "Booking failed."))
    } finally {
      setSubmitting(false)
    }
  }

  // Use submitted state to show all errors
  const effectiveTouched = submitted
    ? { cardNumber: true, nameOnCard: true, cardExpiration: true, cvv: true, brand: true }
    : cardTouched

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
        <div>
          {/* Flight review */}
          <div className="mb-6 space-y-3">
            <FlightSummaryCard flight={outbound} label="Outbound" />
            {returnFlight ? (
              <FlightSummaryCard flight={returnFlight} label="Return" />
            ) : null}
          </div>

          {/* Payment section */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl">
            <div className="mb-5 flex items-center gap-2">
              <CreditCard className="size-4 text-white/40" />
              <h2 className="text-sm font-medium tracking-widest text-white/50 uppercase">
                Payment
              </h2>
            </div>

            <form noValidate ref={formRef} onSubmit={handleSubmit}>
              {/* Card type toggle (credit/debit for DB) */}
              <div className="mb-5">
                <div className="flex items-start gap-2">
                  <div>
                    <label className="mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase">
                      Card Type
                    </label>
                    <div className="flex gap-2">
                      {(["credit", "debit"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCardType(type)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-colors",
                            cardType === type
                              ? "border-white/20 bg-white/10 text-white"
                              : "border-white/[0.06] text-white/40 hover:border-white/10 hover:text-white/60"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="ml-auto">
                    <label className="mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase">
                      Testing
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const random = generateRandomCard()
                        setCard(random)
                        setCardErrors({})
                        setCardTouched({})
                        setSubmitted(false)
                        setError(null)
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] px-4 py-2 text-sm font-medium text-white/40 transition-colors hover:border-white/10 hover:text-white/60"
                    >
                      <Dices className="size-3.5" />
                      Fill Random
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment card form (reusable component) */}
              <PaymentCardForm
                values={card}
                onChange={handleCardChange}
                errors={cardErrors}
                touched={effectiveTouched}
                onBlur={handleCardBlur}
                showCard
              />

              {error ? (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {/* Mobile submit */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 lg:hidden"
              >
                {submitting
                  ? "Processing…"
                  : `Confirm & Pay ${formatCurrency(totalPrice)}`}
              </button>
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
            <button
              type="button"
              disabled={submitting}
              onClick={() => formRef.current?.requestSubmit()}
              className="mt-6 hidden w-full rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50 lg:block"
            >
              {submitting ? "Processing…" : "Confirm & Pay"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Flight Summary Card
// ---------------------------------------------------------------------------

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
          {formatShortDate(flight.departureDatetime)}
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

// ---------------------------------------------------------------------------
// Confirmation View
// ---------------------------------------------------------------------------

function ConfirmationView({
  confirmation,
  onReset,
}: {
  confirmation: {
    flights: Array<FlightOption>
    ticketIds: Array<string>
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
                {flight.flightNumber} · {formatShortDate(flight.departureDatetime)}
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
          to="/trips"
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
