'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import { PriceCheck } from '@/lib/types'
import { loadPriceChecks, savePriceCheck, getHistoryForBarcode } from '@/lib/priceCheck'
import { compressImage, formatJPY, today } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

type View = 'scan' | 'result' | 'history'

interface ApiProduct {
  found: boolean
  productName?: string
  minPrice?: number
}

// BarcodeDetector is not in default TS lib
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BarcodeDetectorAPI = typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined

export default function BarcodePage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectorRef = useRef<any>(null)
  const ocrInputRef = useRef<HTMLInputElement>(null)
  const priceInputRef = useRef<HTMLInputElement>(null)

  const [view, setView] = useState<View>('scan')
  const [cameraSupported, setCameraSupported] = useState(true)
  const [manualBarcode, setManualBarcode] = useState('')

  const [scannedBarcode, setScannedBarcode] = useState('')
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [productNameInput, setProductNameInput] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [storeName, setStoreName] = useState('')
  const [history, setHistory] = useState<PriceCheck[]>([])
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [allChecks, setAllChecks] = useState<PriceCheck[]>([])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const handleBarcode = useCallback(async (barcode: string) => {
    stopCamera()
    setScannedBarcode(barcode)
    setCurrentPrice('')
    setStoreName('')
    setProductNameInput('')
    setLoadingProduct(true)
    setView('result')
    setHistory(getHistoryForBarcode(barcode))

    try {
      const res = await fetch(`/api/barcode?barcode=${encodeURIComponent(barcode)}`)
      const data: ApiProduct = await res.json()
      setProduct(data)
      setProductNameInput(data.productName ?? '')
    } catch {
      setProduct({ found: false })
    } finally {
      setLoadingProduct(false)
    }
  }, [stopCamera])

  const startCamera = useCallback(async () => {
    if (!BarcodeDetectorAPI) { setCameraSupported(false); return }

    try {
      detectorRef.current = new BarcodeDetectorAPI({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      })
    } catch { setCameraSupported(false); return }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const scan = async () => {
        const video = videoRef.current
        if (!video || video.readyState < 2) { rafRef.current = requestAnimationFrame(scan); return }
        try {
          const results = await detectorRef.current.detect(video)
          if (results.length > 0) { handleBarcode(results[0].rawValue); return }
        } catch {}
        rafRef.current = requestAnimationFrame(scan)
      }
      rafRef.current = requestAnimationFrame(scan)
    } catch { setCameraSupported(false) }
  }, [handleBarcode])

  useEffect(() => {
    if (view === 'scan') startCamera()
    else stopCamera()
    return () => stopCamera()
  }, [view, startCamera, stopCamera])

  useEffect(() => {
    if (view === 'history') setAllChecks(loadPriceChecks())
  }, [view])

  async function handleOcrPhoto(file: File) {
    setOcrLoading(true)
    try {
      const { base64, mimeType } = await compressImage(file, 800, 0.75)
      const res = await fetch('/api/ocr-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })
      const data = await res.json()
      if (data.text) {
        setProductNameInput(data.text)
        setTimeout(() => priceInputRef.current?.focus(), 100)
      }
    } catch {}
    finally {
      setOcrLoading(false)
    }
  }

  async function handleSave(purchased: boolean) {
    if (!currentPrice || !storeName) return
    setSaving(true)

    let lat: number | undefined
    let lng: number | undefined
    let mapsUrl: string | undefined

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      )
      lat = pos.coords.latitude
      lng = pos.coords.longitude
      mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
    } catch {}

    const pc: PriceCheck = {
      id: uuidv4(),
      barcode: scannedBarcode,
      productName: productNameInput || scannedBarcode,
      price: parseInt(currentPrice) || 0,
      storeName,
      lat,
      lng,
      mapsUrl,
      date: today(),
      createdAt: new Date().toISOString(),
      purchased,
    }

    savePriceCheck(pc)
    setSaving(false)
    setView('scan')
  }

  const toggleHistory = () => setView(v => v === 'history' ? 'scan' : 'history')

  return (
    <PageShell title="條碼比價" action={
      <button onClick={toggleHistory} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
        {view === 'history' ? (
          /* barcode icon */
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" d="M3 3h3v18H3zM8 3h1v18H8zM12 3h2v18h-2zM16 3h1v18h-1zM19 3h2v18h-2z" />
          </svg>
        ) : (
          /* list icon */
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <line x1="8" y1="6" x2="21" y2="6" strokeLinecap="round" />
            <line x1="8" y1="12" x2="21" y2="12" strokeLinecap="round" />
            <line x1="8" y1="18" x2="21" y2="18" strokeLinecap="round" />
            <line x1="3" y1="6" x2="3.01" y2="6" strokeLinecap="round" strokeWidth={2.5} />
            <line x1="3" y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth={2.5} />
          </svg>
        )}
      </button>
    }>

      {/* ── Scan view ── */}
      {view === 'scan' && (
        <div className="flex flex-col gap-5 px-4 pt-4">
          {cameraSupported ? (
            <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-36 w-64">
                  <div className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-white" />
                  <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-white" />
                  <div className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-white" />
                  <div className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-white" />
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-4 text-center">
                <p className="text-sm font-medium text-white drop-shadow">將條碼對準框內</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-2xl bg-gray-50 p-8 text-center">
              <p className="text-4xl">📷</p>
              <p className="mt-2 text-sm font-medium text-gray-600">此裝置不支援自動掃描</p>
              <p className="mt-1 text-xs text-gray-400">請手動輸入條碼號碼</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-semibold text-gray-500">手動輸入條碼</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && manualBarcode.trim()) handleBarcode(manualBarcode.trim()) }}
                placeholder="例：4901085616161"
                className="input flex-1"
              />
              <button
                onClick={() => { if (manualBarcode.trim()) handleBarcode(manualBarcode.trim()) }}
                disabled={!manualBarcode.trim()}
                className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition active:scale-95"
              >
                查詢
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Result view ── */}
      {view === 'result' && (
        <div className="space-y-4 px-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <p className="font-mono text-xs text-gray-400">{scannedBarcode}</p>
            {loadingProduct ? (
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-gray-500" />
                查詢商品中…
              </div>
            ) : (
              <div className="mt-2">
                <label className="label">品名</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={productNameInput}
                    onChange={e => setProductNameInput(e.target.value)}
                    placeholder="輸入或拍照辨識品名"
                    className="input flex-1"
                  />
                  <button
                    onClick={() => ocrInputRef.current?.click()}
                    disabled={ocrLoading}
                    title="拍照辨識品名"
                    className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-lg transition hover:bg-gray-50 active:scale-95 disabled:opacity-40"
                  >
                    {ocrLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                    ) : '📷'}
                  </button>
                </div>
                <input
                  ref={ocrInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleOcrPhoto(f)
                    e.target.value = ''
                  }}
                />
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
            <p className="text-sm font-semibold text-gray-700">現場資訊</p>
            <div>
              <label className="label">店名</label>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                placeholder="例：ドン・キホーテ" className="input" />
            </div>
            <div>
              <label className="label">現場售價（JPY）</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input
                  ref={priceInputRef}
                  type="number"
                  inputMode="numeric"
                  value={currentPrice}
                  onChange={e => setCurrentPrice(e.target.value)}
                  placeholder="0"
                  className="input pl-7"
                />
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <p className="px-4 pt-4 text-sm font-semibold text-gray-700">過去紀錄</p>
              <div className="mt-2 divide-y divide-gray-50">
                {history.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-800">{h.storeName}</p>
                        {i === 0 && (
                          <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">最低</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{h.date} · {h.purchased ? '已購買' : '未購買'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-semibold ${i === 0 ? 'text-green-700' : 'text-gray-800'}`}>
                        {formatJPY(h.price)}
                      </p>
                      {h.mapsUrl && (
                        <a href={h.mapsUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700">
                          地圖 →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => handleSave(false)} disabled={!currentPrice || !storeName || saving}
              className="flex-1 rounded-2xl border-2 border-red-600 py-3.5 font-semibold text-red-600 disabled:opacity-40 hover:bg-red-50 transition active:scale-95">
              📌 記錄
            </button>
            <button onClick={() => handleSave(true)} disabled={!currentPrice || !storeName || saving}
              className="flex-1 rounded-2xl bg-red-600 py-3.5 font-semibold text-white disabled:opacity-40 hover:bg-red-700 transition active:scale-95">
              🛒 購買
            </button>
          </div>

          <button onClick={() => setView('scan')}
            className="w-full rounded-xl py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition">
            ← 重新掃描
          </button>
        </div>
      )}

      {/* ── History view ── */}
      {view === 'history' && (
        <div className="space-y-3 px-4">
          {allChecks.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <p className="text-4xl">🏷️</p>
              <p className="mt-3 text-gray-500">還沒有掃描紀錄</p>
            </div>
          ) : (
            allChecks.map(pc => (
              <div key={pc.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight text-gray-800">{pc.productName}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{pc.storeName} · {pc.date}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-300">{pc.barcode}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-gray-900">{formatJPY(pc.price)}</p>
                    {pc.purchased && <p className="text-xs font-medium text-green-600">已購買</p>}
                  </div>
                </div>
                {pc.mapsUrl && (
                  <a href={pc.mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700">
                    📍 在 Google Maps 查看
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </PageShell>
  )
}
