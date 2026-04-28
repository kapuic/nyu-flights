"use client"

import { useMemo } from "react"
import valid from "card-validator"
import { PaymentIcon } from "react-svg-credit-card-payment-icons"
import type { PaymentType } from "react-svg-credit-card-payment-icons"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Card brand detection (powered by card-validator)
// ---------------------------------------------------------------------------

/**
 * Brand strings produced by card-validator's `number()`.
 * `unknown` is used when no brand could be determined yet.
 */
export type CardBrand =
  | "visa"
  | "mastercard"
  | "american-express"
  | "discover"
  | "diners-club"
  | "jcb"
  | "unionpay"
  | "maestro"
  | "mir"
  | "elo"
  | "hiper"
  | "hipercard"
  | "unknown"

const KNOWN_BRANDS: ReadonlyArray<Exclude<CardBrand, "unknown">> = [
  "visa",
  "mastercard",
  "american-express",
  "discover",
  "diners-club",
  "jcb",
  "unionpay",
  "maestro",
  "mir",
  "elo",
  "hiper",
  "hipercard",
]

function isKnownBrand(value: string): value is Exclude<CardBrand, "unknown"> {
  return (KNOWN_BRANDS as ReadonlyArray<string>).includes(value)
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const result = valid.number(cardNumber)
  const type = result.card?.type
  if (type && isKnownBrand(type)) return type
  return "unknown"
}

export function isValidLuhn(cardNumber: string): boolean {
  return valid.number(cardNumber).isValid
}

/**
 * Build an iMask pattern for the brand's longest length using card-validator
 * gaps. Falls back to a generic 16-digit pattern when the brand is unknown.
 */
export function getCardMask(brand: CardBrand): string {
  if (brand === "unknown") return "0000 0000 0000 0000"
  const card = valid.creditCardType.getTypeInfo(brand)

  const length = card.lengths[card.lengths.length - 1]
  const gaps = card.gaps
  const out: Array<string> = []
  for (let i = 0; i < length; i++) {
    if (gaps.includes(i) && i !== 0) out.push(" ")
    out.push("0")
  }
  return out.join("")
}

export function getCvvLength(brand: CardBrand): number {
  if (brand === "unknown") return 3
  return valid.creditCardType.getTypeInfo(brand).code.size
}

// ---------------------------------------------------------------------------
// Brand visuals
// ---------------------------------------------------------------------------

type BrandTheme = {
  animatedGradient: string
  textColor: string
}

const DEFAULT_THEME: BrandTheme = {
  animatedGradient:
    "linear-gradient(135deg, #2a2a2e 0%, #3a3a40 25%, #48484f 50%, #3a3a40 75%, #2a2a2e 100%)",
  textColor: "text-white/80",
}

const BRAND_THEMES: Record<Exclude<CardBrand, "unknown">, BrandTheme> = {
  visa: {
    animatedGradient:
      "linear-gradient(135deg, #1a1f71 0%, #2b3a9e 25%, #1565c0 50%, #2b3a9e 75%, #1a1f71 100%)",
    textColor: "text-white",
  },
  mastercard: {
    animatedGradient:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #eb001b 50%, #ff5f00 75%, #1a1a2e 100%)",
    textColor: "text-white",
  },
  "american-express": {
    animatedGradient:
      "linear-gradient(135deg, #006fcf 0%, #0080e5 25%, #00aeef 50%, #0080e5 75%, #006fcf 100%)",
    textColor: "text-white",
  },
  discover: {
    animatedGradient:
      "linear-gradient(135deg, #1a1a1a 0%, #333 25%, #ff6000 50%, #333 75%, #1a1a1a 100%)",
    textColor: "text-white",
  },
  "diners-club": {
    animatedGradient:
      "linear-gradient(135deg, #0079be 0%, #006ba6 25%, #0079be 50%, #006ba6 75%, #0079be 100%)",
    textColor: "text-white",
  },
  jcb: {
    animatedGradient:
      "linear-gradient(135deg, #003087 0%, #0054a6 25%, #009b3a 50%, #0054a6 75%, #003087 100%)",
    textColor: "text-white",
  },
  unionpay: {
    animatedGradient:
      "linear-gradient(135deg, #e21836 0%, #00447c 25%, #007b84 50%, #00447c 75%, #e21836 100%)",
    textColor: "text-white",
  },
  maestro: {
    animatedGradient:
      "linear-gradient(135deg, #0066cc 0%, #003a75 25%, #cc0000 50%, #f47b30 75%, #0066cc 100%)",
    textColor: "text-white",
  },
  mir: {
    animatedGradient:
      "linear-gradient(135deg, #0f754e 0%, #136c47 25%, #1d8a5b 50%, #136c47 75%, #0f754e 100%)",
    textColor: "text-white",
  },
  elo: {
    animatedGradient:
      "linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 25%, #ffcb05 50%, #ee2e26 75%, #1a1a1a 100%)",
    textColor: "text-white",
  },
  hiper: {
    animatedGradient:
      "linear-gradient(135deg, #ec5d2a 0%, #a82d12 25%, #ec5d2a 50%, #a82d12 75%, #ec5d2a 100%)",
    textColor: "text-white",
  },
  hipercard: {
    animatedGradient:
      "linear-gradient(135deg, #b00000 0%, #6b0000 25%, #b00000 50%, #6b0000 75%, #b00000 100%)",
    textColor: "text-white",
  },
}

