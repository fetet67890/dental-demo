"use client"

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Sistemi is now a section inside /admin/profili, not its own page — this
// keeps every old link/bookmark (?section=kursi etc.) landing on the exact
// same nested tab instead of a 404. See components/settings/sistemi-body.tsx.
export default function SistemiRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const sub = searchParams.get('section')
    router.replace(`/admin/profili?section=sistemi${sub ? `&sub=${sub}` : ''}`)
  }, [router, searchParams])

  return null
}
