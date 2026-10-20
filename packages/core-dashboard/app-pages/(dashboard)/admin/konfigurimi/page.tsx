"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Konfigurimi is now a section inside /admin/profili, not its own page —
// this keeps every old link/bookmark (?section=integrimet etc.) landing on
// the exact same nested tab instead of a 404. See components/settings/konfigurimi-body.tsx.
export default function KonfigurimiRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const sub = searchParams.get('section')
    router.replace(`/admin/profili?section=konfigurimi${sub ? `&sub=${sub}` : ''}`)
  }, [router, searchParams])

  return null
}
