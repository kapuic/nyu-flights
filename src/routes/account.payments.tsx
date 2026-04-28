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

function PaymentsPage() {
  const cards = Route.useLoaderData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">Cards used in your past bookings.</p>
      </div>
      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
          <CreditCardIcon className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No payment methods on file. Cards are saved when you book a flight.</p>
          <Link to="/" className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted hover:text-foreground">Search Flights</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            {cards.map((card: { card_number: string; card_type: string; name_on_card: string; card_expiration: string }) => {
              const brand = detectCardBrand(card.card_number)
              const lastFour = card.card_number.slice(-4)
              const masked = `${"•".repeat(Math.max(0, card.card_number.length - 4))}${lastFour}`
              return (
                <Card key={card.card_number} className="overflow-hidden">
                  <CardContent className="space-y-4">
                    <div className="aspect-[1.586/1] w-full [&_.cc-root]:w-full [&_.cc-inner]:!h-full [&_.cc-inner]:!w-full">
                      <CreditCardVisual cardNumber={card.card_number} nameOnCard={card.name_on_card} expiration={formatExpiry(card.card_expiration)} cvv="" brand={brand} flipped={false} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{card.card_type === "credit" ? "Credit" : "Debit"} · {masked}</span>
                      <span className="text-muted-foreground">Exp {formatExpiry(card.card_expiration)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Looking for receipts?</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">View your recent flight charges and booking details.</p>
              <Link to="/trips" className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted hover:text-foreground whitespace-nowrap">View History</Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
