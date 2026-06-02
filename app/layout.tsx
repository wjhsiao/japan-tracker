import type { Metadata, Viewport } from 'next'
import { Geist, Space_Grotesk } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })
// Display font for Latin numbers/headlines on share & recap cards (self-hosted,
// so html-to-image can embed it). CJK falls back to each device's system font.
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' })

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
      <body className={`${geist.className} ${display.variable} bg-gray-50 antialiased`}>{children}</body>
    </html>
  )
}
