# 🚀 DBPilot V3: The Enterprise AI Database Co-Pilot | AI 資料庫副駕駛

[English](#english) | [繁體中文](#繁體中文) demo 此專案95% 以上由 claude 與 gpt產生

---

<img width="288" height="215" alt="image" src="https://github.com/user-attachments/assets/bcb26e00-2aa5-43b5-a962-e53f48798d04" />
https://www.youtube.com/watch?v=xbvpvycP0N8

由於本專案同時應用在 寵物店經營 與 股票資訊分析 的場景中，系統需要頻繁查詢 最新新聞資訊 以及 貓舍相關知識資料。

為了提升系統的 可維護性（Maintainability） 與 模組化（Modularity），我們將原本分散在各個功能中的 外部資料存取邏輯 抽離出來，並實作成一個 獨立的資料存取模組（Data Fetching Module）。

<a name="繁體中文"></a>
## 🇹🇼 繁體中文介紹

DBPilot 是一款強大的 AI 驅動資料庫探索與查詢工具，專為技術與非技術人員設計。它在自然語言與複雜的資料庫查詢（目前支援 MongoDB）之間架起了一座智慧橋樑。

### 🌟 核心特性

#### 1. 🧠 智慧 Schema 映射 (AI 增強)
DBPilot 不僅僅是基本的欄位檢測。它利用llm model分析資料樣本並生成：
- **商業用途**：以繁體中文為每個集合（Collection）提供易懂的商業背景說明。
- **技術映射**：詳細的欄位型別與技術含義。
- **深度敘述**：理解巢狀結構與關聯鍵邏輯。

#### 2. 🛡️ 企業級治理與安全
- **人機協作 (Human-in-the-Loop)**：在執行任何查詢前，可設定是否需要使用者手動確認。
- **動態三防護網**：可針對每個集合設定禁用語法（如 `delete`, `drop`）與查詢筆數限制與黑名單(靜止特別collection訪問)。
- **稽核日誌**：每一次查詢、成本與 Token 使用量都會記錄在本地內部資料庫中。

#### 3. 💰 即時成本追蹤
- **精確核算**：根據 Token 使用量即時計算 USD 成本。
- **透明化**：在介面左上角即時顯示當前對話與整體的運算成本。

#### 4. 📖 對話歷史紀錄
- **歷史日誌抽屜**：快速訪問與回顧過往的提問與查詢結果。
- **軟刪除功能**：支援清空歷史視圖，同時在後端保留完整的稽核軌跡。

#### 5. 🔌 雙棲彈性架構
- **Web GUI**：精緻的精靈式介面，即開即用。
- **原生 SDK**：可將 DBPilot 導出為套件，輕鬆嵌入至自家企業系統中。

### 🛠️ 快速上手 (GUI)

0. **環境檢查 (Prerequisite)**：
   - 請確保本地已啟動 **MongoDB (127.0.0.1:27017)**。
   - ⚠️ **安全性提醒**：此資料庫用於儲存 DBPilot 的核心 Metadata、AI 分析快照與稽核日誌。由於這些資訊包含極度隱私的資料架構定義，請務必架設在**您自己的內部專屬伺服器**中，切勿暴露於外部網路。

1. **安裝依賴**：
   ```bash
   npm install
   ```
2. **設定環境變數**：
   建立 `.env` 檔案並填入 `ANTHROPIC_API_KEY` 或 `OPENAI_API_KEY`。
3. **啟動**：
   ```bash
   npm run gui
   ```
4. **連線**：
   開啟 `http://localhost:4000` 並依照三步驟指引完成設定。
     輸入db連線資訊 
     輸入api key
     是否每次都要人為確定

     確定每一個colleciont的規則與介紹可再次儲存

     訪問時可利用右下角查看實際搜尋的語法看是否異常，如果是詢問較為複雜的問題你又擔心的話

---

<a name="english"></a>
## 🇺🇸 English Version

DBPilot is a powerful, AI-driven database exploration and querying tool designed for both technical and non-technical users. It provides an intelligent bridge between natural language and complex database queries (starting with MongoDB).

### 🌟 Key Features

#### 1. 🧠 Smart Schema Mapping (AI-Enriched)
DBPilot goes beyond basic field detection. It uses Claude 3.5 Sonnet to analyze data samples and generate:
- **Business Purpose**: Human-readable explanation of each collection in Traditional Chinese.
- **Technical Mapping**: Detailed field types and meanings.
- **Deep Narratives**: Understanding of nested structures and relationship keys.

#### 2. 🛡️ Enterprise Governance & Security
- **Human-in-the-Loop**: Optional signature requirement before any query execution.
- **Dynamic Guardrails**: Per-collection forbidden syntax (e.g., `delete`, `drop`) and hard row limits.
- **Auditing**: Every query, cost, and token usage is logged to a local internal database.

#### 3. 💰 Real-time Cost Tracking
- **Precision Accounting**: Live calculation of USD costs based on token usage.
- **Transparency**: See exactly how much each query and session costs in the top-left corner.

#### 4. 📖 Conversational History
- **History Drawer**: Quickly access and review previous sessions and queries.
- **Soft-Delete**: Clean your history while maintaining a complete audit trail in the backend.

#### 5. 🔌 Dual-Usage Architecture
- **Web GUI**: A sleek, wizard-style interface for immediate use.
- **Native SDK**: Export DBPilot as a package to embed safe AI-querying into your own applications.

### 🛠️ Quick Start (GUI)

0. **Prerequisite**:
   - Ensure local **MongoDB (127.0.0.1:27017)** is up and running.
   - ⚠️ **Privacy Warning**: This internal database stores DBPilot's core metadata, AI analysis snapshots, and audit logs. Since this includes highly sensitive schema definitions, ensure you deploy this on **your own internal infrastructure**.

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Environment**:
   Create a `.env` file with your `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`.
3. **Launch**:
   ```bash
   npm run gui
   ```
4. **Connect**:
   Open `http://localhost:4000` and follow the 3-step wizard.

---

## 📦 Developer SDK Usage

You can easily integrate DBPilot's intelligence into your custom tools.

```typescript
import { DBPilotCore } from 'dbpilot';

const pilot = new DBPilotCore({
  targetDatabaseUri: 'mongodb://127.0.0.1:27017/my_app',
  cloudApiKey: process.env.ANTHROPIC_API_KEY,
  selectedAiModel: 'claude', // Default
  requireUserApproval: false  // Direct execution for automation
});

await pilot.initialize();

// Natural language to data
const result = await pilot.ask("找出所有消費大於 1000 元的 VIP 客戶");

console.log("Summary:", result.summary);
console.log("Data:", result.data);
console.log("Cost:", result.costUSD);
```

### 🏗️ Architecture

- **Core**: TypeScript + Node.js
- **Internal DB**: Local MongoDB (for metadata, logs, and rules)
- **AI Engines**: Anthropic (Claude), OpenAI, and Ollama support.

---

## 📜 License
Internal Enterprise License - DBPilot Team.
