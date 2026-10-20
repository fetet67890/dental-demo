// Lightweight liveness probe for Docker/reverse-proxy healthchecks — deliberately
// does no DB/API call of its own (that's the `api` service's own /api/health to
// answer for); this only confirms the Next.js server itself is up and serving.
export async function GET() {
  return Response.json({ status: 'ok' })
}
