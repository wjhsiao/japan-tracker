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

## 定案（2026-06）
- ✅ MVP 兩主題：**RECURRENT_FEED + NEWSPAPER_CLIP**
- ✅ 分享入口：**兩者皆放**
  - Dashboard「今日花費」卡片旁 → 「分享今天」（傳入今天日期）
  - 歷史頁每日標題列 → 「分享」（傳入該日日期）
  - 兩入口共用同一分享流程，差別僅在傳入的 `date`
- ✅ 金句：手動輸入為預設，「✨ 幫我想金句」走 Gemini，失敗退回手動
- ✅ 8 主題全做：RECURRENT_FEED / NEWSPAPER_CLIP / RETRO_ANIME / RETRO_POSTCARD
  / MAGAZINE / TICKET / GAME / POLAROID

## 待實作：可選資訊（金句為主角，資料為配角）— 定案 2026-06

**問題**：目前 8 主題都「寫死」秀金額，但不是每張卡都適合曬金額。改成金句為主角、
資料可選。

**控制方式**：分享頁加一排「顯示資訊」開關標籤（同記帳頁按鈕樣式）：
`[💴 金額] [☀️ 天氣] [📅 第幾天] [📍 地點] [🧾 筆數]`
亮=顯示在卡片、灰=不顯示。

**各資訊來源**：
- 金額 / 筆數 / 日期：當日資料（已有）
- 第幾天：由目前旅程 startDate 推算（Day N）
- 地點：使用者輸入（已有）
- 天氣：**選擇 + 輸入**並用 —— 先選天氣狀態（☀️晴/⛅多雲/☁️陰/🌧️雨/⛈️雷雨/❄️雪/🌫️霧），
  再輸入溫度等文字（如「26°C」），組成「☀️ 26°C」。手動，零成本。

**資料模型**：以 `ShareFields { showAmount, showDayNumber, showLocation, showCount, weather }`
傳入主題；主題改成「渲染已啟用的資訊清單」而非寫死金額。金額關閉時，金額導向的版位
（號外大數字、車票運賃、電玩 SCORE）改用「優先序最高的已啟用資訊」或金句遞補。

**範圍**：需改 8 個主題版面（從寫死金額 → 渲染選定資訊），中等工程。

## 未來評估（非現在做）
- **GPS 自動天氣**：原始構想是抓裝置 GPS 定位 → 連當地天氣。可行且免費：
  Open-Meteo（免金鑰、免帳單，含歷史天氣 archive API）+ 其免費 geocoding。
  複雜點：地名/座標轉換、分享過去日期需查歷史天氣、多 2 個外部呼叫的錯誤處理。
  先以「選擇+輸入」手動天氣上線，此項列為日後加值。
- **AI 金句聯動**：Gemini key 啟用後，「✨ 幫我想金句」可讀當日資料（金額/天氣/地點）
  生成金句，並建議該開哪些「顯示資訊」。
