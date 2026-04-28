"use client"

import { useCallback, useId, useMemo, useState } from "react"
import { IMaskInput } from "react-imask"

import type { CardBrand } from "@/components/ui/credit-card"
import {
  CardBrandLogo,
  CreditCardVisual,
  detectCardBrand,
  getCardMask,
  getCvvLength,
  isValidLuhn,
} from "@/components/ui/credit-card"
import { FieldError } from "@/components/ui/field"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

import { todayDate } from "@/lib/temporal"

export type PaymentCardValues = {
  cardNumber: string
  nameOnCard: string
  cardExpiration: string
  cvv: string
  /** Auto-detected brand. Consumer can read this for display or DB mapping. */
  brand: CardBrand
}

export type PaymentCardFieldErrors = Partial<
  Record<"cardNumber" | "nameOnCard" | "cardExpiration" | "cvv", string>
>

// ---------------------------------------------------------------------------
// Validation helpers (reusable outside this component)
// ---------------------------------------------------------------------------

export function validatePaymentCard(values: PaymentCardValues): PaymentCardFieldErrors {
  const errors: PaymentCardFieldErrors = {}
  const rawNumber = values.cardNumber.replace(/\s/g, "")

  if (rawNumber.length < 12) {
    errors.cardNumber = "Card number must be at least 12 digits."
  } else if (!/^\d+$/.test(rawNumber)) {
    errors.cardNumber = "Card number must contain only digits."
  } else if (!isValidLuhn(rawNumber)) {
    errors.cardNumber = "Card number is not valid."
  }

  if (values.nameOnCard.trim().length < 2) {
    errors.nameOnCard = "Name on card is required."
  }

  if (!/^\d{2}\/\d{2}$/.test(values.cardExpiration)) {
    errors.cardExpiration = "Enter expiration as MM/YY."
  } else {
    const [monthText, yearText] = values.cardExpiration.split("/")
    const month = Number(monthText)
    const year = Number(yearText)
    if (month < 1 || month > 12) {
      errors.cardExpiration = "Invalid month."
    } else {
      const today = todayDate()
      const currentMonth = today.month
      const currentYear = today.year % 100
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.cardExpiration = "Card has expired."
      }
    }
  }

  const cvvLen = getCvvLength(values.brand)
  if (values.cvv.length !== cvvLen) {
    errors.cvv = `Security code must be ${cvvLen} digits.`
  } else if (!/^\d+$/.test(values.cvv)) {
    errors.cvv = "Security code must contain only digits."
  }

  return errors
}

// ---------------------------------------------------------------------------
// Shared input styles for dark-on-glass theme
// ---------------------------------------------------------------------------

const inputClass =
  "h-10 w-full rounded-lg border bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/20 focus:ring-1 focus:ring-white/10"
const inputErrorClass = "border-red-500/50"
const inputNormalClass = "border-white/10"
const labelClass =
  "mb-2 block text-[10px] font-medium tracking-widest text-white/40 uppercase"

// ---------------------------------------------------------------------------
// Payment card form
// ---------------------------------------------------------------------------

export type PaymentCardFormProps = {
  values: PaymentCardValues
  onChange: (values: PaymentCardValues) => void
  errors?: PaymentCardFieldErrors
  touched?: Partial<Record<keyof PaymentCardValues, boolean>>
  onBlur?: (field: keyof PaymentCardValues) => void
  /** Show the 3D card visual above the form. Default true. */
  showCard?: boolean
  className?: string
}

