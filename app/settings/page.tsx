'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '../components/layout/PageShell'
import { loadSettings, saveSettings } from '@/lib/settings'
import { Trip } from '@/lib/types'
import { today } from '@/lib/utils'

export default function SettingsPage() {
  const router = useRouter()
  const [s, setS] = useState(loadSettings())
  const [saved, setSaved] = useState(false)
  const [newPerson, setNewPerson] = useState('')
  const [rateText, setRateText] = useState(String(s.exchangeRateJPYtoTWD))

  function update<K extends keyof typeof s>(k: K, v: typeof s[K]) {
    setS(prev => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  /* ── Trips ── */
  function updateTrip(id: string, patch: Partial<Trip>) {
    setS(prev => ({ ...prev, trips: prev.trips.map(t => t.id === id ? { ...t, ...patch } : t) }))
    setSaved(false)
  }
  function addTrip() {
    const id = 'trip-' + Date.now()
    const last = s.trips[s.trips.length - 1]
    setS(prev => ({
      ...prev,
      trips: [...prev.trips, { id, name: '新旅程', startDate: last?.startDate ?? today(), tripDays: 5, budgetJPY: 100000 }],
      activeTripId: id,
    }))
    setSaved(false)
  }
  function removeTrip(id: string) {
    if (s.trips.length <= 1) return
    if (!confirm('刪除這個旅程？（消費紀錄不會被刪除，只是不再歸於此旅程）')) return
    setS(prev => {
      const trips = prev.trips.filter(t => t.id !== id)
      const activeTripId = prev.activeTripId === id ? trips[0].id : prev.activeTripId
      return { ...prev, trips, activeTripId }
    })
    setSaved(false)
  }

  function addPerson() {
    const name = newPerson.trim()
    if (!name || s.people.includes(name)) return
    update('people', [...s.people, name])
    setNewPerson('')
  }
  function removePerson(name: string) {
    if (s.people.length <= 1) return
    update('people', s.people.filter(p => p !== name))
  }
  function renamePerson(idx: number, val: string) {
    const updated = [...s.people]
    updated[idx] = val
    update('people', updated)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const exchangeRateJPYtoTWD = Math.max(0.001, parseFloat(rateText) || 0.001)
    const trips = s.trips.map(t => ({
      ...t,
      name: t.name.trim() || '旅程',
      tripDays: Math.min(60, Math.max(1, t.tripDays || 1)),
      budgetJPY: Math.max(0, t.budgetJPY || 0),
    }))
    const final = { ...s, exchangeRateJPYtoTWD, trips }
    setS(final)
    setRateText(String(exchangeRateJPYtoTWD))
    saveSettings(final)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <PageShell title="設定">
      <form onSubmit={handleSave} className="space-y-5 px-4">

        {/* Trips */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">🧳 旅程</h2>
          <p className="text-xs text-gray-400 -mt-2">
            每個旅程用日期範圍區隔，總覽 / 紀錄 / 統計只顯示「目前旅程」範圍內的消費。
          </p>

          {s.trips.map(t => {
            const active = t.id === s.activeTripId
            return (
              <div key={t.id} className={`rounded-xl border-2 p-3 space-y-3 ${active ? 'border-red-300 bg-red-50/40' : 'border-gray-100'}`}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => update('activeTripId', t.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                      active ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {active ? '● 目前' : '設為目前'}
                  </button>
                  <input value={t.name} onChange={e => updateTrip(t.id, { name: e.target.value })}
                    placeholder="旅程名稱" className="input flex-1" />
                  {s.trips.length > 1 && (
                    <button type="button" onClick={() => removeTrip(t.id)}
                      className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-400 hover:border-red-200 hover:text-red-500 transition">
                      🗑
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">開始日期</label>
                    <input type="date" value={t.startDate}
                      onChange={e => updateTrip(t.id, { startDate: e.target.value })} className="input" />
                  </div>
                  <div>
                    <label className="label">天數</label>
                    <input type="number" inputMode="numeric" min="1" max="60" value={t.tripDays || ''}
                      onChange={e => updateTrip(t.id, { tripDays: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                      className="input" />
                  </div>
                </div>
                <div>
                  <label className="label">預算（JPY）</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
                    <input type="number" inputMode="numeric" min="0" value={t.budgetJPY || ''}
                      onChange={e => updateTrip(t.id, { budgetJPY: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                      className="input pl-7" />
                  </div>
                </div>
              </div>
            )
          })}

          <button type="button" onClick={addTrip}
            className="w-full rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-semibold text-gray-500 hover:border-gray-300 transition">
            + 新增旅程
          </button>
        </section>

        {/* Exchange rate */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">💱 匯率</h2>
          <div>
            <label className="label">1 JPY = ? TWD</label>
            <input type="number" inputMode="decimal" step="0.001" min="0.001" value={rateText}
              onChange={e => { setRateText(e.target.value); setSaved(false) }} className="input" />
            <p className="mt-1 text-xs text-gray-400">
              目前設定：¥100 ≈ NT${((parseFloat(rateText) || 0) * 100).toFixed(1)}
            </p>
          </div>
        </section>

        {/* People */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">👤 付款人名單</h2>
          <div className="space-y-2">
            {s.people.map((person, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="text" value={person} onChange={e => renamePerson(idx, e.target.value)} className="input flex-1" />
                <button type="button" onClick={() => removePerson(person)} disabled={s.people.length <= 1}
                  className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-400 hover:border-red-200 hover:text-red-500 disabled:opacity-30 transition">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newPerson} onChange={e => setNewPerson(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}
              placeholder="新增旅伴名稱" className="input flex-1" />
            <button type="button" onClick={addPerson} disabled={!newPerson.trim()}
              className="shrink-0 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition">
              新增
            </button>
          </div>
        </section>

        {/* Access code */}
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">🔒 存取密碼</h2>
          <div>
            <input type="text" value={s.accessCode} onChange={e => update('accessCode', e.target.value)}
              placeholder="輸入與伺服器相同的密碼" className="input" autoComplete="off" />
            <p className="mt-2 text-xs text-gray-400 leading-relaxed">
              此密碼用於保護收據掃描與資料讀取。請輸入與部署環境變數 <code className="text-gray-500">ACCESS_CODE</code> 相同的字串。兩位使用者需各自在自己的手機輸入同一組密碼。
            </p>
          </div>
        </section>

        <button type="submit"
          className={`w-full rounded-2xl py-3.5 font-semibold text-white shadow-sm transition active:scale-95 ${
            saved ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'
          }`}>
          {saved ? '✅ 已儲存' : '儲存設定'}
        </button>

        <button type="button" onClick={() => router.back()}
          className="w-full rounded-2xl border border-gray-200 py-3.5 font-semibold text-gray-600 hover:bg-gray-50 transition">
          返回
        </button>
      </form>
    </PageShell>
  )
}
