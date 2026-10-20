"use client"

import { cn } from "@core/lib/utils"
import { Input } from "@core/components/ui/input"
import { LEK_PER_EUR } from "@core/lib/currency"

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  currency: "LEK" | "EUR"
  onCurrencyChange: (currency: "LEK" | "EUR") => void
  placeholder?: string
  className?: string
}

export function CurrencyInput({
  value,
  onChange,
  currency,
  onCurrencyChange,
  placeholder = "0",
  className,
}: CurrencyInputProps) {
  return (
    <div className={cn("flex gap-2", className)}>
      <div className="flex rounded-lg border border-input overflow-hidden shrink-0">
        <button
          type="button"
          onClick={() => onCurrencyChange("LEK")}
          className={cn(
            "px-3 py-2 text-xs font-semibold transition-colors",
            currency === "LEK"
              ? "bg-accent text-accent-foreground"
              : "bg-background text-muted-foreground hover:bg-secondary"
          )}
        >
          LEK
        </button>
        <button
          type="button"
          onClick={() => onCurrencyChange("EUR")}
          className={cn(
            "px-3 py-2 text-xs font-semibold transition-colors",
            currency === "EUR"
              ? "bg-accent text-accent-foreground"
              : "bg-background text-muted-foreground hover:bg-secondary"
          )}
        >
          EUR
        </button>
      </div>
      <Input
        type="number"
        step={currency === "EUR" ? "0.01" : "1"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
    </div>
  )
}

/** Parse and convert to LEK using the current live exchange rate. */
export function toStoredLek(value: string, currency: "LEK" | "EUR"): number {
  const parsed = parseFloat(value)
  if (isNaN(parsed) || parsed <= 0) return 0
  return currency === "EUR" ? Math.round(parsed * LEK_PER_EUR) : Math.round(parsed)
}
