'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '../components/layout/PageShell'
import { loadSettings, saveSettings } from '@/lib/settings'

export default function SettingsPage() {
  const router = useRouter()
  const [s, setS] = useState(loadSettings())
  const [saved, setSaved] = useState(false)
  const [newPerson, setNewPerson] = useState('')

  function update<K extends keyof typeof s>(k: K, v: typeof s[K]) {
    setS(prev => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  function addPerson() {
    const name = newPerson.trim()
    if (!name || s.people.includes(name)) return
    update('people', [...s.people, name])
    setNewPerson('')
  }

  function removePerson(name: string) {
    if (s.people.length <= 1) return // keep at least one
    update('people', s.people.filter(p => p !== name))
  }

  function renamePerson(idx: number, val: string) {
    const updated = [...s.people]
    updated[idx] = val
    update('people', updated)
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveSettings(s)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <PageShell title="設定">
      <form onSubmit={handleSave} className="space-y-5 px-4">

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">🗓 行程設定</h2>
          <div>
            <label className="label">旅遊開始日期</label>
            <input type="date" value={s.startDate}
              onChange={e => update('startDate', e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">旅遊天數</label>
            <input type="number" min="1" max="60" value={s.tripDays}
              onChange={e => update('tripDays', parseInt(e.target.value) || 1)} className="input" />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">💴 預算設定</h2>
          <div>
            <label className="label">旅遊總預算（JPY）</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span>
              <input type="number" min="1" value={s.budgetJPY}
                onChange={e => update('budgetJPY', parseInt(e.target.value) || 0)}
                className="input pl-7" />
            </div>
          </div>
          <div>
            <label className="label">匯率（1 JPY = ? TWD）</label>
            <input type="number" step="0.001" min="0.001" value={s.exchangeRateJPYtoTWD}
              onChange={e => update('exchangeRateJPYtoTWD', parseFloat(e.target.value) || 0)}
              className="input" />
            <p className="mt-1 text-xs text-gray-400">
              目前設定：¥100 ≈ NT${(s.exchangeRateJPYtoTWD * 100).toFixed(1)}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">👤 付款人名單</h2>

          {/* Existing people */}
          <div className="space-y-2">
            {s.people.map((person, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={person}
                  onChange={e => renamePerson(idx, e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => removePerson(person)}
                  disabled={s.people.length <= 1}
                  className="shrink-0 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-400 hover:border-red-200 hover:text-red-500 disabled:opacity-30 transition"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add new person */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newPerson}
              onChange={e => setNewPerson(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPerson() } }}
              placeholder="新增旅伴名稱"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={addPerson}
              disabled={!newPerson.trim()}
              className="shrink-0 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-30 transition"
            >
              新增
            </button>
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