function themeFor(brand: CardBrand): BrandTheme {
  if (brand === "unknown") return DEFAULT_THEME
  return BRAND_THEMES[brand]
}

// ---------------------------------------------------------------------------
// Brand logos (from react-svg-credit-card-payment-icons)
// ---------------------------------------------------------------------------

/**
 * Map our internal brand string to the icon library's `type` prop.
 * Anything unknown falls back to the generic chip.
 */
const ICON_TYPE_BY_BRAND: Record<Exclude<CardBrand, "unknown">, PaymentType> = {
  visa: "Visa",
  mastercard: "Mastercard",
  "american-express": "AmericanExpress",
  discover: "Discover",
  "diners-club": "DinersClub",
  jcb: "Jcb",
  unionpay: "Unionpay",
  maestro: "Maestro",
  mir: "Mir",
  elo: "Elo",
  hiper: "Hiper",
  hipercard: "Hipercard",
}

export function CardBrandLogo({
  brand,
  className,
}: {
  brand: CardBrand
  className?: string
}) {
  if (brand === "unknown") return null
  const type = ICON_TYPE_BY_BRAND[brand]
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      <PaymentIcon type={type} format="flatRounded" width="100%" />
    </span>
  )
}

// ---------------------------------------------------------------------------
// Chip SVG
// ---------------------------------------------------------------------------

function ChipSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 50 40" fill="none">
      <rect
        x="1"
        y="1"
        width="48"
        height="38"
        rx="5"
        fill="#d4af37"
        stroke="#b8960c"
        strokeWidth="1"
      />
      <line x1="1" y1="14" x2="49" y2="14" stroke="#b8960c" strokeWidth="0.5" />
      <line x1="1" y1="26" x2="49" y2="26" stroke="#b8960c" strokeWidth="0.5" />
      <line x1="18" y1="1" x2="18" y2="40" stroke="#b8960c" strokeWidth="0.5" />
      <line x1="32" y1="1" x2="32" y2="40" stroke="#b8960c" strokeWidth="0.5" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Shared card face background (used by both front and back)
// ---------------------------------------------------------------------------

const NOISE_TEXTURE_URL =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

function CardFaceBackground({ gradient }: { gradient: string }) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          background: gradient,
          backgroundSize: "200% 200%",
          animation: "cc-gradient 6s ease infinite",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: `url("${NOISE_TEXTURE_URL}")` }}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// Display formatting
// ---------------------------------------------------------------------------

function formatDisplayNumber(raw: string, brand: CardBrand): string {
  const digits = raw.replace(/\D/g, "")

  if (brand === "american-express") {
    const padded = digits.padEnd(15, "•")
    return `${padded.slice(0, 4)} ${padded.slice(4, 10)} ${padded.slice(10, 15)}`
  }

  const maxLen = Math.max(16, digits.length)
  const padded = digits.padEnd(maxLen, "•")
  const groups: Array<string> = []
  for (let i = 0; i < padded.length; i += 4) {
    groups.push(padded.slice(i, i + 4))
  }
  return groups.join(" ")
}

