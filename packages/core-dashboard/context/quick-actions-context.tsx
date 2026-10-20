"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

export type QuickDialogType = 'pacient' | 'takim' | 'staf' | 'sherbim' | 'recete' | null

interface QuickActionsContextType {
  activeDialog: QuickDialogType
  openDialog: (type: QuickDialogType) => void
  closeDialog: () => void
}

const QuickActionsContext = createContext<QuickActionsContextType>({
  activeDialog: null,
  openDialog: () => {},
  closeDialog: () => {},
})

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<QuickDialogType>(null)
  return (
    <QuickActionsContext.Provider value={{
      activeDialog,
      openDialog: setActiveDialog,
      closeDialog: () => setActiveDialog(null),
    }}>
      {children}
    </QuickActionsContext.Provider>
  )
}

export function useQuickActions() {
  return useContext(QuickActionsContext)
}
