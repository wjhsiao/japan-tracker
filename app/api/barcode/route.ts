import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')
  const appId = process.env.RAKUTEN_APP_ID

  if (!barcode) return Response.json({ error: 'barcode required' }, { status: 400 })
  if (!appId) return Response.json({ error: 'API not configured' }, { status: 500 })

  // Try Product Search API first (supports janCode exact match)
  const productUrl = new URL('https://app.rakuten.co.jp/services/api/Product/Search/20170426')
  productUrl.searchParams.set('applicationId', appId)
  productUrl.searchParams.set('janCode', barcode)
  productUrl.searchParams.set('formatVersion', '2')

  try {
    const res = await fetch(productUrl.toString(), { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const products: Record<string, unknown>[] = data.Products ?? []
      if (products.length > 0) {
        const p = products[0]
        return Response.json({
          found: true,
          productName: p.productName ?? '',
          imageUrl: (p.mediumImageUrl as string) ?? null,
          minPrice: p.minPrice ?? null,
        })
      }
    }
  } catch {}

  // Fallback: keyword search
  const itemUrl = new URL('https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706')
  itemUrl.searchParams.set('applicationId', appId)
  itemUrl.searchParams.set('keyword', barcode)
  itemUrl.searchParams.set('hits', '3')
  itemUrl.searchParams.set('formatVersion', '2')

  try {
    const res = await fetch(itemUrl.toString(), { next: { revalidate: 3600 } })
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
    })
  } catch {
    return Response.json({ found: false })
  }
}
