import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Japan Travel Tracker',
  description: '日本旅遊消費記帳 App — 支援 AI 收據辨識',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JapanTracker',
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{})`,
        }} />
      </head>
      <body className={`${geist.className} bg-gray-50 antialiased`}>{children}</body>
    </html>
  )
}
