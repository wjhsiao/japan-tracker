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

// ─── helpers ────────────────────────────────────────────────────────────────

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME)
    sheet.appendRow([
      'id', 'date', 'storeName', 'storeNameJa', 'items',
      'amountJPY', 'category', 'paymentMethod', 'paidBy', 'notes',
      'receiptBase64', 'createdAt'
    ])
    sheet.setFrozenRows(1)
  }
  return sheet
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
    sheet.appendRow([
      ex.id, ex.date, ex.storeName, ex.storeNameJa,
      JSON.stringify(ex.items || []),
      ex.amountJPY, ex.category, ex.paymentMethod,
      ex.paidBy, ex.notes || '', ex.receiptBase64 || '',
      ex.createdAt
    ])
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
        sheet.getRange(i + 1, 1, 1, 12).setValues([[
          ex.id, ex.date, ex.storeName, ex.storeNameJa,
          JSON.stringify(ex.items || []),
          ex.amountJPY, ex.category, ex.paymentMethod,
          ex.paidBy, ex.notes || '', ex.receiptBase64 || '',
          ex.createdAt
        ]])
        return jsonResponse({ ok: true })
      }
    }
    return jsonResponse({ error: 'Not found' })
  }

  return jsonResponse({ error: 'Unknown action' })
}
