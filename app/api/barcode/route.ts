import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')
  const debug = req.nextUrl.searchParams.get('debug') === '1'
  const appId = process.env.RAKUTEN_APP_ID

  if (!barcode) return Response.json({ error: 'barcode required' }, { status: 400 })
  if (!appId) return Response.json({ error: 'API not configured' }, { status: 500 })

  // Try Product Search API first (supports janCode exact match)
  const productUrl = new URL('https://app.rakuten.co.jp/services/api/Product/Search/20170426')
  productUrl.searchParams.set('applicationId', appId)
  productUrl.searchParams.set('janCode', barcode)
  productUrl.searchParams.set('formatVersion', '2')

  let productStatus = 0
  let productBody: unknown = null

  try {
    const res = await fetch(productUrl.toString(), { cache: 'no-store' })
    productStatus = res.status
    productBody = await res.json()
    if (res.ok) {
      const data = productBody as Record<string, unknown>
      const products: Record<string, unknown>[] = (data.Products as Record<string, unknown>[]) ?? []
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
  } catch (e) {
    productBody = String(e)
  }

  // Fallback: keyword search via IchibaItem
  const itemUrl = new URL('https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706')
  itemUrl.searchParams.set('applicationId', appId)
  itemUrl.searchParams.set('keyword', barcode)
  itemUrl.searchParams.set('hits', '3')
  itemUrl.searchParams.set('formatVersion', '2')

  let itemStatus = 0
  let itemBody: unknown = null

  try {
    const res = await fetch(itemUrl.toString(), { cache: 'no-store' })
    itemStatus = res.status
    itemBody = await res.json()
    if (res.ok) {
      const data = itemBody as Record<string, unknown>
      const items: Record<string, unknown>[] = (data.Items as Record<string, unknown>[]) ?? []
      if (items.length > 0) {
        const item = items[0]
        return Response.json({
          found: true,
          productName: item.itemName ?? '',
          imageUrl: (item.mediumImageUrls as { imageUrl: string }[])?.[0]?.imageUrl ?? null,
          minPrice: item.itemPrice ?? null,
          ...(debug && { _debug: { productStatus, productBody, itemStatus, itemBody } }),
        })
      }
    }
  } catch (e) {
    itemBody = String(e)
  }

  if (debug) {
    return Response.json({ found: false, _debug: { productStatus, productBody, itemStatus, itemBody } })
  }
  return Response.json({ found: false })
}
