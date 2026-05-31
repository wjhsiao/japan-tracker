import BottomNav from './BottomNav'

interface Props {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}

export default function PageShell({ title, action, children }: Props) {
  return (
    <div className="mx-auto flex min-h-svh max-w-lg flex-col bg-gray-50">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {action}
      </header>
      <main className="flex-1 overflow-y-auto pb-20 pt-4">{children}</main>
      <BottomNav />
    </div>
  )
}
