"use client"

import { cn } from '@core/lib/utils'

type StatusType =
  | 'planifikuar'
  | 'ne_pritje'
  | 'ne_trajtim'
  | 'perfunduar'
  | 'anuluar'
  | 'paguar'
  | 'pjeserisht'
  | 'papaguar'
  | 'aktiv'
  | 'joaktiv'
  | 'ne_proces'
  | 'derguar'
  | 'deshtuar'
  | 'new'
  | 'returning'
  | 'kryer'
  | 'humbur'
  | 'mungoi'

interface StatusBadgeProps {
  status: StatusType
  className?: string
  type?: string
}

const statusConfig: Record<StatusType, { label: string; chipClass: string; dotClass: string }> = {
  planifikuar: { label: 'Planifikuar', chipClass: 'chip-blue',    dotClass: 'dot-blue'    },
  ne_pritje:   { label: 'Në Pritje',   chipClass: 'chip-amber',   dotClass: 'dot-amber'   },
  ne_trajtim:  { label: 'Në Trajtim',  chipClass: 'chip-sky',     dotClass: 'dot-sky'     },
  perfunduar:  { label: 'Përfunduar',  chipClass: 'chip-green',   dotClass: 'dot-green'   },
  anuluar:     { label: 'Anuluar',     chipClass: 'chip-red',     dotClass: 'dot-red'     },
  paguar:      { label: 'Paguar',      chipClass: 'chip-green',   dotClass: 'dot-green'   },
  pjeserisht:  { label: 'Pjesërisht',  chipClass: 'chip-amber',   dotClass: 'dot-amber'   },
  papaguar:    { label: 'Papaguar',    chipClass: 'chip-red',     dotClass: 'dot-red'     },
  aktiv:       { label: 'Aktiv',       chipClass: 'chip-green',   dotClass: 'dot-green'   },
  joaktiv:     { label: 'Joaktiv',     chipClass: 'chip-neutral', dotClass: 'dot-neutral' },
  ne_proces:   { label: 'Në Proces',   chipClass: 'chip-blue',    dotClass: 'dot-blue'    },
  derguar:     { label: 'Dërguar',     chipClass: 'chip-green',   dotClass: 'dot-green'   },
  deshtuar:    { label: 'Dështuar',    chipClass: 'chip-red',     dotClass: 'dot-red'     },
  new:         { label: 'I Ri',        chipClass: 'chip-sky',     dotClass: 'dot-sky'     },
  returning:   { label: 'Rikthyes',    chipClass: 'chip-neutral', dotClass: 'dot-neutral' },
  kryer:       { label: 'Kryer',       chipClass: 'chip-green',   dotClass: 'dot-green'   },
  humbur:      { label: 'Humbur',      chipClass: 'chip-red',     dotClass: 'dot-red'     },
  mungoi:      { label: 'Mungoi',      chipClass: 'chip-red',     dotClass: 'dot-red'     },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, chipClass: 'chip-neutral', dotClass: 'dot-neutral' }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        config.chipClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', config.dotClass)} />
      {config.label}
    </span>
  )
}
