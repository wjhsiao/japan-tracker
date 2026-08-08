// Google Apps Script — Japan Travel Tracker Database
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// Copy the deployed URL into NEXT_PUBLIC_APPS_SCRIPT_URL in your .env.local
//
// SECURITY: TOKEN is stored in GAS Script Properties (not hardcoded).
// Set GAS_SECRET_TOKEN in: GAS 後台 → 專案設定 → 指令碼屬性
// Must match GAS_SECRET_TOKEN in Vercel environment variables.

const SHEET_NAME = 'Expenses'

// Read token from Script Properties — never hardcode secrets in source code.
const TOKEN = PropertiesService.getScriptProperties().getProperty('GAS_SECRET_TOKEN') || ''

const LEGACY_COLUMNS = [
  'id', 'date', 'storeName', 'storeNameJa', 'items',
  'amountJPY', 'category', 'paymentMethod', 'paidBy', 'notes',
  'receiptBase64', 'createdAt'
]

// Dual-currency + credit-card fields (added later) — appended to any
// pre-existing sheet's header on first access so old spreadsheets self-heal.
const NEW_COLUMNS = [
  'inputAmount', 'inputCurrency', 'exchangeRateUsed', 'baseAmountTWD',
  'cardId', 'cardFeeRate', 'cardCashbackRate', 'totalBaseAmountTWD'
]

const NUMERIC_COLUMNS = [
  'inputAmount', 'exchangeRateUsed', 'baseAmountTWD',
  'cardFeeRate', 'cardCashbackRate', 'totalBaseAmountTWD'
]

const KNOWN_COLUMNS = [...LEGACY_COLUMNS, ...NEW_COLUMNS]

// ─── helpers ────────────────────────────────────────────────────────────────

// Returns { sheet, headers } so callers don't need a second getRange() just for headers.
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    const headers = [...LEGACY_COLUMNS, ...NEW_COLUMNS]
    sheet.appendRow(headers)
    sheet.setFrozenRows(1)
    return { sheet, headers }
  }
  // Self-heal: append any columns missing from an existing sheet's header
  // (e.g. a spreadsheet created before the dual-currency/card feature shipped).
  const lastCol = sheet.getLastColumn()
  let headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
  const missing = NEW_COLUMNS.filter(c => headers.indexOf(c) === -1)
  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing])
    headers = [...headers, ...missing]
  }
  return { sheet, headers }
}

// Build one sheet row, in the sheet's current header order, from an expense object.
// `existingRow` (the row's current values, for updates) is passed through unchanged
// for any header this app doesn't recognize — e.g. a column the user added by hand
// directly in Google Sheets — so we never blank data we don't know about.
function buildRow(headers, ex, existingRow) {
  return headers.map((h, i) => {
    if (h === 'items') return JSON.stringify(ex.items || [])
    if (h === 'notes') return ex.notes || ''
    if (h === 'receiptBase64') return ex.receiptBase64 || ''
    if (KNOWN_COLUMNS.indexOf(h) === -1) return existingRow ? existingRow[i] : ''
    const v = ex[h]
    return (v === undefined || v === null) ? '' : v
  })
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}

function verifyToken(body) {
  return body && body.token === TOKEN
}

// ─── GET — return all expenses (no token required for reads) ─────────────────

function doGet(e) {
  // Require token for reads too — prevents anyone with the public URL from
  // scraping all expense data.
  if (!e || !e.parameter || e.parameter.token !== TOKEN) {
    return jsonResponse({ error: 'Unauthorized' })
  }
  const { sheet } = getSheet()
  const data = sheet.getDataRange().getValues()
  const headers = data[0]
  const rows = data.slice(1).map(row => {
    const obj = {}
    headers.forEach((h, i) => {
      if (h === 'items') {
        try { obj[h] = JSON.parse(row[i] || '[]') } catch { obj[h] = [] }
      } else if (h === 'amountJPY') {
        obj[h] = Number(row[i]) || 0
      } else if (NUMERIC_COLUMNS.indexOf(h) !== -1) {
        // These are optional (e.g. no card selected, or a pre-feature legacy row) —
        // leave undefined rather than coercing a blank cell to a misleading 0.
        obj[h] = row[i] === '' || row[i] == null ? undefined : Number(row[i]) || 0
      } else if (h === 'date') {
        // Sheets may store the date as a Date object — format to YYYY-MM-DD
        obj[h] = (Object.prototype.toString.call(row[i]) === '[object Date]')
          ? Utilities.formatDate(row[i], Session.getScriptTimeZone(), 'yyyy-MM-dd')
          : String(row[i]).slice(0, 10)
      } else {
        obj[h] = row[i]
      }
    })
    return obj
  }).filter(r => r.id)

  return jsonResponse(rows)
}

// ─── POST — add / update / delete (token required) ───────────────────────────

function doPost(e) {
  let body
  try {
    body = JSON.parse(e.postData.contents)
  } catch {
    return jsonResponse({ error: 'Invalid JSON' })
  }

  // Token verification — reject writes without a valid token
  if (!verifyToken(body)) {
    return jsonResponse({ error: 'Unauthorized' })
  }

  const { action } = body
  const { sheet, headers } = getSheet()

  if (action === 'add') {
    const ex = body.expense
    sheet.appendRow(buildRow(headers, ex))
    return jsonResponse({ ok: true })
  }

  if (action === 'delete') {
    const data = sheet.getDataRange().getValues()
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === body.id) {
        sheet.deleteRow(i + 1)
        return jsonResponse({ ok: true })
      }
    }
    return jsonResponse({ error: 'Not found' })
  }

  if (action === 'update') {
    const ex = body.expense
    const data = sheet.getDataRange().getValues()
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === ex.id) {
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(headers, ex, data[i])])
        return jsonResponse({ ok: true })
      }
    }
    return jsonResponse({ error: 'Not found' })
  }

  return jsonResponse({ error: 'Unknown action' })
}
