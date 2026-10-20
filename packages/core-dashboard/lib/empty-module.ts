// Stub for Node built-ins (e.g. `fs`) that some dependencies reference but
// never actually call in the browser — Turbopack's resolveAlias points such
// imports here instead of failing to bundle a Node-only module client-side.
export {}
