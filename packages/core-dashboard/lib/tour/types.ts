import type { UserRole } from '@core/types'

// A tour step is anchored to a real, already-existing piece of UI via a CSS
// selector (`target`) — nothing is built just to be pointed at. Steps with no
// `target` render as a centered card with no spotlight cutout (used for the
// welcome/intro step only). `route` lets a step live on a different page than
// the one before it — TourOverlay navigates there and waits for `target` to
// actually mount before measuring it; see waitForElement.ts.
export interface TourStep {
  id: string
  // Key into messages/<locale>/tour.json, e.g. 'admin.patients'. Resolved as
  // `${key}.title` / `${key}.body` by the overlay.
  key: string
  target?: string
  route?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export type TourRole = UserRole

export interface TourStepGroup {
  role: TourRole
  steps: TourStep[]
}
