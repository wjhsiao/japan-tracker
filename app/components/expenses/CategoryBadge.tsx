import { Category, CATEGORIES } from '@/lib/types'

export default function CategoryBadge({ category, size = 'sm' }: { category: Category; size?: 'sm' | 'md' }) {
  const cat = CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[CATEGORIES.length - 1]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${cat.color} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {cat.emoji} {cat.value}
    </span>
  )
}
