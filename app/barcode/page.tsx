'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import PageShell from '../components/layout/PageShell'
import { PriceCheck } from '@/lib/types'
import { loadPriceChecks, savePriceCheck, updatePriceCheck, deletePriceCheck, getHistoryForBarcode } from '@/lib/priceCheck'
import { compressImage, formatJPY, today } from '@/lib/utils'
import { loadSettings } from '@/lib/settings'
import { v4 as uuidv4 } from 'uuid'

type View = 'scan' | 'result' | 'history' | 'edit'
type GpsState = 'idle' | 'loading' | 'ok' | 'error'

interface ApiProduct {
  found: boolean
  productName?: string
  minPrice?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BarcodeDetectorAPI = typeof window !== 'undefined' ? (window as any).BarcodeDetector : undefined

function buildMapsUrl(storeName: string, lat?: number, lng?: number): string {
  const q = encodeURIComponent(storeName)
  return lat !== undefined && lng !== undefined
    ? `https://www.google.com/maps/search/${q}/@${lat},${lng},17z`
    : `https://www.google.com/maps/search/${q}`
}

export default function BarcodePage() {
  // camera
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

  // result view
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [productNameInput, setProductNameInput] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [storeName, setStoreName] = useState('')
  const [history, setHistory] = useState<PriceCheck[]>([])
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // GPS (result view)
  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)

