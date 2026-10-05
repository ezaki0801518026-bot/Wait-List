// GET /api/config — public settings the page needs at load time.
// Only the Turnstile site key, which is public by design.
export function onRequestGet({ env }) {
  return Response.json(
    { turnstileSiteKey: env.TURNSTILE_SITE_KEY || null },
    { headers: { 'cache-control': 'no-store' } },
  )
}
