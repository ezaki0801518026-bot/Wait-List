// Runs the real apps-script/Code.gs in Node against in-memory stand-ins for
// SpreadsheetApp, PropertiesService, LockService, MailApp and ContentService.
// Used by the unit tests and by the local mock server.
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const CODE = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8')

export function createGas({ props = {}, quota = 100, failMail = false } = {}) {
  const sheets = new Map()
  const summaryFiles = new Map() // other spreadsheets opened by ID
  const outbox = []
  const appended = [] // exactly what Code.gs passed to appendRow
  const triggers = []
  const store = { ...props }
  let mailQuota = quota

  const makeSheet = () => {
    const rows = []
    return {
      rows,
      appendRow: (values) => {
        appended.push(values)
        // Sheets keeps a leading apostrophe as a "store as text" marker and
        // does not return it from getValues().
        rows.push(values.map((v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v)))
      },
      setFrozenRows: () => {},
      getLastRow: () => rows.length,
      getLastColumn: () => Math.max(0, ...rows.map((r) => r.length)),
      clearContents: () => {
        rows.length = 0
      },
      getRange: (row, col, numRows = 1, numCols = 1) => ({
        getValues: () =>
          rows.slice(row - 1, row - 1 + numRows).map((r) => {
            const out = r.slice(col - 1, col - 1 + numCols)
            while (out.length < numCols) out.push('')
            return out
          }),
        setValue: (v) => {
          rows[row - 1][col - 1] = v
        },
        setValues: (values) => {
          values.forEach((vals, i) => {
            const r = rows[row - 1 + i] || (rows[row - 1 + i] = [])
            vals.forEach((v, j) => {
              r[col - 1 + j] = v
            })
          })
        },
      }),
    }
  }

  const makeBook = (map) => ({
    getSheetByName: (n) => map.get(n) || null,
    insertSheet: (n) => {
      const s = makeSheet()
      map.set(n, s)
      return s
    },
  })

  const context = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => makeBook(sheets),
      openById: (id) => {
        if (!summaryFiles.has(id)) summaryFiles.set(id, new Map())
        return makeBook(summaryFiles.get(id))
      },
      flush: () => {},
    },
    Utilities: {
      // Only the patterns Code.gs uses, in a fixed UTC+9 (Asia/Tokyo).
      formatDate: (d, tz, pattern) => {
        const j = new Date(d.getTime() + 9 * 3600 * 1000).toISOString()
        return pattern === 'yyyy-MM' ? j.slice(0, 7) : `${j.slice(0, 10)} ${j.slice(11, 16)}`
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in store ? store[k] : null),
        setProperty: (k, v) => {
          store[k] = String(v)
        },
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    MailApp: {
      getRemainingDailyQuota: () => mailQuota,
      sendEmail: (m) => {
        if (failMail) throw new Error('mail failed')
        mailQuota--
        outbox.push(m)
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => ({ content: s, setMimeType() { return this } }),
    },
    ScriptApp: {
      getProjectTriggers: () => triggers,
      newTrigger: (fn) => ({
        timeBased: () => {
          const create = () => triggers.push({ getHandlerFunction: () => fn })
          return {
            everyHours: () => ({ create }),
            onMonthDay: () => ({ atHour: () => ({ create }) }),
          }
        },
      }),
    },
    Date,
    JSON,
    String,
    Number,
  }
  vm.createContext(context)
  vm.runInContext(CODE, context)

  return {
    post(body) {
      const out = context.doPost({ postData: { contents: JSON.stringify(body) } })
      return JSON.parse(out.content)
    },
    run: (fn) => context[fn](),
    rows: () => sheets.get('Waitlist')?.rows ?? [],
    // Pre-create the Waitlist sheet with given rows (e.g. an older header).
    seed: (rows) => {
      const s = makeSheet()
      rows.forEach((r) => s.rows.push([...r]))
      sheets.set('Waitlist', s)
    },
    summary: (id, name) => summaryFiles.get(id)?.get(name)?.rows ?? null,
    outbox,
    appended,
    triggers,
    props: store,
    setQuota: (q) => {
      mailQuota = q
    },
  }
}
