'use client'

import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Expense, OcrResult, Category, Currency, CATEGORIES, PAYMENT_METHODS, PAYMENT_COLORS } from '@/lib/types'
import { loadSettings } from '@/lib/settings'
import { today } from '@/lib/utils'
import { convertAmount, calcCardTotal } from '@/lib/currency'

interface Props {
  // Covers both OCR results (new scan) and existing Expense edits.
  // id/createdAt present ⇒ editing an existing row (must be preserved, not regenerated).
  initial?: Partial<OcrResult> & {
    id?: string
    paidBy?: string
    notes?: string
    createdAt?: string
    inputAmount?: number
    inputCurrency?: Currency
    cardId?: string
  }
  onSave: (expense: Expense) => Promise<void>
  onCancel: () => void
  saveLabel?: string
  /** While true, disables the save button (OCR still loading) */
  disabled?: boolean
  /** Autofocus the amount field (manual add flow) */
  autoFocusAmount?: boolean
}

export default function ExpenseForm({ initial, onSave, onCancel, saveLabel = '儲存', disabled = false, autoFocusAmount = false }: Props) {
  const settings = loadSettings()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  // Expand the optional 日文店名 / 備註 section if either already has content
  const [showMore, setShowMore] = useState(!!(initial?.storeNameJa || initial?.notes))

  const [date, setDate] = useState(initial?.date ?? today())
  const [storeName, setStoreName] = useState(initial?.storeName ?? '')
  const [storeNameJa, setStoreNameJa] = useState(initial?.storeNameJa ?? '')
  const [isBaseCurrency, setIsBaseCurrency] = useState(initial?.inputCurrency === 'TWD')
  const [inputAmount, setInputAmount] = useState(
    initial?.inputAmount != null ? String(initial.inputAmount)
      : initial?.amountJPY ? String(initial.amountJPY) : ''
  )
  const [category, setCategory] = useState<Category>(initial?.category ?? '其他')
  const [paymentMethod, setPaymentMethod] = useState(initial?.paymentMethod ?? '現金')
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? settings.people[0] ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState(initial?.items ?? [])
  const [cardId, setCardId] = useState(initial?.cardId ?? settings.cardSettings[0]?.id ?? '')

  // When OCR result arrives after form is already mounted, sync the fields
  useEffect(() => {
    if (!initial) return
    if (initial.date) setDate(initial.date)
    if (initial.storeName) setStoreName(initial.storeName)
    if (initial.storeNameJa) setStoreNameJa(initial.storeNameJa)
    if (initial.inputAmount != null) {
      setInputAmount(String(initial.inputAmount))
      setIsBaseCurrency(initial.inputCurrency === 'TWD')
    } else if (initial.amountJPY) {
      setInputAmount(String(initial.amountJPY))
      setIsBaseCurrency(false)
    }
    if (initial.category) setCategory(initial.category)
    if (initial.paymentMethod) setPaymentMethod(initial.paymentMethod)
    if (initial.items) setItems(initial.items)
    if (initial.paidBy) setPaidBy(initial.paidBy)
    if (initial.notes) setNotes(initial.notes)
    if (initial.cardId) setCardId(initial.cardId)
    if (initial.storeNameJa || initial.notes) setShowMore(true)
  }, [initial])

  const rate = settings.exchangeRateJPYtoTWD
  const parsedInput = parseFloat(inputAmount.replace(/,/g, '')) || 0
  const converted = convertAmount(parsedInput, isBaseCurrency ? 'TWD' : 'JPY', rate)
  const selectedCard = paymentMethod === '信用卡'
    ? settings.cardSettings.find(c => c.id === cardId)
    : undefined
  // cardId can point at a card deleted in Settings since it was last saved (no referential integrity)
  const cardMissing = paymentMethod === '信用卡' && !!cardId && !selectedCard
  const cardTotalPreview = selectedCard
    ? calcCardTotal(converted.baseAmountTWD, selectedCard.feeRate, selectedCard.cashbackRate)
    : converted.baseAmountTWD

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (disabled) return
    if (!parsedInput || parsedInput <= 0) { setError('請輸入有效金額'); return }
    const currency: Currency = isBaseCurrency ? 'TWD' : 'JPY'
    const feeRate = selectedCard?.feeRate ?? 0
    const cashbackRate = selectedCard?.cashbackRate ?? 0
    const totalBaseAmountTWD = calcCardTotal(converted.baseAmountTWD, feeRate, cashbackRate)
    setSaving(true)
    setError('')
    try {
      await onSave({
        // Preserve identity when editing; only mint a new id/createdAt for new entries
        id: initial?.id ?? uuidv4(),
        date,
        storeName: storeName || '未知店家',
        storeNameJa,
        items,
        amountJPY: converted.amountJPY,
        category,
        paymentMethod,
        paidBy,
        notes,
        createdAt: initial?.createdAt ?? new Date().toISOString(),
        inputAmount: parsedInput,
        inputCurrency: currency,
        exchangeRateUsed: rate,
        baseAmountTWD: converted.baseAmountTWD,
        cardId: selectedCard?.id,
        cardFeeRate: feeRate,
        cardCashbackRate: cashbackRate,
        totalBaseAmountTWD,
      })
    } catch (err) {
      setError(String(err))
      setSaving(false)
    }
  }

  const isBusy = saving || disabled

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
          <div className="flex items-center justify-between">
            <label className="label mb-0">金額</label>
            <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
              <button type="button" onClick={() => setIsBaseCurrency(false)}
                className={`rounded-md px-2 py-0.5 font-medium transition ${!isBaseCurrency ? 'bg-red-600 text-white' : 'text-gray-500'}`}>
                日幣
              </button>
              <button type="button" onClick={() => setIsBaseCurrency(true)}
                className={`rounded-md px-2 py-0.5 font-medium transition ${isBaseCurrency ? 'bg-red-600 text-white' : 'text-gray-500'}`}>
                台幣
              </button>
            </div>
          </div>
          <div className="relative mt-1.5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">
              {isBaseCurrency ? 'NT$' : '¥'}
            </span>
            <input type="number" inputMode="decimal" min="0" step="any" value={inputAmount}
              autoFocus={autoFocusAmount}
              onChange={e => setInputAmount(e.target.value)}
              placeholder="0" className="input pl-9 text-lg font-semibold" required />
          </div>
          {parsedInput > 0 && (
            <p className="mt-1 text-right text-xs text-gray-400">
              {isBaseCurrency
                ? `≈ ¥${converted.amountJPY.toLocaleString()}`
                : `≈ NT$ ${converted.baseAmountTWD.toLocaleString()}`}
            </p>
          )}
        </div>
      </div>

      {/* Store name */}
      <div>
        <label className="label">店名</label>
        <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
          placeholder="e.g. 一蘭拉麵" className="input" />
      </div>

      {/* Category */}
      <div>
        <label className="label">類別</label>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
              className={`rounded-xl border-2 py-2 text-xs font-medium transition-all ${
                category === cat.value
                  ? cat.color
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
              }`}>
              <div className="text-lg">{cat.emoji}</div>
              <div className="mt-0.5">{cat.value}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment method */}
      <div>
        <label className="label">付款方式</label>
        <div className="flex gap-2 flex-wrap">
          {PAYMENT_METHODS.map(m => (
            <button key={m} type="button" onClick={() => setPaymentMethod(m)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                paymentMethod === m
                  ? PAYMENT_COLORS[m]
                  : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Credit card selector + fee/cashback preview */}
      {paymentMethod === '信用卡' && (settings.cardSettings.length > 0 || cardMissing) && (
        <div>
          <label className="label">選擇信用卡</label>
          <div className="flex gap-2 flex-wrap">
            {settings.cardSettings.map(card => (
              <button key={card.id} type="button" onClick={() => setCardId(card.id)}
                className={`rounded-xl border-2 px-4 py-2 text-sm font-medium transition-all ${
                  cardId === card.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                }`}>
                {card.name}
              </button>
            ))}
          </div>
          {cardMissing && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠️ 原本選擇的信用卡已被刪除，請重新選擇（儲存前手續費/回饋將以 0% 計算）
            </p>
          )}
          {selectedCard && parsedInput > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              預估帳單扣款：NT$ {cardTotalPreview.toLocaleString()}
              （已含 {(selectedCard.feeRate * 100).toFixed(1)}% 手續費，並扣除 {(selectedCard.cashbackRate * 100).toFixed(1)}% 回饋）
            </p>
          )}
        </div>
      )}

      {/* Payer */}
      {settings.people.length > 0 && (
        <div>
          <label className="label">付款人</label>
          <div className="flex gap-2 flex-wrap">
            {settings.people.map(person => (
              <button key={person} type="button"
                onClick={() => setPaidBy(person)}
                className={`rounded-xl border-2 px-5 py-2.5 text-sm font-semibold transition-all ${
                  paidBy === person
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                }`}>
                {person}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* More (optional) — 日文店名 + 備註 */}
      {showMore ? (
        <div className="space-y-4">
          <div>
            <label className="label">店名（日文）<span className="text-gray-400 font-normal text-xs ml-1">選填</span></label>
            <input type="text" value={storeNameJa} onChange={e => setStoreNameJa(e.target.value)}
              placeholder="e.g. 一蘭ラーメン" className="input" />
          </div>
          <div>
            <label className="label">備註<span className="text-gray-400 font-normal text-xs ml-1">選填</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="其他備註..." rows={2}
              className="input resize-none" />
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setShowMore(true)}
          className="text-sm font-medium text-gray-400 hover:text-gray-600 transition">
          + 更多（日文店名、備註）
        </button>
      )}

      {/* Items preview */}
      {items.length > 0 && (
        <div>
          <label className="label">明細</label>
          <div className="rounded-xl bg-gray-50 divide-y divide-gray-100 overflow-hidden">
            {items.map((item, i) => (
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
        <button type="submit" disabled={isBusy}
          className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60 active:scale-95">
          {saving ? '儲存中...' : disabled ? '辨識中...' : saveLabel}
        </button>
      </div>
    </form>
  )
}