export function PaymentCardForm({
  values,
  onChange,
  errors,
  touched,
  onBlur,
  showCard = true,
  className,
}: PaymentCardFormProps) {
  const id = useId()
  const [cvvFocused, setCvvFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const brand = useMemo(() => detectCardBrand(values.cardNumber), [values.cardNumber])
  const cardMask = useMemo(() => getCardMask(brand), [brand])

  const flipped = cvvFocused || isHovered

  const update = useCallback(
    (field: keyof PaymentCardValues, value: string) => {
      const next = { ...values, [field]: value }
      // Keep brand in sync
      if (field === "cardNumber") {
        next.brand = detectCardBrand(value)
      }
      onChange(next)
    },
    [values, onChange]
  )

  const handleBlur = useCallback(
    (field: keyof PaymentCardValues) => () => {
      if (field === "cvv") setCvvFocused(false)
      onBlur?.(field)
    },
    [onBlur]
  )

  const err = (field: keyof PaymentCardFieldErrors) =>
    touched?.[field] && errors?.[field] ? errors[field] : undefined

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* 3D Card */}
      {showCard ? (
        <div
          className="flex justify-center"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <CreditCardVisual
            cardNumber={values.cardNumber}
            nameOnCard={values.nameOnCard}
            expiration={values.cardExpiration}
            cvv={values.cvv}
            brand={brand}
            flipped={flipped}
            className="h-auto w-full max-w-[390px] shrink-0"
          />
        </div>
      ) : null}

      {/* Card number */}
      <div>
        <label htmlFor={`${id}-num`} className={labelClass}>
          Card Number
        </label>
        <div className="relative">
          <IMaskInput
            id={`${id}-num`}
            mask={cardMask}
            placeholder={brand === "american-express" ? "0000 000000 00000" : "0000 0000 0000 0000"}
            value={values.cardNumber}
            onAccept={(value) => update("cardNumber", String(value))}
            onBlur={handleBlur("cardNumber")}
            autoComplete="cc-number"
            inputMode="numeric"
            aria-invalid={!!err("cardNumber")}
            className={cn(inputClass, "pr-14", err("cardNumber") ? inputErrorClass : inputNormalClass)}
          />
          <div className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
            <CardBrandLogo brand={brand} className="h-6 w-10" />
          </div>
        </div>
        {err("cardNumber") ? (
          <FieldError className="mt-1 text-xs text-red-400" errors={[{ message: err("cardNumber") }]} />
        ) : null}
      </div>

      {/* Name on card */}
      <div>
        <label htmlFor={`${id}-name`} className={labelClass}>
          Name on Card
        </label>
        <input
          id={`${id}-name`}
          type="text"
          placeholder="Full Name"
          value={values.nameOnCard}
          onChange={(e) => update("nameOnCard", e.target.value)}
          onBlur={handleBlur("nameOnCard")}
          autoComplete="cc-name"
          aria-invalid={!!err("nameOnCard")}
          className={cn(inputClass, err("nameOnCard") ? inputErrorClass : inputNormalClass)}
        />
        {err("nameOnCard") ? (
          <FieldError className="mt-1 text-xs text-red-400" errors={[{ message: err("nameOnCard") }]} />
        ) : null}
      </div>

      {/* Expiration + CVV row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor={`${id}-exp`} className={labelClass}>
            Expiration
          </label>
          <IMaskInput
            id={`${id}-exp`}
            mask="00/00"
            placeholder="MM/YY"
            value={values.cardExpiration}
            onAccept={(value) => update("cardExpiration", String(value))}
            onBlur={handleBlur("cardExpiration")}
            autoComplete="cc-exp"
            inputMode="numeric"
            aria-invalid={!!err("cardExpiration")}
            className={cn(inputClass, err("cardExpiration") ? inputErrorClass : inputNormalClass)}
          />
          {err("cardExpiration") ? (
            <FieldError className="mt-1 text-xs text-red-400" errors={[{ message: err("cardExpiration") }]} />
          ) : null}
        </div>
        <div>
          <label htmlFor={`${id}-cvv`} className={labelClass}>
            Security Code
          </label>
          <IMaskInput
            id={`${id}-cvv`}
            mask={brand === "american-express" ? "0000" : "000"}
            placeholder={brand === "american-express" ? "0000" : "000"}
            value={values.cvv}
            onAccept={(value) => update("cvv", String(value))}
            onFocus={() => setCvvFocused(true)}
            onBlur={handleBlur("cvv")}
            autoComplete="cc-csc"
            inputMode="numeric"
            aria-invalid={!!err("cvv")}
            className={cn(inputClass, err("cvv") ? inputErrorClass : inputNormalClass)}
          />
          {err("cvv") ? (
            <FieldError className="mt-1 text-xs text-red-400" errors={[{ message: err("cvv") }]} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
