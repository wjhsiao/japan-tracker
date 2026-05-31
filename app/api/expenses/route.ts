import { NextRequest } from 'next/server'

// GAS URL: readable from both server and client (NEXT_PUBLIC_ prefix)
const GAS_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ?? ''

// Secret token: server-side only (no NEXT_PUBLIC prefix).
// Injected into every write request so Apps Script can verify the caller.
const GAS_TOKEN = process.env.GAS_SECRET_TOKEN ?? ''

export async function GET() {
  if (!GAS_URL) {
    return Response.json([], { status: 200 })
  }
  try {
    const res = await fetch(GAS_URL, { cache: 'no-store', redirect: 'follow' })
    const data = await res.json()
    return Response.json(Array.isArray(data) ? data : [])
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  if (!GAS_URL) {
    return Response.json({ error: 'NEXT_PUBLIC_APPS_SCRIPT_URL not configured' }, { status: 500 })
  }
  try {
    const body = await req.json()
    // Attach the secret token — Apps Script verifies this before writing
    const payload = { ...body, token: GAS_TOKEN }
    const res = await fetch(GAS_URL, {
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
