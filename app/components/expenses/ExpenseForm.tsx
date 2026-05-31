'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Expense, OcrResult, Category, CATEGORIES, PAYMENT_METHODS } from '@/lib/types'
import { loadSettings } from '@/lib/settings'
import { today } from '@/lib/utils'

interface Props {
  initial?: Partial<OcrResult>
  receiptBase64?: string
  onSave: (expense: Expense) => Promise<void>
  onCancel: () => void
  saveLabel?: string
}

export default function ExpenseForm({ initial, receiptBase64, onSave, onCancel, saveLabel = '儲存' }: Props) {
  const settings = loadSettings()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [date, setDate] = useState(initial?.date ?? today())
  const [storeName, setStoreName] = useState(initial?.storeName ?? '')
  const [storeNameJa, setStoreNameJa] = useState(initial?.storeNameJa ?? '')
  const [amountJPY, setAmountJPY] = useState(initial?.amountJPY ? String(initial.amountJPY) : '')
  const [category, setCategory] = useState<Category>(initial?.category ?? '其他')
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? '現金')
  const [paidBy, setPaidBy] = useState(settings.person1Name)
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseInt(amountJPY.replace(/,/g, ''), 10)
    if (!amount || amount <= 0) { setError('請輸入有效金額'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        id: uuidv4(),
        date,
        storeName: storeName || '未知店家',
        storeNameJa,
        items: initial?.items ?? [],
        amountJPY: amount,
        category,
        paymentMethod,
        paidBy,
        notes,
        receiptBase64,
        createdAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Date & Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">日期</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="input" required />
        </div>
        <div>
          <label className="label">金額（JPY）</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">¥</span>
            <input type="number" inputMode="numeric" min="1" value={amountJPY}
              onChange={e => setAmountJPY(e.target.value)}
              placeholder="0" className="input pl-7" required />
          </div>
        </div>
      </div>

      {/* Store name */}
      <div>
        <label className="label">店名（中文）</label>
        <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
          placeholder="e.g. 一蘭拉麵" className="input" />
      </div>
      <div>
        <label className="label">店名（日文）<span className="text-gray-400 font-normal text-xs ml-1">選填</span></label>
        <input type="text" value={storeNameJa} onChange={e => setStoreNameJa(e.target.value)}
          placeholder="e.g. 一蘭ラーメン" className="input" />
      </div>

      {/* Category */}
      <div>
        <label className="label">類別</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
              className={`rounded-xl border-2 py-2 text-xs font-medium transition-all ${
                category === cat.value
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
              }`}>
              <div className="text-lg">{cat.emoji}</div>
              <div className="mt-0.5">{cat.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment & Payer */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">付款方式</label>
          <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
            className="input">
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="label">付款人</label>
          <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="input">
            <option>{settings.person1Name}</option>
            <option>{settings.person2Name}</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">備註<span className="text-gray-400 font-normal text-xs ml-1">選填</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="其他備註..." rows={2}
          className="input resize-none" />
      </div>

      {/* Items preview */}
      {initial?.items && initial.items.length > 0 && (
        <div>
          <label className="label">明細</label>
          <div className="rounded-xl bg-gray-50 divide-y divide-gray-100 overflow-hidden">
            {initial.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{item.nameTw}</p>
                  <p className="text-xs text-gray-400">{item.nameJa}</p>
                </div>
                <span className="font-semibold text-gray-700">¥{item.price.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pb-4">
        <button type="button" onClick={onCancel}
          className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition">
          取消
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60 active:scale-95">
          {saving ? '儲存中...' : saveLabel}
        </button>
      </div>
    </form>
  )
}
