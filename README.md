🚀 DBPilot V3
AI Database Co-Pilot | 自然語言查詢資料庫
🚀 DBPilot V3
AI 資料庫副駕駛（Natural Language Database Query）

DBPilot 是一個 AI 驅動的資料庫查詢工具，讓使用者可以透過 自然語言 直接查詢資料庫，而不需要撰寫複雜的查詢語法。

系統會將使用者問題轉換為安全的資料庫查詢，並回傳整理好的結果。
🎬 Demo

⚠️ This project is ~95% generated using Claude & GPT

https://www.youtube.com/watch?v=xbvpvycP0N8
目前支援：

MongoDB

未來可擴充至其他資料庫。

✨ 主要功能
🧠 AI Schema 理解

系統會自動分析資料樣本並生成：

Collection 商業用途說明

欄位型別與資料意義

巢狀結構與關聯鍵理解

🛡️ 查詢安全機制

提供多層安全保護：

禁用危險語法
delete
drop

每次查詢筆數限制

Collection 黑名單

可設定 執行前人工確認

💰 AI 成本追蹤

系統會即時計算：

Token 使用量

API 成本 (USD)

方便追蹤 AI 使用費用。

📖 查詢歷史紀錄

保存所有查詢紀錄

支援 UI 清除歷史

後端保留完整稽核紀錄

🔌 雙模式使用

DBPilot 可以兩種方式使用：

Web GUI

提供簡單的網頁操作介面。

SDK

可直接嵌入到企業系統中使用。

🛠 快速開始
1️⃣ 安裝套件
npm install
2️⃣ 設定環境變數

建立 .env

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
3️⃣ 啟動系統
npm run gui
4️⃣ 開啟介面
http://localhost:4000

依序完成：

1️⃣ 輸入資料庫連線
2️⃣ 輸入 AI API Key
3️⃣ 設定查詢安全規則

📦 SDK 使用範例
import { DBPilotCore } from 'dbpilot';

const pilot = new DBPilotCore({
  targetDatabaseUri: 'mongodb://127.0.0.1:27017/my_app',
  cloudApiKey: process.env.ANTHROPIC_API_KEY,
  selectedAiModel: 'claude',
  requireUserApproval: false
});

await pilot.initialize();

const result = await pilot.ask("找出消費超過 1000 元的 VIP 客戶");

console.log(result.summary);
console.log(result.data);
🏗 系統架構

核心框架：Node.js + TypeScript

內部資料庫：MongoDB

AI 模型：Claude / OpenAI / Ollama

DBPilot is an AI-powered database exploration tool that allows users to query databases using natural language.

Instead of writing complex queries, you can simply ask questions in plain language, and DBPilot will translate them into safe database queries.

Currently supports MongoDB, with future support for additional databases.

🎬 Demo

⚠️ This project is ~95% generated using Claude & GPT

https://www.youtube.com/watch?v=xbvpvycP0N8

🌟 Features
🧠 AI Schema Understanding

Automatically analyzes database samples and generates:

Business explanations

Field mappings

Nested structure understanding

🛡️ Safety Guardrails

Built-in protection system:

Forbidden query syntax (delete, drop)

Query row limits

Collection access control

Optional Human-in-the-loop approval

💰 Real-time AI Cost Tracking

Token usage monitoring

Live USD cost calculation (not ready)

Transparent AI usage

📖 Query History

Conversation history

Audit logging

Soft-delete UI with backend trace

🔌 Dual Usage

DBPilot supports two modes:

Web GUI – Wizard-style interface

SDK – Embed into your own systems

🛠 Quick Start
1️⃣ Install
npm install
2️⃣ Setup environment

Create .env

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
3️⃣ Run GUI
npm run gui
4️⃣ Open
http://localhost:4000

Follow the wizard:

Database connection

API key

Query safety settings

📦 SDK Example
import { DBPilotCore } from 'dbpilot';

const pilot = new DBPilotCore({
  targetDatabaseUri: 'mongodb://127.0.0.1:27017/my_app',
  cloudApiKey: process.env.ANTHROPIC_API_KEY,
  selectedAiModel: 'claude',
  requireUserApproval: false
});

await pilot.initialize();

const result = await pilot.ask(
  "Find VIP customers with spending above 1000"
);

console.log(result);
🏗 Architecture

Core: Node.js + TypeScript

Database: MongoDB

AI: Claude / OpenAI / Ollama
