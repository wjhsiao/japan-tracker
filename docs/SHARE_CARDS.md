# 每日分享卡片（Share Cards）— 功能規格

> 狀態：規劃中（尚未實作）。本文件捕捉設計決定，供日後開發依據。

## 目標
把「某一天的消費資料 + 一張照片 + 一句金句」套上視覺主題，輸出成可分享到
IG / Threads / LINE 的圖片。屬於「回憶 / 社群分享」模組，與記帳核心分離。

## 範圍（MVP）
先做 **2 個主題** 跑通整條流程，驗證後再擴充其餘：
1. **RECURRENT_FEED**（IG 限動風）— 最簡單、共鳴高
2. **NEWSPAPER_CLIP**（號外報紙風）— 最有梗、視覺辨識度高

其餘 6 個（GAME / POLAROID / MAGAZINE / TICKET / RETRO_ANIME / RETRO_POSTCARD）
列為後續擴充。

---

## 資料合約（變數 → 來源）

| 變數 | 來源 / 計算 | 備註 |
|---|---|---|
| `date` | 選定日期（預設今天） | YYYY-MM-DD |
| `totalAmount` | 該日 `sumJPY` | 已有 |
| `totalAmountTWD` | `round(totalAmount * exchangeRateJPYtoTWD)` | 已有匯率 |
| `count` | 該日筆數 | 已有 |
| `topItem` | 該日**最大一筆**的 `storeName`（無則 `category`）+ 金額 | ⚠️ 「品項」僅掃描收據才有，手動記帳沒有，故改用店名/類別 |
| `mainCharacter` | 預設取 `settings.people`（可選），或分享時手動輸入 | |
| `location` | 分享時手動輸入（預設空，placeholder「日本」） | 當初已砍掉自動地區判定 |
| `goldSentence` | **兩案並陳**（見下） | |
| `photo` | 分享時臨時挑選/拍攝，**不儲存** | 符合既有「不存照片」隱私決定；代價：無法事後重製 |

### 金句（goldSentence）兩案並陳
- **手動模式（預設、永遠可用）**：使用者直接在分享頁輸入。
- **AI 模式（加值）**：按「✨ 幫我想金句」→ 呼叫新端點 `/api/caption`，
  把當日摘要（總額、最大筆、類別分布）送 Gemini 生成一句俏皮話。
  - 依賴 `GEMINI_API_KEY`（目前卡關項）。
  - 無 key / quota / 失敗 → 顯示提示並**自動退回手動輸入**，不阻斷流程。
  - 端點比照 `/api/ocr`：用 `ACCESS_CODE` 驗證 + 逾時保護。

---

## 流程（UX）
1. 進入點：Dashboard「分享今天」按鈕，或歷史頁每日「分享」。
2. 選日期（預設今天）→ 挑/拍照片 → 填 location / mainCharacter / 金句（或按 AI 生成）
   → 選主題 → 預覽 → 輸出/分享。
3. 輸出：DOM 轉 PNG（`html-to-image`）→ `navigator.share({ files })`
   分享到 IG/LINE；不支援時 fallback 下載。

## 架構
- 新路由 `app/share/page.tsx`（orchestrator）。
- `app/components/share/ShareCard.tsx`：依 `theme` 切換渲染。
- 主題用 CSS 實現（規格已指定）：
  - RECURRENT_FEED：絕對定位 IG pill、半透明投票框、emoji 列（純 CSS）。
  - NEWSPAPER_CLIP：照片 `grayscale` 濾鏡、直排明朝大標 `writing-mode: vertical-rl`、副標。
- 新 API（AI 模式）：`app/api/caption/route.ts`，重用 `ACCESS_CODE` + `GEMINI_API_KEY`。

## 相依套件
- `html-to-image`（約 10kb）— 需 npm 安裝。
- 字體：MVP 用系統字（sans / 新細明體 / Noto Serif），避免額外 web font 體積。
  後續主題（點陣字、鋼筆字、日式字幕）再評估載字體。

## 風險 / 注意
- 8 主題是大工程（每個獨立排版+定位），故先 1–2 個。
- 照片臨時性 → 卡片無法事後重製（需重新挑照片）。
- DOM 轉圖在低階手機可能卡頓。
- emoji 跨裝置渲染不一致。
- Web Share API 對 file 分享需做能力偵測 + 下載 fallback。

## 待你拍板
- MVP 兩主題是否就採 RECURRENT_FEED + NEWSPAPER_CLIP？（可換）
- 分享入口放 Dashboard、歷史頁、或兩者皆放？
