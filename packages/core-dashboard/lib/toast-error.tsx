"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'

function ExpandableError({ title, detail }: { title: string; detail: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium leading-snug">{title}</p>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex items-center gap-1 text-xs underline underline-offset-2 w-fit opacity-70 hover:opacity-100 transition-opacity"
      >
        <ChevronDown className={`h-3 w-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        {open ? 'Fshih detajet' : 'Shiko detajet'}
      </button>
      {open && (
        <code className="block text-[11px] font-mono bg-black/10 dark:bg-white/10 rounded-md p-2 break-all leading-relaxed mt-0.5">
          {detail}
        </code>
      )}
    </div>
  )
}

export function toastError(
  err: unknown,
  friendlyMessage = 'Nuk u krye veprimi. Provoni përsëri.'
) {
  const rawMsg =
    err instanceof Error ? err.message :
    typeof err === 'string' ? err :
    null

  if (!rawMsg || rawMsg === friendlyMessage) {
    toast.error(friendlyMessage)
    return
  }

  // Sonner accepts ReactNode as the first argument
  toast.error(<ExpandableError title={friendlyMessage} detail={rawMsg} />, { duration: 7000 })
}
