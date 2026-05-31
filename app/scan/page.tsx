'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageShell from '../components/layout/PageShell'
import ExpenseForm from '../components/expenses/ExpenseForm'
import { OcrResult } from '@/lib/types'
import { addExpense } from '@/lib/gas'
import { invalidateExpensesCache } from '@/lib/useExpenses'
import { compressImage } from '@/lib/utils'
import { loadSettings } from '@/lib/settings'
import { Expense } from '@/lib/types'

type Step = 'pick' | 'confirm' | 'error'

export default function ScanPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('pick')
  const [preview, setPreview] = useState('')
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFile(file: File) {
    // Show preview immediately
    setPreview(URL.createObjectURL(file))
    setOcrResult(null)
    setIsAnalyzing(true)
    setStep('confirm')

    try {
      // Compress image before sending
      const { base64, mimeType } = await compressImage(file)

      const accessCode = loadSettings().accessCode
      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessCode ? { 'x-access-code': accessCode } : {}),
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'OCR failed')
      setOcrResult(data)
    } catch (err) {
      setErrorMsg(String(err))
      setStep('error')
    } finally {
      setIsAnalyzing(false)
    }
  }

  async function handleSave(expense: Expense) {
    await addExpense(expense)
    invalidateExpensesCache()
    router.push('/')
  }

  return (
    <PageShell title="掃描收據">
      {step === 'pick' && (
        <div className="flex flex-col items-center gap-6 px-4 pt-8">
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-red-50">
            <span className="text-6xl">📷</span>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-800">拍攝或上傳收據</p>
            <p className="mt-1 text-sm text-gray-500">AI 自動辨識店名、金額、品項</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.removeAttribute('capture')
                  inputRef.current.click()
                }
              }}
              className="w-full rounded-2xl bg-red-600 py-4 font-semibold text-white shadow-sm hover:bg-red-700 transition active:scale-95"
            >
              📁 從相簿選擇
            </button>
            <button
              onClick={() => {
                if (inputRef.current) {
                  inputRef.current.setAttribute('capture', 'environment')
                  inputRef.current.click()
                }
              }}
              className="w-full rounded-2xl border-2 border-red-600 py-4 font-semibold text-red-600 hover:bg-red-50 transition active:scale-95"
            >
              📸 拍攝收據
            </button>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="flex flex-col items-center gap-4 px-4 pt-8">
          <span className="text-5xl">❌</span>
          <p className="font-semibold text-gray-800">辨識失敗</p>
          <p className="text-sm text-center text-gray-500">{errorMsg}</p>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={() => setStep('pick')}
              className="flex-1 rounded-xl border border-gray-200 py-3 font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              重試
            </button>
            <button
              onClick={() => router.push('/add')}
              className="flex-1 rounded-xl bg-red-600 py-3 font-semibold text-white hover:bg-red-700 transition"
            >
              手動輸入
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div>
          <div className="px-4 pb-3 pt-0">
            {preview && (
              <img
                src={preview}
                alt="receipt"
                className="mb-4 max-h-48 w-full rounded-2xl object-contain bg-gray-100"
              />
            )}
            {isAnalyzing ? (
              <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 flex items-center gap-3">
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-semibold text-blue-700">AI 辨識中，請先確認付款人與類別…</p>
              </div>
            ) : (
              <div className="mb-4 rounded-xl bg-green-50 px-4 py-3">
                <p className="text-sm font-semibold text-green-700">✅ 辨識完成，請確認以下資訊</p>
              </div>
            )}
          </div>
          <ExpenseForm
            initial={ocrResult ?? undefined}
            onSave={handleSave}
            onCancel={() => setStep('pick')}
            saveLabel="確認儲存"
            disabled={isAnalyzing}
          />
        </div>
      )}
    </PageShell>
  )
}
