import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ClassValue } from "clsx"

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback

  const parsedMessage = parseErrorMessage(error.message)
  return parsedMessage ?? fallback
}

function parseErrorMessage(message: string) {
  if (!message || message === "[object Object]") return null

  try {
    const parsed = JSON.parse(message)
    if (Array.isArray(parsed)) {
      const messages = parsed
        .map((entry) => extractMessage(entry))
        .filter((entry): entry is string => Boolean(entry))

      return messages.length > 0 ? messages.join(" ") : null
    }

    return extractMessage(parsed) ?? message
  } catch {
    return message
  }
}

function extractMessage(value: unknown) {
  if (typeof value === "string") return value
  if (!value || typeof value !== "object" || !("message" in value)) return null

  const message = value.message
  return typeof message === "string" && message.length > 0 ? message : null
}
