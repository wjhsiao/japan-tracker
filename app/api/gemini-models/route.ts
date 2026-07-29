import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const accessCode = process.env.ACCESS_CODE
  if (!accessCode || req.headers.get('x-access-code') !== accessCode) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return Response.json({ error: 'no key' }, { status: 500 })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${apiKey}`
  )
  const data = await res.json()
  const models = (data.models ?? []).map((m: { name: string; displayName?: string; supportedGenerationMethods?: string[] }) => ({
    id: m.name.replace('models/', ''),
    displayName: m.displayName ?? '',
    methods: m.supportedGenerationMethods ?? [],
  }))
  return Response.json(models)
}
