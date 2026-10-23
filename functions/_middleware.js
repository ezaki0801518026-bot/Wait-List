// One address for the early access list: https://early.wa-chain.org
//
// The Cloudflare Pages project also answers at its own pages.dev address,
// which LinkedIn and some mail filters block. Requests to that production
// address are sent, with a permanent redirect, to the same path on
// early.wa-chain.org. Branch previews (<branch>.wa-chain-edu-waitlist.pages.dev)
// are left alone.
//
// Merge this only after early.wa-chain.org shows "Active" under the project's
// Custom domains, and after the Turnstile widget lists early.wa-chain.org as
// an allowed hostname (otherwise the form cannot be sent from the new address).

const CANONICAL = 'https://early.wa-chain.org'
const OLD_HOST = 'wa-chain-edu-waitlist.pages.dev'

export async function onRequest({ request, next }) {
  const url = new URL(request.url)
  if (url.hostname === OLD_HOST) {
    // 308 keeps a POST a POST (a form left open on the old address); pages get 301.
    const status = request.method === 'GET' || request.method === 'HEAD' ? 301 : 308
    return Response.redirect(`${CANONICAL}${url.pathname}${url.search}`, status)
  }
  return next()
}
