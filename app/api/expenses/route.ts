import { NextRequest } from 'next/server'
import { fetchWithTimeout } from '@/lib/utils'

// GAS URL: readable from both server and client (NEXT_PUBLIC_ prefix)
const GAS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? ''

// Secret token: server-side only. Injected into every GAS request so Apps Script
// can verify the caller (machine-to-machine secret).
const GAS_TOKEN = process.env.GAS_SECRET_TOKEN ?? ''

// Access code: human-entered secret, sent by the client as x-access-code header.
const ACCESS_CODE = process.env.ACCESS_CODE ?? ''

/** Reject if an access code is configured but the request doesn't match. */
function unauthorized(req: NextRequest): boolean {
  return !!ACCESS_CODE && req.headers.get('x-access-code') !== ACCESS_CODE
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!GAS_URL) {
    return Response.json([], { status: 200 })
  }
  try {
    // Inject GAS token so doGet can verify (prevents direct GAS URL scraping)
    const url = `${GAS_URL}?token=${encodeURIComponent(GAS_TOKEN)}`
    const res = await fetchWithTimeout(url, { cache: 'no-store', redirect: 'follow' })
    const data = await res.json()
    return Response.json(Array.isArray(data) ? data : [])
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!GAS_URL) {
    return Response.json({ error: 'NEXT_PUBLIC_APPS_SCRIPT_URL not configured' }, { status: 500 })
  }
  try {
    const body = await req.json()
    // Attach the GAS secret token — Apps Script verifies this before writing
    const payload = { ...body, token: GAS_TOKEN }
    const res = await fetchWithTimeout(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    })
    const data = await res.json()
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }
}
