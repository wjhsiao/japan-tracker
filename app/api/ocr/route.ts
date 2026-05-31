import { NextRequest } from 'next/server'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

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

export async function POST(req: NextRequest) {
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
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Gemini API error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)

    return Response.json(parsed)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
