'use client'

import { forwardRef } from 'react'
import { ShareData, ShareTheme } from '@/lib/shareData'
import { formatJPY } from '@/lib/utils'

interface Props {
  theme: ShareTheme
  photoUrl: string
  data: ShareData
  location: string
  mainCharacter: string
  goldSentence: string
}

function prettyDate(d: string) {
  return d.replaceAll('-', '.')
}

/**
 * The visual card that gets exported to PNG. Fixed 9:16 portrait.
 * Rendered off the photo + day data + user inputs, switched by theme.
 */
const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { theme, photoUrl, data, location, mainCharacter, goldSentence },
  ref
) {
  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-gray-900 text-white"
    >
      {/* Photo layer */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${
            theme === 'NEWSPAPER_CLIP' ? 'grayscale contrast-125' : ''
          }`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">
          請先選擇照片
        </div>
      )}

      {theme === 'RECURRENT_FEED' && (
        <RecurrentFeed data={data} location={location} goldSentence={goldSentence} />
      )}
      {theme === 'NEWSPAPER_CLIP' && (
        <Newspaper data={data} mainCharacter={mainCharacter} goldSentence={goldSentence} />
      )}
    </div>
  )
})

export default ShareCard

/* ── Theme: IG 限動風 ─────────────────────────────────────────── */
function RecurrentFeed({
  data,
  location,
  goldSentence,
}: {
  data: ShareData
  location: string
  goldSentence: string
}) {
  return (
    <>
      {/* subtle gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* location tag, top-left */}
      <div className="absolute left-4 top-4 flex items-center gap-1 rounded-lg bg-black/45 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
        📍 {location || '日本'}
      </div>

      {/* poll / question box, lower-middle */}
      <div className="absolute inset-x-6 bottom-28 rounded-2xl bg-white/15 p-4 backdrop-blur-md">
        <p className="text-sm leading-relaxed">
          今天花最多的是：<span className="font-bold">{data.topItemName}</span>
          {data.topItemAmount > 0 && (
            <span className="opacity-80">（{formatJPY(data.topItemAmount)}）</span>
          )}
          ，值不值得？
        </p>
        <div className="mt-3 overflow-hidden rounded-full bg-white/25">
          <div className="flex items-center justify-between rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-gray-900" style={{ width: '100%' }}>
            <span>值得 😋</span>
            <span>100%</span>
          </div>
        </div>
        {goldSentence && (
          <p className="mt-3 text-center text-sm italic opacity-90">「{goldSentence}」</p>
        )}
      </div>

      {/* status bar, bottom */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/40 py-3 text-sm backdrop-blur-sm">
        <span>今日總計：{formatJPY(data.totalAmount)}</span>
        <span>❤️🔥❤️🔥</span>
      </div>
    </>
  )
}

/* ── Theme: 號外報紙風 ───────────────────────────────────────── */
function Newspaper({
  data,
  mainCharacter,
  goldSentence,
}: {
  data: ShareData
  mainCharacter: string
  goldSentence: string
}) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/60" />

      {/* masthead */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b-2 border-white/80 bg-black/55 px-4 py-2 font-serif backdrop-blur-sm">
        <span className="text-sm tracking-widest">旅遊號外</span>
        <span className="text-xs">{prettyDate(data.date)}</span>
      </div>

      {/* vertical headline, right side */}
      <div
        className="absolute right-3 top-16 font-serif font-black leading-tight text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
        style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}
      >
        <span className="text-2xl">【號外】本日大失血！</span>
      </div>

      {/* big amount */}
      <div className="absolute left-4 top-16 font-serif">
        <p className="text-xs opacity-80">驚人消費</p>
        <p className="text-4xl font-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">
          {formatJPY(data.totalAmount)}
        </p>
        <p className="text-xs opacity-80">圓 · 約 NT${data.totalAmountTWD.toLocaleString()}</p>
      </div>

      {/* subhead at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-4 py-3 font-serif backdrop-blur-sm">
        <p className="text-sm leading-relaxed">
          據特派員 <span className="font-bold">{mainCharacter || '本人'}</span> 直擊指出：
        </p>
        <p className="mt-1 text-base font-bold leading-snug">
          「{goldSentence || '錢沒有不見，只是變成喜歡的樣子。'}」
        </p>
      </div>
    </>
  )
}
