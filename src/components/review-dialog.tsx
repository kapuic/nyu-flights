import { type FormEvent, useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { ArrowRight, Star } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useIsMobile } from "@/hooks/use-mobile"
import type { CustomerFlight } from "@/lib/queries"
import { submitReviewFn } from "@/lib/queries"
import { getErrorMessage } from "@/lib/utils"

type ReviewDialogProps = {
  flight: CustomerFlight | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

function StarRating({
  onChange,
  value,
}: {
  onChange: (rating: number) => void
  value: number
}) {
  const [hovered, setHovered] = useState(0)

  return (
    <div className="flex gap-1" onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="rounded-sm p-0.5 transition-colors hover:bg-muted"
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`size-7 transition-colors ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ReviewFormContent({
  flight,
  onClose,
}: {
  flight: CustomerFlight
  onClose: () => void
}) {
  const router = useRouter()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError("Please select a rating.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      await submitReviewFn({
        data: {
          airlineName: flight.airlineName,
          comment,
          departureDatetime: flight.departureDatetime,
          flightNumber: flight.flightNumber,
          rating,
        },
      })
      await router.invalidate()
      toast.success("Review submitted!")
      onClose()
    } catch (err) {
      setError(getErrorMessage(err, "Failed to submit review."))
    } finally {
      setSubmitting(false)
    }
  }

  const departureDate = new Date(flight.departureDatetime)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {flight.departureAirportCode}
        </span>
        <ArrowRight className="size-3.5" />
        <span className="font-medium text-foreground">
          {flight.arrivalAirportCode}
        </span>
        <span className="mx-1">·</span>
        <span>Flight {flight.flightNumber}</span>
        <span className="mx-1">·</span>
        <span>
          {departureDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Rate your experience</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="review-comment">Share details (optional)</Label>
        <Textarea
          id="review-comment"
          placeholder="Tell us about the service, comfort, and punctuality…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          className="min-h-24 resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {comment.length}/500 characters
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || rating === 0}>
          {submitting ? "Submitting…" : "Submit Review"}
        </Button>
      </div>
    </form>
  )
}

export function ReviewDialog({
  flight,
  onOpenChange,
  open,
}: ReviewDialogProps) {
  const isMobile = useIsMobile()

  function handleClose() {
    onOpenChange(false)
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Review Flight</DrawerTitle>
            <DrawerDescription>
              How was your experience?
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            {flight && (
              <ReviewFormContent flight={flight} onClose={handleClose} />
            )}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Flight</DialogTitle>
          <DialogDescription>
            How was your experience?
          </DialogDescription>
        </DialogHeader>
        {flight && (
          <ReviewFormContent flight={flight} onClose={handleClose} />
        )}
      </DialogContent>
    </Dialog>
  )
}
