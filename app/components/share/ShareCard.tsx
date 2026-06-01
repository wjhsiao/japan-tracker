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

const PHOTO_FILTER: Partial<Record<ShareTheme, string>> = {
  NEWSPAPER_CLIP: 'grayscale contrast-125',
  RETRO_POSTCARD: 'sepia-[.35] contrast-110 saturate-150',
  RETRO_ANIME: 'contrast-110 saturate-125',
  MAGAZINE: 'contrast-110',
}

const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(props, ref) {
  const { theme, photoUrl } = props

  // POLAROID has its own white-frame layout (photo is inset, not full-bleed)
  if (theme === 'POLAROID') {
    return <div ref={ref}><Polaroid {...props} /></div>
  }

  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-2xl bg-gray-900 text-white"
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover ${PHOTO_FILTER[theme] ?? ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-400">
          請先選擇照片
        </div>
      )}

      {theme === 'RECURRENT_FEED' && <RecurrentFeed {...props} />}
      {theme === 'NEWSPAPER_CLIP' && <Newspaper {...props} />}
      {theme === 'RETRO_ANIME' && <RetroAnime {...props} />}
      {theme === 'RETRO_POSTCARD' && <RetroPostcard {...props} />}
      {theme === 'MAGAZINE' && <Magazine {...props} />}
      {theme === 'TICKET' && <Ticket {...props} />}
      {theme === 'GAME' && <Game {...props} />}
    </div>
  )
})

export default ShareCard

/* ── IG 限動風 ─────────────────────────────────────────────── */
function RecurrentFeed({ data, location, goldSentence }: Props) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
      <div className="absolute left-4 top-4 flex items-center gap-1 rounded-lg bg-black/45 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
        📍 {location || '日本'}
      </div>
      <div className="absolute inset-x-6 bottom-28 rounded-2xl bg-white/15 p-4 backdrop-blur-md">
        <p className="text-sm leading-relaxed">
          今天花最多的是：<span className="font-bold">{data.topItemName}</span>
          {data.topItemAmount > 0 && <span className="opacity-80">（{formatJPY(data.topItemAmount)}）</span>}
          ，值不值得？
        </p>
        <div className="mt-3 overflow-hidden rounded-full bg-white/25">
          <div className="flex items-center justify-between rounded-full bg-white/90 px-3 py-1.5 text-sm font-semibold text-gray-900">
            <span>值得 😋</span><span>100%</span>
          </div>
        </div>
        {goldSentence && <p className="mt-3 text-center text-sm italic opacity-90">「{goldSentence}」</p>}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/40 py-3 text-sm backdrop-blur-sm">
        <span>今日總計：{formatJPY(data.totalAmount)}</span><span>❤️🔥❤️🔥</span>
      </div>
    </>
  )
}

/* ── 號外報紙風 ───────────────────────────────────────────── */
function Newspaper({ data, mainCharacter, goldSentence }: Props) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/60" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between border-b-2 border-white/80 bg-black/55 px-4 py-2 font-serif backdrop-blur-sm">
        <span className="text-sm tracking-widest">旅遊號外</span>
        <span className="text-xs">{prettyDate(data.date)}</span>
      </div>
      <div className="absolute right-3 top-16 font-serif font-black leading-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]"
        style={{ writingMode: 'vertical-rl', textOrientation: 'upright' }}>
        <span className="text-2xl">【號外】本日大失血！</span>
      </div>
      <div className="absolute left-4 top-16 font-serif">
        <p className="text-xs opacity-80">驚人消費</p>
        <p className="text-4xl font-black drop-shadow-[2px_2px_0_rgba(0,0,0,0.8)]">{formatJPY(data.totalAmount)}</p>
        <p className="text-xs opacity-80">圓 · 約 NT${data.totalAmountTWD.toLocaleString()}</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-black/65 px-4 py-3 font-serif backdrop-blur-sm">
        <p className="text-sm leading-relaxed">據特派員 <span className="font-bold">{mainCharacter || '本人'}</span> 直擊指出：</p>
        <p className="mt-1 text-base font-bold leading-snug">「{goldSentence || '錢沒有不見，只是變成喜歡的樣子。'}」</p>
      </div>
    </>
  )
}

/* ── 復古動漫風（黃字黑邊字幕 + 點陣時間戳）────────────────── */
function RetroAnime({ data, mainCharacter, goldSentence }: Props) {
  const stroke = { textShadow: '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 0 6px rgba(0,0,0,.5)' }
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
      {/* dotted timestamp, bottom-right */}
      <div className="absolute bottom-24 right-3 font-mono text-base tracking-widest text-orange-400"
        style={{ textShadow: '0 0 4px rgba(255,140,0,.8)' }}>
        {prettyDate(data.date)}　{formatJPY(data.totalAmount)}
      </div>
      {/* yellow subtitle, bottom center */}
      <div className="absolute inset-x-4 bottom-8 text-center">
        <p className="text-lg font-bold leading-snug text-yellow-300" style={stroke}>
          {mainCharacter ? `${mainCharacter}：` : ''}{goldSentence || '今天也是充實的一天。'}
        </p>
      </div>
    </>
  )
}