// ---------------------------------------------------------------------------
// Credit card visual component
// ---------------------------------------------------------------------------

export type CreditCardProps = {
  cardNumber: string
  nameOnCard: string
  expiration: string
  cvv: string
  brand?: CardBrand
  flipped?: boolean
  className?: string
}

export function CreditCardVisual({
  cardNumber,
  nameOnCard,
  expiration,
  cvv,
  brand: brandOverride,
  flipped = false,
  className,
}: CreditCardProps) {
  const brand = brandOverride ?? detectCardBrand(cardNumber)
  const theme = themeFor(brand)

  const displayNumber = useMemo(
    () => formatDisplayNumber(cardNumber, brand),
    [cardNumber, brand]
  )

  const displayName = nameOnCard.trim() || "YOUR NAME"
  const displayExp = expiration || "••/••"
  const displayCvv = cvv ? cvv.replace(/./g, "•") : "•••"

  return (
    <div
      className={cn("cc-root @container/credit-card", className)}
      style={{ perspective: "1200px" }}
    >
      <div
        className="cc-inner relative aspect-[1.586/1] h-auto w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          transition: "transform 700ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          <CardFaceBackground gradient={theme.animatedGradient} />

          {/* Holographic shimmer */}
          <div
            className="absolute top-0 right-0 h-full w-[120px] opacity-[0.08]"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(255,255,255,0.3) 20%, transparent 40%, rgba(255,255,255,0.2) 60%, transparent 80%, rgba(255,255,255,0.3), transparent)",
              animation: "cc-shimmer 4s ease-in-out infinite",
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-between p-[6.7cqw] @[360px]/credit-card:p-6">
            <div className="flex items-start justify-between">
              <ChipSvg className="h-[13cqw] w-[17cqw] max-w-12" />
              <CardBrandLogo
                brand={brand}
                className="h-[14cqw] max-h-10 w-[22cqw] max-w-16"
              />
            </div>

            <div
              className={cn(
                "font-mono text-[clamp(0.875rem,6.25cqw,1.25rem)] tracking-[clamp(0.025em,0.45cqw,0.12em)] whitespace-nowrap",
                theme.textColor
              )}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
            >
              {displayNumber}
            </div>

            <div className="flex items-end justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[2.7cqw] tracking-widest text-white/40 uppercase @[360px]/credit-card:text-[9px]">
                  Card Holder
                </div>
                <div
                  className="truncate text-[4.1cqw] font-medium tracking-wider text-white/90 uppercase @[360px]/credit-card:text-sm"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                >
                  {displayName}
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="mb-0.5 text-[2.7cqw] tracking-widest text-white/40 uppercase @[360px]/credit-card:text-[9px]">
                  Expires
                </div>
                <div
                  className="font-mono text-[4.1cqw] tracking-wider text-white/90 @[360px]/credit-card:text-sm"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                >
                  {displayExp}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <CardFaceBackground gradient={theme.animatedGradient} />

          <div className="relative z-10 flex h-full flex-col">
            <div className="mt-8 h-12 w-full bg-black/70" />

            <div className="mt-6 flex items-center gap-3 px-6">
              <div className="h-10 flex-1 rounded bg-white/90" />
              <div className="flex h-10 w-16 items-center justify-center rounded bg-white/95">
                <span className="font-mono text-base font-bold tracking-widest text-black/80">
                  {displayCvv}
                </span>
              </div>
            </div>

            <div className="mt-auto px-6 pb-5">
              <div className="flex items-end justify-between">
                <div className="text-[9px] leading-relaxed text-white/30">
                  This card is property of the issuing bank.
                  <br />
                  If found, please return to any branch.
                </div>
                <CardBrandLogo brand={brand} className="h-6 w-10 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cc-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes cc-shimmer {
          0%, 100% { transform: translateX(-30px); opacity: 0.06; }
          50% { transform: translateX(30px); opacity: 0.12; }
        }
      `}</style>
    </div>
  )
}