  // history + edit
  const [allChecks, setAllChecks] = useState<PriceCheck[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [editingRecord, setEditingRecord] = useState<PriceCheck | null>(null)
  const [editProductName, setEditProductName] = useState('')
  const [editStoreName, setEditStoreName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editPurchased, setEditPurchased] = useState(false)
  const [editMapsUrl, setEditMapsUrl] = useState('')
  const [editLat, setEditLat] = useState<number | undefined>(undefined)
  const [editLng, setEditLng] = useState<number | undefined>(undefined)
  const [editLocationInput, setEditLocationInput] = useState('')
  const [editGpsState, setEditGpsState] = useState<GpsState>('idle')
  const [editDeleteConfirm, setEditDeleteConfirm] = useState(false)

  // ── camera ──
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
    setGpsState('idle')
    setGpsCoords(null)
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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

  // ── GPS helpers ──
  function retryGps() {
    setGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsState('ok')
      },
      () => setGpsState('error'),
      { timeout: 10000 },
    )
  }

  function retryGpsForEdit() {
    setEditGpsState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setEditLat(lat)
        setEditLng(lng)
        setEditMapsUrl(buildMapsUrl(editStoreName, lat, lng))
        setEditGpsState('ok')
      },
      () => setEditGpsState('error'),
      { timeout: 10000 },
    )
  }

  // ── OCR ──
  async function handleOcrPhoto(file: File) {
    setOcrLoading(true)
    try {
      const { base64, mimeType } = await compressImage(file, 800, 0.75)
      const { accessCode } = loadSettings()
      const res = await fetch('/api/ocr-label', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessCode ? { 'x-access-code': accessCode } : {}),
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })
      const data = await res.json()
      if (data.text) {
        setProductNameInput(data.text)
        setTimeout(() => priceInputRef.current?.focus(), 100)
      }
    } catch {}
    finally { setOcrLoading(false) }
  }

  // ── Save (result view) ──
  async function handleSave(purchased: boolean) {
    if (!currentPrice || !storeName) return
    setSaving(true)
    const lat = gpsCoords?.lat
    const lng = gpsCoords?.lng
    const pc: PriceCheck = {
      id: uuidv4(),
      barcode: scannedBarcode,
      productName: productNameInput || scannedBarcode,
      price: parseInt(currentPrice) || 0,
      storeName,
      lat,
      lng,
      mapsUrl: lat !== undefined && lng !== undefined
        ? buildMapsUrl(storeName, lat, lng)
        : undefined,
      date: today(),
      createdAt: new Date().toISOString(),
      purchased,
    }
    savePriceCheck(pc)
    setSaving(false)
    setView('scan')
  }

  // ── Edit ──
  function startEdit(pc: PriceCheck) {
    setEditingRecord(pc)
    setEditProductName(pc.productName)
    setEditStoreName(pc.storeName)
    setEditPrice(String(pc.price))
    setEditPurchased(pc.purchased)
    setEditMapsUrl(pc.mapsUrl ?? '')
    setEditLat(pc.lat)
    setEditLng(pc.lng)
    setEditLocationInput('')
    setEditGpsState('idle')
    setEditDeleteConfirm(false)
    setView('edit')
  }

  function applyLocationInput() {
    const input = editLocationInput.trim()
    if (!input) return
    const url = input.startsWith('http')
      ? input
      : buildMapsUrl(input, editLat, editLng)
    setEditMapsUrl(url)
    setEditLocationInput('')
  }

  function handleEditSave() {
    if (!editingRecord) return
    updatePriceCheck(editingRecord.id, {
      ...editingRecord,
      productName: editProductName,
      storeName: editStoreName,
      price: parseInt(editPrice) || 0,
      purchased: editPurchased,
      mapsUrl: editMapsUrl || undefined,
      lat: editLat,
      lng: editLng,
    })
    setAllChecks(loadPriceChecks())
    setView('history')
  }

  const canSave = !!currentPrice && !!storeName && !saving && gpsState !== 'loading'
  const toggleHistory = () => setView(v => (v === 'history' || v === 'edit') ? 'scan' : 'history')

  return (
    <PageShell title="條碼比價" action={
      <button onClick={toggleHistory} className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
        {view === 'history' || view === 'edit' ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" d="M3 3h3v18H3zM8 3h1v18H8zM12 3h2v18h-2zM16 3h1v18h-1zM19 3h2v18h-2z" />
          </svg>
        ) : (
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

      {/* ── Scan ── */}
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
                type="text" inputMode="numeric" value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && manualBarcode.trim()) handleBarcode(manualBarcode.trim()) }}
                placeholder="例：4901085616161" className="input flex-1"
              />
              <button onClick={() => { if (manualBarcode.trim()) handleBarcode(manualBarcode.trim()) }}
                disabled={!manualBarcode.trim()}
                className="shrink-0 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 transition active:scale-95">
                查詢
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {view === 'result' && (
        <div className="space-y-4 px-4">
          {/* GPS status */}
          <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${
            gpsState === 'ok'      ? 'bg-green-50 text-green-700' :
            gpsState === 'error'   ? 'bg-red-50 text-red-600' :
            gpsState === 'loading' ? 'bg-gray-50 text-gray-500' :
            'bg-gray-50 text-gray-400'
          }`}>
            {gpsState === 'idle' && (
              <>
                <span className="flex-1 text-xs">不含位置</span>
                <button onClick={retryGps} className="text-xs font-semibold text-blue-500 underline underline-offset-2">📍 抓位置</button>
              </>
            )}
            {gpsState === 'loading' && (
              <>
                <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                <span>正在取得位置…</span>
              </>
            )}
            {gpsState === 'ok' && <span>✅ 位置已取得</span>}
            {gpsState === 'error' && (
              <>
                <span className="flex-1">❌ 無法取得位置</span>
                <button onClick={retryGps} className="font-semibold underline underline-offset-2">重試</button>
              </>
            )}
          </div>

          {/* Product name */}
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
                  <input type="text" value={productNameInput}
                    onChange={e => setProductNameInput(e.target.value)}
                    placeholder="輸入或拍照辨識品名" className="input flex-1" />
                  <button onClick={() => ocrInputRef.current?.click()} disabled={ocrLoading}
                    title="拍照辨識品名"
                    className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-lg transition hover:bg-gray-50 active:scale-95 disabled:opacity-40">
                    {ocrLoading
                      ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      : '📷'}
                  </button>
                </div>
                <input ref={ocrInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleOcrPhoto(f); e.target.value = '' }} />
              </div>
            )}
          </div>

          {/* Store + price */}
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
                <input ref={priceInputRef} type="number" inputMode="numeric"
                  value={currentPrice} onChange={e => setCurrentPrice(e.target.value)}
                  placeholder="0" className="input pl-7" />
              </div>
            </div>
          </div>

          {/* Past records */}
          {history.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
              <p className="px-4 pt-4 text-sm font-semibold text-gray-700">過去紀錄</p>
              <div className="mt-2 divide-y divide-gray-50">
                {history.map((h, i) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-800">{h.storeName}</p>
                        {i === 0 && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">最低</span>}
                      </div>
                      <p className="text-xs text-gray-400">{h.date} · {h.purchased ? '已購買' : '未購買'}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`font-semibold ${i === 0 ? 'text-green-700' : 'text-gray-800'}`}>{formatJPY(h.price)}</p>
                      {h.mapsUrl && (
                        <a href={h.mapsUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700">地圖 →</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => handleSave(false)} disabled={!canSave}
              className="flex-1 rounded-2xl border-2 border-red-600 py-3.5 font-semibold text-red-600 disabled:opacity-40 hover:bg-red-50 transition active:scale-95">
              📌 記錄
            </button>
            <button onClick={() => handleSave(true)} disabled={!canSave}
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

      {/* ── History ── */}
      {view === 'history' && (
        <div className="flex flex-col gap-3 px-4">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜尋品名或條碼"
              className="input w-full pr-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>

          {allChecks.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <p className="text-4xl">🏷️</p>
              <p className="mt-3 text-gray-500">還沒有掃描紀錄</p>
            </div>
          ) : (() => {
            const lowerQ = searchQuery.toLowerCase()
            const grouped = new Map<string, PriceCheck[]>()
            for (const pc of allChecks) {
              if (lowerQ && !pc.barcode.toLowerCase().includes(lowerQ) && !pc.productName.toLowerCase().includes(lowerQ)) continue
              const arr = grouped.get(pc.barcode) ?? []
              arr.push(pc)
              grouped.set(pc.barcode, arr)
            }
            for (const [, arr] of grouped) arr.sort((a, b) => a.price - b.price)

            if (grouped.size === 0) {
              return (
                <div className="flex flex-col items-center py-16 text-center">
                  <p className="text-2xl">🔍</p>
                  <p className="mt-2 text-sm text-gray-500">找不到符合的紀錄</p>
                </div>
              )
            }

            return Array.from(grouped.entries()).map(([barcode, records]) => {
              const displayName = records.find(r => r.productName !== barcode)?.productName ?? barcode
              return (
                <div key={barcode} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
                  <div className="px-4 pt-4 pb-2">
                    <p className="text-sm font-semibold text-gray-800 leading-tight">{displayName}</p>
                    {displayName !== barcode && (
                      <p className="font-mono text-xs text-gray-300 mt-0.5">{barcode}</p>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    {records.map((pc, i) => (
                      <div key={pc.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{pc.storeName}</p>
                          <p className="text-xs text-gray-400">{pc.date}{pc.purchased ? ' · 已購買' : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {i === 0 && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">最低</span>
                          )}
                          <p className={`font-semibold text-sm ${i === 0 ? 'text-green-700' : 'text-gray-800'}`}>
                            {formatJPY(pc.price)}
                          </p>
                          {pc.mapsUrl && (
                            <a href={pc.mapsUrl} target="_blank" rel="noopener noreferrer"
                              className="text-base leading-none">📍</a>
                          )}
                          <button onClick={() => startEdit(pc)}
                            className="text-xs font-medium text-gray-400 hover:text-gray-700 transition">
                            編輯
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* ── Edit ── */}
      {view === 'edit' && editingRecord && (
        <div className="space-y-4 px-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
            <p className="font-mono text-xs text-gray-400">{editingRecord.barcode}</p>
            <div>
              <label className="label">品名</label>
              <input type="text" value={editProductName}
                onChange={e => setEditProductName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">店名</label>
              <input type="text" value={editStoreName}
                onChange={e => setEditStoreName(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">售價（JPY）</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                <input type="number" inputMode="numeric" value={editPrice}
                  onChange={e => setEditPrice(e.target.value)} className="input pl-7" />
              </div>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-sm font-medium text-gray-700">已購買</span>
              <button onClick={() => setEditPurchased(v => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors ${editPurchased ? 'bg-red-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editPurchased ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Location editor */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
            <p className="text-sm font-semibold text-gray-700">位置</p>
            {editMapsUrl
              ? <a href={editMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700">
                  📍 查看目前位置 →
                </a>
              : <p className="text-sm text-gray-400">無位置資訊</p>}

            <button onClick={retryGpsForEdit} disabled={editGpsState === 'loading'}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition active:scale-95">
              {editGpsState === 'loading' ? '📍 取得中…' :
               editGpsState === 'ok' ? '✅ 位置已更新' :
               editGpsState === 'error' ? '❌ 失敗，再試一次' :
               '📍 重新抓 GPS 更新位置'}
            </button>

            <div>
              <label className="label">貼上 Maps 連結或輸入地址</label>
              <div className="flex gap-2">
                <input type="text" value={editLocationInput}
                  onChange={e => setEditLocationInput(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... 或店名地址"
                  className="input flex-1 text-sm" />
                <button onClick={applyLocationInput} disabled={!editLocationInput.trim()}
                  className="shrink-0 rounded-xl bg-gray-100 px-3 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-40 hover:bg-gray-200 transition active:scale-95">
                  套用
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setView('history')}
              className="flex-1 rounded-2xl border-2 border-gray-200 py-3.5 font-semibold text-gray-600 hover:bg-gray-50 transition active:scale-95">
              取消
            </button>
            <button onClick={handleEditSave}
              className="flex-1 rounded-2xl bg-red-600 py-3.5 font-semibold text-white hover:bg-red-700 transition active:scale-95">
              儲存
            </button>
          </div>

          {!editDeleteConfirm ? (
            <button onClick={() => setEditDeleteConfirm(true)}
              className="w-full rounded-xl py-3 text-sm font-medium text-gray-400 hover:text-red-500 transition">
              刪除此筆記錄
            </button>
          ) : (
            <div className="flex gap-3">
              <button onClick={() => setEditDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition">
                取消
              </button>
              <button onClick={() => {
                if (!editingRecord) return
                deletePriceCheck(editingRecord.id)
                setAllChecks(loadPriceChecks())
                setView('history')
              }}
                className="flex-1 rounded-xl bg-red-100 py-3 text-sm font-semibold text-red-600 hover:bg-red-200 transition active:scale-95">
                確認刪除
              </button>
            </div>
          )}
        </div>
      )}
    </PageShell>
  )
}
