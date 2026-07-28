import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')
  const appId = process.env.RAKUTEN_APP_ID

  if (!barcode) return Response.json({ error: 'barcode required' }, { status: 400 })
  if (!appId) return Response.json({ error: 'API not configured' }, { status: 500 })

  const url = new URL('https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706')
  url.searchParams.set('applicationId', appId)
  url.searchParams.set('keyword', barcode)
  url.searchParams.set('hits', '3')
  url.searchParams.set('formatVersion', '2')

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 3600 } })
    if (!res.ok) return Response.json({ found: false })

    const data = await res.json()
    const items: Record<string, unknown>[] = data.Items ?? []
    if (items.length === 0) return Response.json({ found: false })

    const item = items[0]
    return Response.json({
      found: true,
      productName: item.itemName ?? '',
      imageUrl: (item.mediumImageUrls as { imageUrl: string }[])?.[0]?.imageUrl ?? null,
      minPrice: item.itemPrice ?? null,
      shopName: item.shopName ?? '',
    })
  } catch {
    return Response.json({ found: false })
  }
}
