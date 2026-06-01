'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toPng } from 'html-to-image'
import PageShell from '../components/layout/PageShell'
import ShareCard from '../components/share/ShareCard'
import { useExpenses } from '@/lib/useExpenses'
import { loadSettings } from '@/lib/settings'
import { buildShareData, ShareTheme } from '@/lib/shareData'
import { today } from '@/lib/utils'

const THEMES: { value: ShareTheme; label: string }[] = [
  { value: 'RECURRENT_FEED', label: 'IG 限動' },
  { value: 'NEWSPAPER_CLIP', label: '號外報紙' },
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

  useEffect(() => {
    setMainCharacter(loadSettings().people[0] ?? '')
  }, [])

  // Revoke object URLs to avoid leaks
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])

  const data = useMemo(
    () => buildShareData(expenses, date, settings),
    [expenses, date, settings]
  )

  function pickPhoto(file: File) {
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl(URL.createObjectURL(file))
  }

  function suggestCaption() {
    // Step 6 (AI 金句) wires to /api/caption once Gemini key is active.
    setAiNote('AI 金句需 Gemini 金鑰啟用後才能使用，目前請手動輸入 ✍️')
    setTimeout(() => setAiNote(''), 4000)
  }

  async function handleExport() {
    if (!cardRef.current || !photoUrl) return
    setExporting(true)
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true })
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], `japan-${date}.png`, { type: 'image/png' })

      const navAny = navigator as Navigator & { canShare?: (d?: ShareData) => boolean }
      if (navAny.canShare && navAny.canShare({ files: [file] } as ShareData)) {
        await navigator.share({ files: [file], title: '日本旅遊消費' })
      } else {
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = file.name
        a.click()
      }
    } catch (err) {
      // user cancelling share throws AbortError — ignore that
      if (!(err instanceof Error && err.name === 'AbortError')) {
        alert('輸出失敗，請再試一次')
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
        <div className="flex gap-2">
          {THEMES.map(t => (
            <button key={t.value} type="button" onClick={() => setTheme(t.value)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-semibold transition-all ${
                theme === t.value
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-100 bg-gray-50 text-gray-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div>
        <label className="label">地點標籤</label>
        <input value={location} onChange={e => setLocation(e.target.value)}
          placeholder="日本 / 岡山 · 廣島" className="input" />
      </div>
      <div>
        <label className="label">主角 / 特派員</label>
        <input value={mainCharacter} onChange={e => setMainCharacter(e.target.value)}
          placeholder="名字" className="input" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="label mb-0">金句</label>
          <button type="button" onClick={suggestCaption}
            className="text-xs font-medium text-red-600 hover:text-red-700">
            ✨ 幫我想金句
          </button>
        </div>
        <textarea value={goldSentence} onChange={e => setGoldSentence(e.target.value)}
          placeholder="今天的心得 / 金句…" rows={2} className="input mt-1.5 resize-none" />
        {aiNote && <p className="mt-1 text-xs text-amber-600">{aiNote}</p>}
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
