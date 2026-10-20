'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { CheckIcon } from 'lucide-react'

import { cn } from '@core/lib/utils'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // bg-accent, not the shadcn-default bg-primary: --primary is a fixed,
        // unthemed navy (see globals.css) that the color-preset system in
        // Aparenca never touches — only --accent moves with the selected
        // preset. Left as primary, a checked box stayed the same dark navy
        // regardless of theme, clashing with every other accent-colored
        // control on the page (buttons, the Tabs thumb, Switch, etc).
        'peer border-input dark:bg-input/30 data-[state=checked]:bg-accent data-[state=checked]:text-accent-foreground dark:data-[state=checked]:bg-accent data-[state=checked]:border-accent focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
