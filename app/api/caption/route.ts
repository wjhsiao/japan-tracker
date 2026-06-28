import { NextRequest } from 'next/server'
import { fetchWithTimeout } from '@/lib/utils'

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

const THEME_TONES: Record<string, string> = {
  RECURRENT_FEED: '活潑的 IG 限動風格，口語化，可以加 emoji，像朋友在說話',
  NEWSPAPER_CLIP: '誇張的新聞號外風格，戲劇感強，像聳動標題',
  RETRO_ANIME: '熱血動漫台詞風格，像主角說的話，充滿氣勢',
  RETRO_POSTCARD: '詩意懷舊的明信片風格，優美溫柔，適合留念',
  MAGAZINE: '時尚雜誌封面風格，簡潔有力，有質感，不囉嗦',
  TICKET: '旅途移動感，像旅途上的感悟，有意境',
  GAME: 'RPG 電玩風格，用遊戲術語，幽默帶點自嘲',
  POLAROID: '溫暖記憶感，像寫在照片背面的字，珍貴而簡短',
}

export async function POST(req: NextRequest) {
  const accessCode = process.env.ACCESS_CODE
  if (!accessCode || req.headers.get('x-access-code') !== accessCode) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
  }

  let body: { totalAmountJPY: number; topItemName: string; storeNames: string[]; location: string; theme: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { totalAmountJPY, topItemName, storeNames, location, theme } = body
  const tone = THEME_TONES[theme] ?? '有個性的旅遊風格'
  const safeStoreNames = Array.isArray(storeNames) ? storeNames : []

  const prompt = `你是日本旅遊分享卡片的金句生成器。根據以下消費資訊，產生 3 句不同風格的金句（繁體中文，每句 15–30 字）。

資訊：
- 地點：${location || '日本'}
- 今日總消費：¥${totalAmountJPY}
- 花最多的：${topItemName || '美食'}
- 消費店家：${safeStoreNames.join('、') || '無'}

風格：${tone}

請直接輸出 3 句，每句獨立一行，不要編號、不要解釋、不要多餘文字。`

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    },
  }

  try {
    const res = await fetchWithTimeout(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }, 15000)

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `Gemini error: ${err}` }, { status: 502 })
    }

    const data = await res.json()
    const parts: Array<{ thought?: boolean; text?: string }> =
      data.candidates?.[0]?.content?.parts ?? []
    const text: string = [
      ...parts.filter(p => !p.thought && typeof p.text === 'string'),
      ...parts.filter(p =>  p.thought && typeof p.text === 'string'),
    ].map(p => p.text).join('\n')

    const captions = text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3)

    return Response.json({ captions })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
