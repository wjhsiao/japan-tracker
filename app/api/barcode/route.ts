import { NextRequest } from 'next/server'

const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID ?? ''
const ACCESS_CODE = process.env.ACCESS_CODE ?? ''

function unauthorized(req: NextRequest): boolean {
  return !ACCESS_CODE || req.headers.get('x-access-code') !== ACCESS_CODE
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const barcode = req.nextUrl.searchParams.get('barcode')
  if (!barcode) return Response.json({ error: 'barcode required' }, { status: 400 })

  // 1. Rakuten IchibaItem Search — new Bearer / header auth
  if (RAKUTEN_APP_ID) {
    try {
      const rakutenUrl =
        'https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706' +
        `?format=json&keyword=${encodeURIComponent(barcode)}&hits=1&sort=%2BitemPrice`
      const rRes = await fetch(rakutenUrl, {
        headers: {
          Authorization: `Bearer ${RAKUTEN_APP_ID}`,
          'X-Rakuten-Authorization': RAKUTEN_APP_ID,
        },
        next: { revalidate: 3600 },
      })
      if (rRes.ok) {
        const rData = await rRes.json()
        const item = rData.Items?.[0]?.Item
        if (item) {
          return Response.json({
            found: true,
            source: 'rakuten',
            productName: item.itemName as string,
            imageUrl: (item.mediumImageUrls?.[0]?.imageUrl as string) ?? null,
            minPrice: item.itemPrice as number,
          })
        }
      }
    } catch (e) { console.error('[barcode] rakuten:', e) }
  }

  // 2. Open Food Facts v2 fallback
  try {
    const offUrl =
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`
    const oRes = await fetch(offUrl, {
      headers: { 'User-Agent': 'JapanTracker/1.0 (https://japan-tracker-iota.vercel.app)' },
      next: { revalidate: 86400 },
    })
    if (oRes.ok) {
      const oData = await oRes.json()
      if (oData.status === 1 && oData.product) {
        const p = oData.product
        const productName: string =
          p.product_name_ja || p.product_name || p.brands || ''
        if (productName) {
          return Response.json({
            found: true,
            source: 'openfoodfacts',
            productName,
            imageUrl: (p.image_url as string) ?? null,
            minPrice: null,
          })
        }
      }
    }
  } catch (e) { console.error('[barcode] openfoodfacts:', e) }

  // 3. Nothing found
  return Response.json({ found: false, source: 'none', productName: null, minPrice: null })
}
