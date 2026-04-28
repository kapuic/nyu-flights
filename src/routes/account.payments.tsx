import { Link, createFileRoute } from "@tanstack/react-router"
import { CreditCard as CreditCardIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCardVisual, detectCardBrand } from "@/components/ui/credit-card"
import { getPaymentHistoryFn } from "@/lib/queries"

export const Route = createFileRoute("/account/payments")({
  loader: () => getPaymentHistoryFn(),
  component: PaymentsPage,
})

function formatExpiry(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`
}

function SavedPaymentCard({
  cardNumber,
  cardType,
  expiration,
  nameOnCard,
}: {
  cardNumber: string
  cardType: string
  expiration: string
  nameOnCard: string
}) {
  const brand = detectCardBrand(cardNumber)
  const lastFour = cardNumber.replace(/\D/g, "").slice(-4)

  return (
    <div className="w-full max-w-[390px] rounded-xl border border-border bg-card p-3 shadow-sm">
      <CreditCardVisual
        cardNumber={cardNumber}
        nameOnCard={nameOnCard}
        expiration={expiration}
        cvv=""
        brand={brand}
        flipped={false}
        className="h-auto w-full"
      />
      <div className="mt-3 flex items-center justify-between gap-4 px-1 text-sm text-muted-foreground">
        <span className="truncate">
          {cardType === "credit" ? "Credit" : "Debit"} ending in {lastFour}
        </span>
        <span className="shrink-0">Exp {expiration}</span>
      </div>
    </div>
  )
}

function PaymentsPage() {
  const cards = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cards used in your past bookings.
        </p>
      </div>
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <CreditCardIcon className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No payment methods on file. Cards are saved when you book a flight.
          </p>
          <Link
            to="/"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted hover:text-foreground"
          >
            Search Flights
          </Link>
        </div>
      ) : (
        <>
          <div className="grid max-w-[840px] gap-6 sm:grid-cols-2">
            {cards.map(
              (card: {
                card_number: string
                card_type: string
                name_on_card: string
                card_expiration: string
              }) => (
                <SavedPaymentCard
                  key={card.card_number}
                  cardNumber={card.card_number}
                  cardType={card.card_type}
                  expiration={formatExpiry(card.card_expiration)}
                  nameOnCard={card.name_on_card}
                />
              )
            )}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Looking for receipts?</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                View your recent flight charges and booking details.
              </p>
              <Link
                to="/trips"
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-sm font-medium whitespace-nowrap shadow-xs hover:bg-muted hover:text-foreground"
              >
                View History
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
