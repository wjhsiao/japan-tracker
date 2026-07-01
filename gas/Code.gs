// Google Apps Script — Japan Travel Tracker Database
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// Copy the deployed URL into NEXT_PUBLIC_APPS_SCRIPT_URL in your .env.local
//
// SECURITY: Set TOKEN below to the same value as GAS_SECRET_TOKEN in .env.local.
// All write operations (add / update / delete) require a matching token.
// GET (read) is left open so the Next.js server can fetch data without token.

const SHEET_NAME = 'Expenses'

// ⚠️ Change this to any random secret string.
// Must match GAS_SECRET_TOKEN in your .env.local exactly.
const TOKEN = '2b92988927fb5f98fb97dd1f97f8cce7'

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

// ─── helpers ────────────────────────────────────────────────────────────────

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow([...LEGACY_COLUMNS, ...NEW_COLUMNS])
    sheet.setFrozenRows(1)
    return sheet
  }
  // Self-heal: append any columns missing from an existing sheet's header
  // (e.g. a spreadsheet created before the dual-currency/card feature shipped).
  const lastCol = sheet.getLastColumn()
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
  const missing = NEW_COLUMNS.filter(c => headers.indexOf(c) === -1)
  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing])
  }
  return sheet
}

// Build one sheet row, in the sheet's current header order, from an expense object.
function buildRow(headers, ex) {
  return headers.map(h => {
    if (h === 'items') return JSON.stringify(ex.items || [])
    if (h === 'notes') return ex.notes || ''
    if (h === 'receiptBase64') return ex.receiptBase64 || ''
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
  const sheet = getSheet()
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
  const sheet = getSheet()

  if (action === 'add') {
    const ex = body.expense
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
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
    const headers = data[0]
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === ex.id) {
        sheet.getRange(i + 1, 1, 1, headers.length).setValues([buildRow(headers, ex)])
        return jsonResponse({ ok: true })
      }
    }
    return jsonResponse({ error: 'Not found' })
  }

  return jsonResponse({ error: 'Unknown action' })
}
