import { NextRequest } from 'next/server'

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID ?? ''

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')
  if (!barcode) return Response.json({ error: 'barcode required' }, { status: 400 })

  // Try Rakuten IchibaItem Search (returns price data)
  if (RAKUTEN_APP_ID) {
    try {
      const rakutenUrl =
        `https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706` +
        `?format=json&applicationId=${RAKUTEN_APP_ID}` +
        `&keyword=${encodeURIComponent(barcode)}&hits=1`
      const rRes = await fetch(rakutenUrl, { next: { revalidate: 3600 } })
      if (rRes.ok) {
        const rData = await rRes.json()
        const item = rData.Items?.[0]?.Item
        if (item) {
          return Response.json({
            found: true,
            productName: item.itemName as string,
            imageUrl: (item.mediumImageUrls?.[0]?.imageUrl as string) ?? null,
            minPrice: item.itemPrice as number,
          })
        }
      }
    } catch {}
  }

  // Fallback: Open Food Facts (no price data)
  const offUrl = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`
  try {
    const res = await fetch(offUrl, {
      headers: { 'User-Agent': 'JapanTracker/1.0 (https://japan-tracker-iota.vercel.app)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return Response.json({ found: false })

    const data = await res.json()
    if (data.status !== 1 || !data.product) return Response.json({ found: false })

    const p = data.product
    const productName: string = p.product_name_ja || p.product_name || p.brands || ''
    if (!productName) return Response.json({ found: false })

    return Response.json({
      found: true,
      productName,
      imageUrl: (p.image_url as string) ?? null,
      minPrice: null,
    })
  } catch {
    return Response.json({ found: false })
  }
}
