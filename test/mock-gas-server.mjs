// Local stand-in for the deployed Apps Script web app, for `npm run dev`.
// Runs the real Code.gs (via gas-sim) and mimics Google's behaviour of
// answering a POST with a 302 to a second URL that returns the JSON.
// Sent emails are written to test/outbox.json for inspection.
import http from 'node:http'
import { writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createGas } from './gas-sim.mjs'

const PORT = 8790
const gas = createGas({
  props: {
    SHARED_SECRET: 'local-test-secret-not-for-production',
    SITE_URL: 'http://127.0.0.1:8788',
    MOCKUP_URL: process.env.MOCKUP_URL || '',
  },
})
const pending = new Map()

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
    if (req.method === 'POST' && url.pathname === '/exec') {
      let body = ''
      req.on('data', (c) => (body += c))
      req.on('end', () => {
        const out = JSON.stringify(gas.post(JSON.parse(body)))
        const id = randomUUID()
        pending.set(id, out)
        writeFileSync(new URL('./outbox.json', import.meta.url), JSON.stringify({ rows: gas.rows(), outbox: gas.outbox }, null, 2))
        res.writeHead(302, { location: `http://127.0.0.1:${PORT}/echo?id=${id}` }).end()
      })
      return
    }
    if (req.method === 'GET' && url.pathname === '/echo' && pending.has(url.searchParams.get('id'))) {
      const out = pending.get(url.searchParams.get('id'))
      pending.delete(url.searchParams.get('id'))
      res.writeHead(200, { 'content-type': 'application/json' }).end(out)
      return
    }
    res.writeHead(404).end()
  })
  .listen(PORT, '127.0.0.1', () => console.log(`mock Apps Script on http://127.0.0.1:${PORT}/exec`))
