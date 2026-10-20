"use client"

// Standalone replacement for the tooth-condition slice that used to live
// inside the shared data-context.tsx — extracted out to its own small hook
// instead of forking/extending @hypocrates/core-dashboard's DataProvider
// (which dozens of generic components also depend on) just for this one
// dental-only concern. Same shape/behavior as the original: a module-level
// cache keyed by patient, refreshed on demand.
import { useCallback, useState } from 'react'
import * as toothConditionsApi from '@/lib/api/tooth-conditions'
import type { ToothCondition } from '@/types/specialty'

export function useToothConditions() {
  const [toothConditions, setToothConditions] = useState<ToothCondition[]>([])

  const getToothConditionsByPatient = useCallback((patientId: string) => {
    return toothConditions.filter(c => c.patientId === patientId)
  }, [toothConditions])

  const refreshToothConditions = useCallback(async (patientId: string) => {
    const conds = await toothConditionsApi.getToothConditions(patientId)
    setToothConditions((prev: ToothCondition[]) => {
      const others = prev.filter((c: ToothCondition) => c.patientId !== patientId)
      return [...others, ...conds]
    })
  }, [])

  const upsertToothCondition = useCallback(async (data: { patientId: string; toothNumber: number; condition: ToothCondition['condition']; notes?: string }) => {
    const updated = await toothConditionsApi.upsertToothCondition(data)
    setToothConditions((prev: ToothCondition[]) => {
      const others = prev.filter((c: ToothCondition) => !(c.patientId === data.patientId && c.toothNumber === data.toothNumber))
      return [...others, updated]
    })
    return updated
  }, [])

  return { toothConditions, getToothConditionsByPatient, refreshToothConditions, upsertToothCondition }
}
