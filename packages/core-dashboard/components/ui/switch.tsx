'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@core/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Redesigned: the old track had a fully transparent border (`border-
        // transparent`) and a thumb with no shadow of its own, so on a light
        // card — or worse, Aparenca's "Glass" surface style, a translucent
        // background — an unchecked track (bg-input, often a pale tint) could
        // blend almost completely into what's behind it, leaving what looked
        // like a bare floating dot instead of a pill. A real, always-visible
        // border plus a real drop shadow on the thumb means this reads as a
        // switch on any surface, any theme, any color preset — never just a
        // color-matching accident away from disappearing.
        //
        // bg-accent, not bg-primary — see checkbox.tsx's comment; same fixed,
        // unthemed-navy mismatch otherwise.
        'peer inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border shadow-inner transition-colors duration-200 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-accent data-[state=checked]:border-accent',
        'data-[state=unchecked]:bg-input data-[state=unchecked]:border-border dark:data-[state=unchecked]:bg-input/80',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          // Symmetric 2px rest margin on both sides now (translate-x-0.5
          // unchecked to match checked's own calc(100%-2px) inset) — the old
          // translate-x-0 sat the thumb flush against the unchecked-left
          // edge, a lopsided rest position that looked subtly off next to
          // the checked state's 2px gap on the right.
          'pointer-events-none block size-5 rounded-full ring-0 transition-transform duration-200 ease-out',
          'bg-background shadow-[0_1px_3px_rgba(0,0,0,0.3),0_1px_2px_rgba(0,0,0,0.15)]',
          'dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-accent-foreground',
          'data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
