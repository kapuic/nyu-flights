import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function GlassInput({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="glass-input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border-0 bg-transparent px-3 text-sm text-white shadow-none outline-none transition-colors placeholder:text-white/30 focus-visible:ring-0 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function GlassInputGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="glass-input-group"
      role="group"
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function GlassInputIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="glass-input-icon"
      className={cn(
        "flex shrink-0 items-center text-white/40 [&_svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { GlassInput, GlassInputGroup, GlassInputIcon }

