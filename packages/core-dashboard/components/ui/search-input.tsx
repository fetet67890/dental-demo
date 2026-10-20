"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@core/components/ui/input"
import { cn } from "@core/lib/utils"

// Every list/section page across the dashboard used to hand-roll its own
// icon + <Input> pair for search, and they'd drifted from each other over
// time: different background (bg-card / plain / none), different radius
// and height (the plain default rounded-md h-9 vs. the topbar's own
// polished rounded-xl h-10), different left padding (pl-9 vs. pl-10), most
// missing `type="search"` entirely. This is the one version now — matches
// the topbar's own global search exactly (components/layout/topbar.tsx) —
// every list page's search bar renders through this instead of its own
// copy, so there's structurally only one look to keep consistent, not ~20.
export interface SearchInputProps extends Omit<React.ComponentProps<typeof Input>, "type"> {
  containerClassName?: string
}

export function SearchInput({ className, containerClassName, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="search"
        className={cn("pl-9 bg-secondary/50 border-0 rounded-xl h-10 text-sm", className)}
        {...props}
      />
    </div>
  )
}
