import { Expense, Settings } from './types'

function safeFilename(e: Expense): string {
  const safe = e.storeName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 30)
  return `${e.date}_${safe}_${e.id.slice(0, 6)}.jpg`
}

export async function exportZip(
  expenses: Expense[],
  settings: Settings,
  photos: Map<string, string>
): Promise<void> {
  const [{ default: JSZip }, XLSX] = await Promise.all([
    import('jszip'),
    import('xlsx'),
  ])

  const zip = new JSZip()
  const photosFolder = zip.folder('photos')!

  // Build Excel rows
  const headers = ['日期', '店名', '店名（日文）', '金額（JPY）', '類別', '付款方式', '付款人', '品項明細', '備註', '收據照片']
  const aoa: unknown[][] = [headers]

  for (const e of expenses) {
    const items = e.items?.map(i => `${i.nameTw} ¥${i.price}`).join(' / ') ?? ''
    const hasPhoto = photos.has(e.id)
    const filename = hasPhoto ? safeFilename(e) : ''

    // Add photo to ZIP
    if (hasPhoto && filename) {
      const dataUrl = photos.get(e.id)!
      const base64 = dataUrl.split(',')[1]
      photosFolder.file(filename, base64, { base64: true })
    }

    aoa.push([
      e.date,
      e.storeName,
      e.storeNameJa || '',
      e.amountJPY,
      e.category,
      e.paymentMethod,
      e.paidBy || '',
      items,
      e.notes || '',
      filename, // plain text; hyperlink added below per-cell
    ])
  }

  // Create worksheet and add hyperlinks on the photo column (col index 9 = J)
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // Apply hyperlinks to photo cells (row 2 onward, col J)
  expenses.forEach((e, i) => {
    if (!photos.has(e.id)) return
    const cellAddr = XLSX.utils.encode_cell({ r: i + 1, c: 9 })
    if (ws[cellAddr]) {
      ws[cellAddr].l = { Target: `photos/${safeFilename(e)}` }
      ws[cellAddr].v = '📷 查看'
    }
  })

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 40 },
    { wch: 20 }, { wch: 12 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '花費明細')

  const xlsxBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  zip.file('花費明細.xlsx', xlsxBuf)

  const blob = await zip.generateAsync({ type: 'blob' })
  const filename = 'japan-tracker-export.zip'

  // Prefer the native share sheet (matches lib/shareExport.ts) so the zip can
  // go straight to Drive / Gmail / etc. on mobile; fall back to a download.
  const file = new File([blob], filename, { type: 'application/zip' })
  const navAny = navigator as Navigator & { canShare?: (d?: unknown) => boolean }
  if (navAny.canShare && navAny.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: '日本旅遊花費匯出' })
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  // Defer revoke so the browser has time to start reading the (multi-MB) blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