/* ── 昭和明信片風（圓郵戳 + 郵票面額 + 手寫問候）─────────────── */
function RetroPostcard({ data, location, mainCharacter, goldSentence }: Props) {
  return (
    <>
      <div className="absolute inset-0 border-[10px] border-amber-50/90" />
      {/* circular postmark, top-right */}
      <div className="absolute right-4 top-4 flex h-20 w-20 -rotate-12 flex-col items-center justify-center rounded-full border-2 border-amber-100/90 text-center text-amber-100"
        style={{ boxShadow: 'inset 0 0 0 3px rgba(254,243,199,.6)' }}>
        <span className="text-[9px] font-bold tracking-wider">{(location || 'JAPAN').toUpperCase()}</span>
        <span className="text-[10px] font-bold">{prettyDate(data.date)}</span>
        <span className="text-[8px]">BY {(mainCharacter || 'ME').toUpperCase()}</span>
      </div>
      {/* postage stamp, top-left */}
      <div className="absolute left-4 top-4 flex h-16 w-14 flex-col items-center justify-center border-2 border-dashed border-amber-100/90 bg-black/30 text-amber-100">
        <span className="text-[8px]">郵資</span>
        <span className="text-sm font-bold">NT${data.totalAmountTWD}</span>
      </div>
      {/* handwritten greeting, bottom */}
      <div className="absolute inset-x-6 bottom-8 rounded bg-black/35 p-3 backdrop-blur-sm" style={{ fontFamily: '"Brush Script MT","Segoe Script",cursive' }}>
        <p className="text-base leading-relaxed text-amber-50">
          今日消費總計 {formatJPY(data.totalAmount)}。特別記之：{goldSentence || '旅途愉快。'}
        </p>
      </div>
    </>
  )
}

/* ── 雜誌封面風 ───────────────────────────────────────────── */
function Magazine({ data, location, goldSentence }: Props) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
      {/* masthead */}
      <h1 className="absolute inset-x-0 top-3 text-center text-5xl font-black tracking-tight text-white drop-shadow-lg">
        TABI
      </h1>
      <p className="absolute right-4 top-20 text-right text-xs font-semibold tracking-widest opacity-90">
        {prettyDate(data.date)} ISSUE
      </p>
      {/* cover lines */}
      <div className="absolute left-4 top-1/3 max-w-[70%] space-y-2">
        <p className="inline-block bg-red-600 px-2 py-0.5 text-sm font-bold">本期消費 {formatJPY(data.totalAmount)}</p>
        <p className="text-sm font-semibold drop-shadow">📍 {location || '日本'} 特集</p>
      </div>
      {/* headline */}
      <div className="absolute inset-x-4 bottom-10">
        <p className="text-2xl font-black leading-tight drop-shadow-lg">{goldSentence || '旅行的意義'}</p>
        <p className="mt-1 text-xs opacity-80">NT${data.totalAmountTWD.toLocaleString()} ・ {data.count} 筆消費</p>
      </div>
    </>
  )
}

/* ── 車票 / 切符風 ───────────────────────────────────────── */
function Ticket({ data, location, mainCharacter }: Props) {
  return (
    <>
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-5 bottom-10 rounded-lg bg-amber-50 p-4 font-mono text-gray-900 shadow-xl">
        {/* punch holes */}
        <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gray-900/80" />
        <div className="absolute -right-2 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-gray-900/80" />
        <div className="flex items-center justify-between border-b border-dashed border-gray-400 pb-2 text-xs">
          <span>乗車券 TICKET</span><span>{prettyDate(data.date)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-gray-500">區間</p>
            <p className="text-sm font-bold">{location || '日本'} 旅遊</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500">運賃 FARE</p>
            <p className="text-xl font-black">{formatJPY(data.totalAmount)}</p>
          </div>
        </div>
        <div className="mt-2 border-t border-dashed border-gray-400 pt-2 text-[10px] text-gray-600">
          {mainCharacter || '旅客'} ・ NT${data.totalAmountTWD.toLocaleString()} ・ {data.count} 筆
        </div>
      </div>
    </>
  )
}

/* ── 復古電玩風 ───────────────────────────────────────────── */
function Game({ data, mainCharacter, goldSentence }: Props) {
  return (
    <>
      <div className="absolute inset-0 bg-black/30" />
      {/* score, top-right */}
      <div className="absolute right-3 top-3 rounded bg-black/70 px-2 py-1 font-mono text-xs text-green-400">
        SCORE {data.totalAmount.toLocaleString()}
      </div>
      {/* GET toast */}
      {data.topItemAmount > 0 && (
        <div className="absolute left-3 top-3 rounded bg-yellow-300 px-2 py-1 font-mono text-xs font-bold text-gray-900">
          GET! {data.topItemName}
        </div>
      )}
      {/* dialogue box, bottom */}
      <div className="absolute inset-x-4 bottom-6 rounded-md border-4 border-white bg-blue-950/90 p-3 font-mono">
        <span className="absolute -top-3 left-3 rounded bg-white px-2 text-xs font-bold text-blue-950">
          ▶ {mainCharacter || 'PLAYER'}
        </span>
        <p className="mt-1 text-sm leading-relaxed text-white">
          {goldSentence || '冒險還在繼續…'}
          <span className="ml-1 animate-pulse">▼</span>
        </p>
      </div>
    </>
  )
}

/* ── 拍立得風（白框 + 內嵌照片）─────────────────────────────── */
function Polaroid({ photoUrl, data, goldSentence }: Props) {
  return (
    <div className="mx-auto aspect-[9/16] w-full max-w-sm rounded-2xl bg-white p-3 pb-0 shadow-xl">
      <div className="h-[78%] w-full overflow-hidden bg-gray-100">
        {photoUrl ? (
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">請先選擇照片</div>
        )}
      </div>
      <div className="flex h-[22%] flex-col items-center justify-center px-2 text-center">
        <p className="text-lg text-gray-800" style={{ fontFamily: '"Brush Script MT","Segoe Script",cursive' }}>
          {goldSentence || '美好的一天'}
        </p>
        <p className="mt-1 text-xs text-gray-400">{prettyDate(data.date)} ・ {formatJPY(data.totalAmount)}</p>
      </div>
    </div>
  )
}
