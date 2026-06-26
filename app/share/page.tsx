'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { exportCard } from '@/lib/shareExport'
import PageShell from '../components/layout/PageShell'
import ShareCard from '../components/share/ShareCard'
import { useExpenses } from '@/lib/useExpenses'
import { loadSettings, getActiveTrip, isInTrip } from '@/lib/settings'
import { buildShareData, ShareTheme, ShareFields, DEFAULT_SHARE_FIELDS } from '@/lib/shareData'
import { today, compressImage, daysBetween } from '@/lib/utils'

const WEATHERS = ['☀️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌫️']

const THEMES: { value: ShareTheme; label: string }[] = [
  { value: 'RECURRENT_FEED', label: 'IG 限動' },
  { value: 'NEWSPAPER_CLIP', label: '號外報紙' },
  { value: 'RETRO_ANIME', label: '復古動漫' },
  { value: 'RETRO_POSTCARD', label: '明信片' },
  { value: 'MAGAZINE', label: '雜誌封面' },
  { value: 'TICKET', label: '車票' },
  { value: 'GAME', label: '電玩' },
  { value: 'POLAROID', label: '拍立得' },
]

function ShareInner() {
  const params = useSearchParams()
  const date = params.get('date') || today()
  const { expenses, loading } = useExpenses()
  const settings = loadSettings()
  const cardRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [photoUrl, setPhotoUrl] = useState('')
  const [theme, setTheme] = useState<ShareTheme>('RECURRENT_FEED')
  const [location, setLocation] = useState('日本')
  const [mainCharacter, setMainCharacter] = useState('')
  const [goldSentence, setGoldSentence] = useState('')
  const [exporting, setExporting] = useState(false)
  const [aiNote, setAiNote] = useState('')
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [captionOptions, setCaptionOptions] = useState<string[]>([])

  // Optional info toggles + weather (select emoji + free text)
  const [fields, setFields] = useState<ShareFields>(DEFAULT_SHARE_FIELDS)
  const [weatherOn, setWeatherOn] = useState(false)
  const [weatherCond, setWeatherCond] = useState('☀️')
  const [weatherTemp, setWeatherTemp] = useState('')

  // Restore stable preferences (theme + info toggles + alias). NOT the caption,
  // weather text or photo — those are per-occasion. No real name is auto-filled.
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('japan-tracker:share-prefs') ?? '{}')
      if (p.theme) setTheme(p.theme)
      if (p.fields) setFields(f => ({ ...f, ...p.fields }))
      if (typeof p.weatherOn === 'boolean') setWeatherOn(p.weatherOn)
      if (typeof p.mainCharacter === 'string') setMainCharacter(p.mainCharacter)
    } catch {}
  }, [])

  // Persist those preferences when they change
  useEffect(() => {
    try {
      localStorage.setItem('japan-tracker:share-prefs', JSON.stringify({
        theme,
        fields: {
          showAmount: fields.showAmount,
          showDayNumber: fields.showDayNumber,
          showLocation: fields.showLocation,
          showCount: fields.showCount,
        },
        weatherOn,
        mainCharacter,
      }))
    } catch {}
  }, [theme, fields, weatherOn, mainCharacter])

  // Day-number within the active trip (0 if date is outside the trip)
  const dayNumber = useMemo(() => {
    const trip = getActiveTrip(settings)
    return isInTrip(date, trip) ? daysBetween(trip.startDate, date) + 1 : 0
  }, [settings, date])

  // Compose the weather string and merge into fields
  const effectiveFields: ShareFields = {
    ...fields,
    weather: weatherOn ? `${weatherCond} ${weatherTemp}`.trim() : '',
  }

  function toggleField(k: keyof ShareFields) {
    setFields(prev => ({ ...prev, [k]: !prev[k] }))
  }

  // Revoke object URLs to avoid leaks
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  const data = useMemo(
    () => buildShareData(expenses, date, settings),
    [expenses, date, settings]
  )

  async function pickPhoto(file: File) {
    // Downscale to a data URL: keeps export memory low (camera photos are huge)
    // and inlines the image so html-to-image can embed it reliably.
    try {
      const { base64, mimeType } = await compressImage(file, 1280, 0.85)
      setPhotoUrl(`data:${mimeType};base64,${base64}`)
    } catch {
      setPhotoUrl(URL.createObjectURL(file))
    }
  }

  async function suggestCaption() {
    setGeneratingCaption(true)
    setCaptionOptions([])
    setAiNote('')
    try {
      const dayExpenses = expenses.filter(e => e.date === date)
      const storeNames = [...new Set(dayExpenses.map(e => e.storeName))]
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': settings.accessCode ?? '',
        },
        body: JSON.stringify({
          totalAmountJPY: data.totalAmount,
          topItemName: data.topItemName,
          storeNames,
          location,
          theme,
        }),
      })
      const json = await res.json()
      if (json.captions?.length) {
        setCaptionOptions(json.captions)
      } else {
        setAiNote('生成失敗，請手動輸入 ✍️')
        setTimeout(() => setAiNote(''), 3000)
      }
    } catch {
      setAiNote('生成失敗，請手動輸入 ✍️')
      setTimeout(() => setAiNote(''), 3000)
    } finally {
      setGeneratingCaption(false)
    }
  }

  async function handleExport() {
    if (!cardRef.current || !photoUrl) return
    setExporting(true)
    try {
      await exportCard(cardRef.current, `japan-${date}.png`)
    } catch (err) {
      // user cancelling share throws AbortError — ignore that
      if (!(err instanceof Error && err.name === 'AbortError')) {
        const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
        alert('輸出失敗：' + msg)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 px-4">
      {/* Preview */}
      <ShareCard
        ref={cardRef}
        theme={theme}
        photoUrl={photoUrl}
        data={data}
        fields={effectiveFields}
        dayNumber={dayNumber}
        location={location}
        mainCharacter={mainCharacter}
        goldSentence={goldSentence}
      />

      {loading && <p className="text-center text-xs text-gray-400">載入消費資料中…</p>}

      {/* Photo picker */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) pickPhoto(f) }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full rounded-2xl border-2 border-red-600 py-3 font-semibold text-red-600 hover:bg-red-50 transition active:scale-95"
      >
        {photoUrl ? '🔄 更換照片' : '📷 選擇照片'}
      </button>

      {/* Theme selector */}
      <div>
        <label className="label">主題風格</label>
        <div className="grid grid-cols-4 gap-2">
          {THEMES.map(t => (
            <button key={t.value} type="button" onClick={() => setTheme(t.value)}
              className={`rounded-xl border-2 py-2 text-xs font-semibold transition-all ${
                theme === t.value
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-100 bg-gray-50 text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info toggles */}
      <div>
        <label className="label">顯示資訊<span className="ml-1 text-xs font-normal text-gray-400">金句為主角，其餘可選</span></label>
        <div className="flex flex-wrap gap-2">
          {([
            ['showAmount', '💴 金額'],
            ['showDayNumber', '📅 第幾天'],
            ['showLocation', '📍 地點'],
            ['showCount', '🧾 筆數'],
          ] as [keyof ShareFields, string][]).map(([k, label]) => (
            <button key={k} type="button" onClick={() => toggleField(k)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                fields[k] ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500'
              }`}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setWeatherOn(v => !v)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              weatherOn ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500'
            }`}>
            ☀️ 天氣
          </button>
        </div>
      </div>

      {/* Weather picker (select + input) */}
      {weatherOn && (
        <div>
          <label className="label">天氣</label>
          <div className="flex gap-2">
            <div className="flex gap-1">
              {WEATHERS.map(w => (
                <button key={w} type="button" onClick={() => setWeatherCond(w)}
                  className={`h-10 w-10 rounded-xl border-2 text-lg transition ${
                    weatherCond === w ? 'border-red-500 bg-red-50' : 'border-gray-100 bg-gray-50'
                  }`}>
                  {w}
                </button>
              ))}
            </div>
          </div>
          <input value={weatherTemp} onChange={e => setWeatherTemp(e.target.value)}
            placeholder="溫度，如 26°C（選填）" className="input mt-2" />
        </div>
      )}

      {/* Location (shown when 地點 enabled) */}
      {fields.showLocation && (
        <div>
          <label className="label">地點標籤</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            placeholder="日本 / 岡山 · 廣島" className="input" />
        </div>
      )}

      <div>
        <label className="label">代稱<span className="ml-1 text-xs font-normal text-gray-400">選填，不填用預設（如「特派員」）</span></label>
        <input value={mainCharacter} onChange={e => setMainCharacter(e.target.value)}
          placeholder="旅人、吃貨…（避免放真名）" className="input" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label mb-0">金句</label>
          <button type="button" onClick={suggestCaption} disabled={generatingCaption}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
            {generatingCaption ? '生成中…' : '✨ 幫我想金句'}
          </button>
        </div>
        <textarea value={goldSentence} onChange={e => setGoldSentence(e.target.value)}
          placeholder="今天的心得 / 金句…" rows={2} className="input mt-1.5 resize-none" />
        {aiNote && <p className="mt-1 text-xs text-amber-600">{aiNote}</p>}
        {captionOptions.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {captionOptions.map((c, i) => (
              <button key={i} type="button"
                onClick={() => { setGoldSentence(c); setCaptionOptions([]) }}
                className="w-full rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-left text-sm text-red-800 hover:bg-red-100 transition">
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={!photoUrl || exporting}
        className="w-full rounded-2xl bg-red-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50 active:scale-95"
      >
        {exporting ? '產生中…' : photoUrl ? '📤 輸出 / 分享' : '請先選擇照片'}
      </button>
      <div className="h-2" />
    </div>
  )
}

export default function SharePage() {
  return (
    <PageShell title="製作分享卡片">
      <Suspense fallback={<div className="p-8 text-center text-sm text-gray-400">載入中…</div>}>
        <ShareInner />
      </Suspense>
    </PageShell>
  )
}
