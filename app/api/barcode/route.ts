import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const barcode = req.nextUrl.searchParams.get('barcode')
  if (!barcode) return Response.json({ error: 'barcode required' }, { status: 400 })

  // Try Open Food Facts (free, no key required)
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_ja,brands,image_url`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'JapanTracker/1.0 (https://japan-tracker-iota.vercel.app)' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return Response.json({ found: false })

    const data = await res.json()
    if (data.status !== 1 || !data.product) return Response.json({ found: false })

    const p = data.product
    const productName: string =
      p.product_name_ja || p.product_name || p.brands || ''

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
