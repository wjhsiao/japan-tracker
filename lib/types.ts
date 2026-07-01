import { today } from './utils'

export type Category =
  | '餐飲'
  | '交通'
  | '購物'
  | '便利商店'
  | '門票/體驗'
  | '住宿'
  | '伴手禮'
  | '藥品'
  | '其他'

export type PaymentMethod = '現金' | '信用卡' | 'Suica' | 'PayPay' | '其他'

export type TaxType = '内税' | '外税' | '免税'

export type Currency = 'JPY' | 'TWD'

/** A credit card's overseas-transaction fee and cashback rates (e.g. 0.015 = 1.5%). */
export interface CardSetting {
  id: string
  name: string
  feeRate: number
  cashbackRate: number
}

export interface ExpenseItem {
  nameTw: string
  nameJa: string
  price: number
  taxType?: TaxType
  taxRate?: 8 | 10
}

export interface TaxBreakdown {
  rate: 8 | 10
  taxable: number
  tax: number
}

export interface Expense {
  id: string
  date: string
  storeName: string
  storeNameJa: string
  items: ExpenseItem[]
  /** Always the JPY-equivalent total — authoritative for budgets/sums/GAS export regardless of input currency. */
  amountJPY: number
  category: Category
  paymentMethod: PaymentMethod
  paidBy: string
  notes: string
  createdAt: string
  /** Raw amount as typed by the user, in inputCurrency (dual-currency input) */
  inputAmount?: number
  inputCurrency?: Currency
  /** JPY→TWD rate applied at save time */
  exchangeRateUsed?: number
  /** Converted TWD amount (main currency) */
  baseAmountTWD?: number
  /** Credit card used, if paymentMethod === '信用卡' */
  cardId?: string
  cardFeeRate?: number
  cardCashbackRate?: number
  /** baseAmountTWD × (1 + cardFeeRate − cardCashbackRate) */
  totalBaseAmountTWD?: number
}

export interface OcrResult {
  storeName: string
  storeNameJa: string
  items: ExpenseItem[]
  amountJPY: number
  taxBreakdown: TaxBreakdown[]
  category: Category
  paymentMethod: PaymentMethod
  date: string
}

export interface Trip {
  id: string
  name: string
  startDate: string
  tripDays: number
  budgetJPY: number
}

export interface Settings {
  exchangeRateJPYtoTWD: number
  /** List of payers (replaces person1Name / person2Name) */
  people: string[]
  /** Access code typed by user; sent as x-access-code header to protected APIs */
  accessCode: string
  /** Trips, each defined by a date range — expenses are grouped by which trip's range their date falls in */
  trips: Trip[]
  activeTripId: string
  /** Credit cards available in the payment-method card selector (fee/cashback rates) */
  cardSettings: CardSetting[]
}

export const DEFAULT_TRIP_ID = 'trip-default'

// Categories ordered by frequency of use
export const CATEGORIES: { value: Category; emoji: string; color: string }[] = [
  { value: '餐飲',      emoji: '🍜', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: '便利商店',  emoji: '🏪', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: '交通',      emoji: '🚃', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: '購物',      emoji: '🛍', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { value: '門票/體驗', emoji: '🎭', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: '伴手禮',    emoji: '🎁', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: '藥品',      emoji: '💊', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: '住宿',      emoji: '🏨', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: '其他',      emoji: '📝', color: 'bg-gray-100 text-gray-700 border-gray-200' },
]

export const PAYMENT_METHODS: PaymentMethod[] = ['現金', '信用卡', 'PayPay', 'Suica', '其他']

// Color per payment method (selected state)
export const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  現金:   'bg-green-100 text-green-700 border-green-200',
  信用卡: 'bg-blue-100 text-blue-700 border-blue-200',
  PayPay: 'bg-red-100 text-red-700 border-red-200',
  Suica:  'bg-cyan-100 text-cyan-700 border-cyan-200',
  其他:   'bg-gray-100 text-gray-700 border-gray-200',
}

export const DEFAULT_CARD_SETTINGS: CardSetting[] = [
  { id: 'card-no-fee', name: '海外無手續費卡', feeRate: 0, cashbackRate: 0.03 },
  { id: 'card-standard', name: '一般信用卡', feeRate: 0.015, cashbackRate: 0.01 },
]

export const DEFAULT_SETTINGS: Settings = {
  exchangeRateJPYtoTWD: 0.22,
  people: ['Person 1', 'Person 2'],
  accessCode: '',
  trips: [
    { id: DEFAULT_TRIP_ID, name: '我的旅程', startDate: today(), tripDays: 7, budgetJPY: 150000 },
  ],
  activeTripId: DEFAULT_TRIP_ID,
  cardSettings: DEFAULT_CARD_SETTINGS,
}
