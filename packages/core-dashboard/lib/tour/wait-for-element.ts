// Polls for a selector to exist in the DOM — needed because a tour step can
// point at an element on a route the user isn't currently on (TourOverlay
// calls router.push() first), and Next.js needs a render tick or two after
// navigation before that route's own elements actually mount. Resolves with
// null on timeout instead of throwing, so a step whose target genuinely
// never shows up (a slow data fetch, a role that doesn't have that button)
// degrades to a centered card rather than freezing the tour.
//
// `skipInitialCheck` matters a lot more than it looks: several steps in a
// row share the exact same selector (`[data-tour="page-header"]`, since it's
// the generic per-page anchor — see steps.ts). Right after calling
// router.push() for the next step, the *previous* page's own page-header is
// still mounted for at least one more tick — so the naive synchronous
// `querySelector` fast path below would immediately "find" that stale,
// about-to-be-torn-down element instead of waiting for the real one on the
// new page. That stale element then gets removed from the document a moment
// later, and getBoundingClientRect() on a detached node returns all zeros —
// which is exactly why nearly every page-to-page step was rendering its
// spotlight pinned to the top-left corner instead of the real target.
// Callers pass `skipInitialCheck: true` whenever this waitForElement call
// follows a router.push(), so it only ever accepts a match that shows up
// *after* the navigation actually starts changing the DOM.
export function waitForElement(
  selector: string,
  timeoutMs = 2500,
  opts: { skipInitialCheck?: boolean } = {},
): Promise<HTMLElement | null> {
  // isConnected guards both paths below against ever resolving with a node
  // that's already been (or is being) removed from the document.
  const query = () => {
    const el = document.querySelector<HTMLElement>(selector)
    return el && el.isConnected ? el : null
  }

  if (!opts.skipInitialCheck) {
    const existing = query()
    if (existing) return Promise.resolve(existing)
  }

  return new Promise((resolve) => {
    const started = performance.now()
    const observer = new MutationObserver(() => {
      const el = query()
      if (el) {
        observer.disconnect()
        resolve(el)
      } else if (performance.now() - started > timeoutMs) {
        observer.disconnect()
        resolve(null)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    // Belt-and-suspenders timeout in case nothing mutates at all after the
    // navigation (e.g. the target was already absent and stays absent).
    setTimeout(() => {
      observer.disconnect()
      resolve(query())
    }, timeoutMs)
  })
}
