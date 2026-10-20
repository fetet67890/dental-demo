import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@core/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5',
        destructive:
          'bg-destructive text-white shadow-md hover:bg-destructive/90 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
        outline:
          'border-2 border-border bg-background hover:bg-secondary hover:border-accent hover:text-accent transition-colors',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md',
        ghost:
          'hover:bg-secondary hover:text-foreground rounded-xl',
        link: 'text-accent underline-offset-4 hover:underline font-medium',
        accent: 'bg-accent text-accent-foreground shadow-md hover:bg-accent/90 hover:shadow-lg hover:-translate-y-0.5',
      },
      size: {
        default: 'h-11 px-6 py-2.5',
        sm: 'h-9 rounded-xl gap-1.5 px-4 text-xs',
        lg: 'h-12 rounded-2xl px-8 text-base',
        xl: 'h-14 rounded-2xl px-10 text-lg',
        icon: 'size-11 rounded-xl',
        'icon-sm': 'size-9 rounded-xl',
        'icon-lg': 'size-12 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
