import { Suspense } from 'react'
import { ActivateForm } from './activate-form'

// useSearchParams() (for ?token=...) needs a Suspense boundary around any
// client component that calls it, or the build opts the whole route into a
// CSR-only bailout — kept at this thin server wrapper instead of inside
// activate-form.tsx so that file can stay a plain "use client" component.
export default function ActivatePage() {
  return (
    <Suspense fallback={null}>
      <ActivateForm />
    </Suspense>
  )
}
