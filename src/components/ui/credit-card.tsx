"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Card brand detection
// ---------------------------------------------------------------------------

export type CardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "diners"
  | "jcb"
  | "unionpay"
  | "unknown"

const BRAND_PATTERNS: Array<{ brand: CardBrand; pattern: RegExp }> = [
  { brand: "visa", pattern: /^4/ },
  // Mastercard: 51-55 and 2221-2720
  {
    brand: "mastercard",
    pattern: /^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/,
  },
  { brand: "amex", pattern: /^3[47]/ },
  { brand: "discover", pattern: /^(6011|65|64[4-9])/ },
  { brand: "diners", pattern: /^(36|38|30[0-5])/ },
  { brand: "jcb", pattern: /^35(2[89]|[3-8])/ },
  { brand: "unionpay", pattern: /^62/ },
]

export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = cardNumber.replace(/\D/g, "")
  if (digits.length < 2) return "unknown"
  for (const { brand, pattern } of BRAND_PATTERNS) {
    if (pattern.test(digits)) return brand
  }
  return "unknown"
}

export function isValidLuhn(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, "")
  if (digits.length < 12) return false

  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number.parseInt(digits[i], 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

export function getCardMask(brand: CardBrand): string {
  return brand === "amex" ? "0000 000000 00000" : "0000 0000 0000 0000"
}

export function getCvvLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3
}

// ---------------------------------------------------------------------------
// Brand visuals
// ---------------------------------------------------------------------------

type BrandTheme = {
  animatedGradient: string
  logo: string
  textColor: string
}

const BRAND_THEMES: Record<CardBrand, BrandTheme> = {
  visa: {
    animatedGradient:
      "linear-gradient(135deg, #1a1f71 0%, #2b3a9e 25%, #1565c0 50%, #2b3a9e 75%, #1a1f71 100%)",
    logo: "VISA",
    textColor: "text-white",
  },
  mastercard: {
    animatedGradient:
      "linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #eb001b 50%, #ff5f00 75%, #1a1a2e 100%)",
    logo: "MC",
    textColor: "text-white",
  },
  amex: {
    animatedGradient:
      "linear-gradient(135deg, #006fcf 0%, #0080e5 25%, #00aeef 50%, #0080e5 75%, #006fcf 100%)",
    logo: "AMEX",
    textColor: "text-white",
  },
  discover: {
    animatedGradient:
      "linear-gradient(135deg, #1a1a1a 0%, #333 25%, #ff6000 50%, #333 75%, #1a1a1a 100%)",
    logo: "DISC",
    textColor: "text-white",
  },
  diners: {
    animatedGradient:
      "linear-gradient(135deg, #0079be 0%, #006ba6 25%, #0079be 50%, #006ba6 75%, #0079be 100%)",
    logo: "DC",
    textColor: "text-white",
  },
  jcb: {
    animatedGradient:
      "linear-gradient(135deg, #003087 0%, #0054a6 25%, #009b3a 50%, #0054a6 75%, #003087 100%)",
    logo: "JCB",
    textColor: "text-white",
  },
  unionpay: {
    animatedGradient:
      "linear-gradient(135deg, #e21836 0%, #00447c 25%, #007b84 50%, #00447c 75%, #e21836 100%)",
    logo: "UP",
    textColor: "text-white",
  },
  unknown: {
    animatedGradient:
      "linear-gradient(135deg, #2a2a2e 0%, #3a3a40 25%, #48484f 50%, #3a3a40 75%, #2a2a2e 100%)",
    logo: "",
    textColor: "text-white/80",
  },
}

// ---------------------------------------------------------------------------
// Brand logo SVGs
// ---------------------------------------------------------------------------

function VisaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none">
      <path
        d="M293.2 348.7l33.4-195.8h53.3l-33.4 195.8h-53.3zm246.8-191c-10.5-4-27.1-8.4-47.7-8.4-52.6 0-89.7 26.6-89.9 64.7-.3 28.2 26.5 43.9 46.7 53.3 20.8 9.6 27.8 15.7 27.7 24.3-.1 13.1-16.6 19.1-32 19.1-21.4 0-32.7-3-50.3-10.2l-6.9-3.1-7.5 44c12.5 5.5 35.5 10.2 59.4 10.5 56 0 92.3-26.3 92.7-67 .2-22.3-14-39.3-44.8-53.3-18.6-9.1-30-15.1-29.9-24.3 0-8.1 9.7-16.8 30.5-16.8 17.4-.3 30 3.5 39.8 7.5l4.8 2.3 7.2-42.6zm137.3-4.8h-41.1c-12.7 0-22.3 3.5-27.8 16.2l-79 179.4h55.9s9.1-24.1 11.2-29.4h68.3c1.6 6.9 6.5 29.4 6.5 29.4h49.4l-43.4-195.6zm-65.7 126.3c4.4-11.3 21.3-54.7 21.3-54.7-.3.5 4.4-11.4 7.1-18.8l3.6 17s10.2 46.9 12.4 56.5h-44.4zM247.1 152.9L195 308l-5.6-27.3c-9.7-31.2-39.8-65.1-73.6-82l47.7 150h56.4l83.9-195.8h-56.8z"
        fill="#fff"
      />
      <path
        d="M146.9 152.9H60.6l-.7 3.5c66.9 16.3 111.2 55.5 129.6 102.7l-18.7-90.1c-3.2-12.3-12.6-15.7-23.9-16.1z"
        fill="#f7b600"
      />
    </svg>
  )
}

function MastercardLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 780 500" fill="none">
      <circle cx="310" cy="250" r="140" fill="#eb001b" />
      <circle cx="470" cy="250" r="140" fill="#f79e1b" />
      <path
        d="M390 140.8c35.3 28 57.9 71 57.9 119.2s-22.6 91.2-57.9 119.2c-35.3-28-57.9-71-57.9-119.2s22.6-91.2 57.9-119.2z"
        fill="#ff5f00"
      />
    </svg>
  )
}

function AmexLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 40">
      <text
        x="50%"
        y="55%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#fff"
        fontSize="14"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        AMEX
      </text>
    </svg>
  )
}

function GenericBrandLogo({
  brand,
  className,
}: {
  brand: string
  className?: string
}) {
  return (
    <svg className={className} viewBox="0 0 60 40">
      <text
        x="50%"
        y="55%"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="700"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.5"
      >
        {brand.toUpperCase()}
      </text>
    </svg>
  )
}

export function CardBrandLogo({
  brand,
  className,
}: {
  brand: CardBrand
  className?: string
}) {
  switch (brand) {
    case "visa":
      return <VisaLogo className={className} />
    case "mastercard":
      return <MastercardLogo className={className} />
    case "amex":
      return <AmexLogo className={className} />
    case "unknown":
      return null
    default:
      return (
        <GenericBrandLogo
          brand={BRAND_THEMES[brand].logo}
          className={className}
        />
      )
  }
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

  if (brand === "amex") {
    const padded = digits.padEnd(15, "•")
    return `${padded.slice(0, 4)} ${padded.slice(4, 10)} ${padded.slice(10, 15)}`
  }

  const maxLen = Math.max(16, digits.length)
  const padded = digits.padEnd(maxLen, "•")
  const groups: string[] = []
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
  const theme = BRAND_THEMES[brand]

  const displayNumber = useMemo(
    () => formatDisplayNumber(cardNumber, brand),
    [cardNumber, brand]
  )

  const displayName = nameOnCard.trim() || "YOUR NAME"
  const displayExp = expiration || "••/••"
  const displayCvv = cvv ? cvv.replace(/./g, "•") : "•••"

  return (
    <div className={cn("cc-root", className)} style={{ perspective: "1200px" }}>
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

          <div className="relative z-10 flex h-full flex-col justify-between p-6">
            <div className="flex items-start justify-between">
              <ChipSvg className="h-9 w-12" />
              <CardBrandLogo brand={brand} className="h-10 w-16" />
            </div>

            <div
              className={cn(
                "font-mono text-[clamp(0.9rem,5.4vw,1.25rem)] tracking-[0.14em] whitespace-nowrap sm:tracking-[0.18em]",
                theme.textColor
              )}
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
            >
              {displayNumber}
            </div>

            <div className="flex items-end justify-between">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[9px] tracking-widest text-white/40 uppercase">
                  Card Holder
                </div>
                <div
                  className="truncate text-sm font-medium tracking-wider text-white/90 uppercase"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}
                >
                  {displayName}
                </div>
              </div>
              <div className="ml-4 text-right">
                <div className="mb-0.5 text-[9px] tracking-widest text-white/40 uppercase">
                  Expires
                </div>
                <div
                  className="font-mono text-sm tracking-wider text-white/90"
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
