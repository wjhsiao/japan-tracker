import { NextRequest } from 'next/server'

const API_KEY = process.env.OCRSPACE_API_KEY ?? ''

export async function POST(req: NextRequest) {
  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64) return Response.json({ error: 'imageBase64 required' }, { status: 400 })

  const params = new URLSearchParams({
    apikey: API_KEY,
    base64Image: `data:${mimeType ?? 'image/jpeg'};base64,${imageBase64}`,
    language: 'jpn',
    OCREngine: '2',
    isOverlayRequired: 'false',
  })

  try {
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    const data = await res.json()
    if (data.IsErroredOnProcessing) return Response.json({ text: '' })

    const raw: string = data.ParsedResults?.[0]?.ParsedText ?? ''
    const text = raw
      .split(/[\r\n]+/)
      .map((l: string) => l.trim())
      .filter((l: string) => l && !/^\d+(\.\d+)?$/.test(l))
      .join(' ')
      .trim()

    return Response.json({ text })
  } catch {
    return Response.json({ text: '' })
  }
}
