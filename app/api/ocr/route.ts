import { NextRequest } from 'next/server'
import { fetchWithTimeout } from '@/lib/utils'
import { CATEGORIES, PAYMENT_METHODS, Category, PaymentMethod, OcrResult } from '@/lib/types'

const CATEGORY_VALUES = CATEGORIES.map(c => c.value)

/** Coerce Gemini's raw output into a safe OcrResult; never trust the model blindly. */
function sanitizeOcr(raw: unknown): OcrResult {
  const r = (raw ?? {}) as Record<string, unknown>
  const amount = Math.round(Number(r.amountJPY))
  const cat = r.category as Category
  const pay = r.paymentMethod as PaymentMethod
  const dateStr = typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)
    ? r.date
    : new Date().toISOString().slice(0, 10)
  return {
    storeName: typeof r.storeName === 'string' ? r.storeName : '',
    storeNameJa: typeof r.storeNameJa === 'string' ? r.storeNameJa : '',
    items: Array.isArray(r.items) ? r.items : [],
    amountJPY: Number.isFinite(amount) && amount > 0 ? amount : 0,
    taxBreakdown: Array.isArray(r.taxBreakdown) ? r.taxBreakdown : [],
    category: CATEGORY_VALUES.includes(cat) ? cat : '其他',
    paymentMethod: PAYMENT_METHODS.includes(pay) ? pay : '現金',
    date: dateStr,
  }
}

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent'

const SYSTEM_PROMPT = `You are a Japanese receipt OCR assistant. Analyze this receipt image and extract information.

Return ONLY valid JSON — no markdown, no code blocks, no explanation.

Schema:
{
  "storeName": "store name translated to Traditional Chinese",
  "storeNameJa": "store name in Japanese exactly as printed",
  "items": [
    {
      "nameTw": "item name in Traditional Chinese",
      "nameJa": "item name in Japanese exactly as printed",
      "price": <number, price including tax if 内税>,
      "taxType": "内税" | "外税" | "免税",
      "taxRate": 8 | 10 | null
    }
  ],
  "amountJPY": <total amount paid, integer>,
  "taxBreakdown": [
    { "rate": 8, "taxable": <amount>, "tax": <tax amount> },
    { "rate": 10, "taxable": <amount>, "tax": <tax amount> }
  ],
  "category": "餐飲" | "交通" | "購物" | "便利商店" | "門票/體驗" | "住宿" | "伴手禮" | "藥品" | "其他",
  "paymentMethod": "現金" | "信用卡" | "Suica" | "PayPay" | "其他",
  "date": "YYYY-MM-DD"
}

Rules:
- amountJPY = total amount the customer paid (合計 or お会計)
- Food/beverages are typically 8% tax (軽減税率), other goods 10%
- If date is missing, use today: ${new Date().toISOString().slice(0, 10)}
- If store name is unclear, use "不明店家"
- taxBreakdown: only include rates that actually appear on the receipt
- category: use 便利商店 for konbini (7-Eleven, FamilyMart, Lawson, etc.)
- All monetary values must be integers (JPY has no decimals)`

// Max base64 length (~1MB encoded ≈ 750KB raw image). Compressed images are far smaller.
const MAX_IMAGE_BASE64 = 1_000_000

export async function POST(req: NextRequest) {
  // Access-code gate: protects this paid endpoint from anonymous abuse.
  const accessCode = process.env.ACCESS_CODE
  if (accessCode && req.headers.get('x-access-code') !== accessCode) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  let body: { imageBase64: string; mimeType: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { imageBase64, mimeType } = body
  if (!imageBase64) {
    return Response.json({ error: 'imageBase64 is required' }, { status: 400 })
  }
  if (imageBase64.length > MAX_IMAGE_BASE64) {
    return Response.json({ error: '圖片過大，請重新拍攝' }, { status: 413 })
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  }

  try {
    const res = await fetchWithTimeout(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 20000)

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Gemini API error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return Response.json({ error: '辨識結果格式錯誤，請改用手動輸入' }, { status: 502 })
    }

    return Response.json(sanitizeOcr(parsed))
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
