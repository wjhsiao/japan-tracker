import { toPng } from 'html-to-image'

/**
 * Render a card node to PNG and share (or download as fallback).
 * Scales output to ≥1080px wide for crisp Instagram-quality images.
 * Throws on failure; callers handle errors (AbortError = user cancelled share).
 */
export async function exportCard(node: HTMLElement, filename: string): Promise<void> {
  // Wait for fonts so text isn't dropped on the first render
  if (document.fonts?.ready) await document.fonts.ready

  // Dynamic pixelRatio so the export reaches ≥1080px wide (IG story standard)
  const width = node.offsetWidth || 384
  const pixelRatio = Math.max(2, Math.ceil(1080 / width))

  const dataUrl = await toPng(node, { pixelRatio, cacheBust: true })
  const blob = await (await fetch(dataUrl)).blob()
  const file = new File([blob], filename, { type: 'image/png' })

  const navAny = navigator as Navigator & { canShare?: (d?: unknown) => boolean }
  if (navAny.canShare && navAny.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: '日本旅遊' })
  } else {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  }
}
