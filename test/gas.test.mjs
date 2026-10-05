import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createGas } from './gas-sim.mjs'

const SECRET = 's3cret-value-for-tests'
const base = (over = {}) => ({
  secret: SECRET,
  name: 'Test Person',
  email: 'person@example.org',
  countryCode: 'GB',
  country: 'United Kingdom',
  affiliation: 'Museum / Gallery',
  lang: 'en',
  newsletter: false,
  consentVersion: 'waitlist-notice-2026-10-05',
  ...over,
})
const gas = (opts = {}) =>
  createGas({ ...opts, props: { SHARED_SECRET: SECRET, SITE_URL: 'https://waitlist.example', ...opts.props } })

test('rejects a wrong or missing secret without touching the sheet', () => {
  const g = gas()
  assert.deepEqual(g.post(base({ secret: 'nope' })), { ok: false, error: 'forbidden' })
  assert.deepEqual(g.post(base({ secret: undefined })), { ok: false, error: 'forbidden' })
  assert.equal(g.rows().length, 0)
})

test('refuses everything when SHARED_SECRET is not configured', () => {
  const g = createGas({ props: {} })
  assert.equal(g.post(base({ secret: '' })).error, 'forbidden')
})

test('appends a row, numbers it and sends an English confirmation', () => {
  const g = gas()
  const r = g.post(base())
  assert.deepEqual(r, { ok: true, status: 'created', position: 1, mockupUrl: null })
  const [header, row] = g.rows()
  assert.equal(header[0], 'No.')
  assert.equal(row[0], 1)
  assert.equal(row[2], 'Test Person')
  assert.equal(row[3], 'person@example.org')
  assert.equal(row[8], 'N')
  assert.equal(row[10], 'sent')
  assert.equal(g.outbox.length, 1)
  const m = g.outbox[0]
  assert.equal(m.to, 'person@example.org')
  assert.equal(m.name, 'WA-Chain')
  assert.match(m.body, /You are user #1 on the waitlist\./)
  assert.match(m.body, /1 November 2026/)
  assert.match(m.body, /only to provide WA-Chain Edu/)
  assert.match(m.body, /https:\/\/waitlist\.example\/privacy\?lang=en/)
  assert.doesNotMatch(m.body, /WA-Chain updates/)
  assert.doesNotMatch(m.body, /mockup/)
})

test('Japanese confirmation with newsletter and mockup link', () => {
  const g = gas({ props: { MOCKUP_URL: 'https://mockup.example/demo' } })
  const r = g.post(base({ lang: 'ja', newsletter: true, name: '山田 花子' }))
  assert.equal(r.mockupUrl, 'https://mockup.example/demo')
  const m = g.outbox[0]
  assert.match(m.subject, /登録が完了しました/)
  assert.match(m.body, /山田 花子 様/)
  assert.match(m.body, /あなたは 1 人目のユーザーです。/)
  assert.match(m.body, /2026年11月1日/)
  assert.match(m.body, /活動報告/)
  assert.match(m.body, /https:\/\/mockup\.example\/demo/)
  assert.match(m.htmlBody, /<a href="https:\/\/mockup\.example\/demo"/)
  assert.equal(g.rows()[1][8], 'Y')
})

test('duplicate email (any letter case) returns the original number and sends nothing', () => {
  const g = gas()
  g.post(base())
  g.post(base({ email: 'second@example.org' }))
  const r = g.post(base({ email: 'PERSON@Example.ORG' }))
  assert.deepEqual(r, { ok: true, status: 'existing', position: 1, mockupUrl: null })
  assert.equal(g.rows().length, 3)
  assert.equal(g.outbox.length, 2)
})

test('numbers never shrink after a row is deleted', () => {
  const g = gas()
  g.post(base({ email: 'a@example.org' }))
  g.post(base({ email: 'b@example.org' }))
  g.rows().splice(2, 1) // owner deletes the second row on request
  assert.equal(g.post(base({ email: 'c@example.org' })).position, 3)
})

test('formula-like input is passed to Sheets as plain text', () => {
  const g = gas()
  g.post(base({ name: '=HYPERLINK("http://evil","x")', email: '+tag@example.org' }))
  const sent = g.appended.at(-1)
  assert.equal(sent[2], `'=HYPERLINK("http://evil","x")`)
  assert.equal(sent[3], "'+tag@example.org")
  assert.equal(g.rows()[1][2], '=HYPERLINK("http://evil","x")') // shown as typed
  // …and the duplicate check still matches the stored address.
  assert.equal(g.post(base({ email: '+TAG@example.org' })).status, 'existing')
})

test('HTML in a name is escaped in the HTML email', () => {
  const g = gas()
  g.post(base({ name: '<img src=x onerror=alert(1)>' }))
  assert.doesNotMatch(g.outbox[0].htmlBody, /<img/)
  assert.match(g.outbox[0].htmlBody, /&lt;img/)
})

test('rejects malformed payloads', () => {
  const g = gas()
  assert.equal(g.post(base({ email: 'not-an-email' })).error, 'bad_request')
  assert.equal(g.post(base({ name: '' })).error, 'bad_request')
  assert.equal(g.post(base({ name: 'x'.repeat(101) })).error, 'bad_request')
  assert.equal(g.rows().length, 0)
})

test('when the Gmail quota is used up, the row is kept as pending and sent later', () => {
  const g = gas({ quota: 0 })
  const r = g.post(base())
  assert.equal(r.status, 'created')
  assert.equal(g.rows()[1][10], 'pending')
  assert.equal(g.outbox.length, 0)
  g.setQuota(100)
  g.run('sendPendingMails')
  assert.equal(g.rows()[1][10], 'sent')
  assert.equal(g.outbox.length, 1)
  assert.match(g.outbox[0].body, /user #1/)
})

test('a failed send is recorded as failed, the registration still succeeds', () => {
  const g = gas({ failMail: true })
  assert.equal(g.post(base()).ok, true)
  assert.equal(g.rows()[1][10], 'failed')
})

test('hourly cap returns busy once reached', () => {
  const g = gas()
  for (let i = 0; i < 60; i++) assert.equal(g.post(base({ email: `u${i}@example.org` })).ok, true)
  assert.deepEqual(g.post(base({ email: 'u60@example.org' })), { ok: false, error: 'busy' })
  // …but a returning address is still answered.
  assert.equal(g.post(base({ email: 'u5@example.org' })).status, 'existing')
})

test('setup creates the sheet and exactly one retry trigger', () => {
  const g = gas()
  g.run('setup')
  g.run('setup')
  assert.equal(g.triggers.length, 1)
  assert.equal(g.rows().length, 1)
})
