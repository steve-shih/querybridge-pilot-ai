🚀 DBPilot V3
The Enterprise AI Database Co-Pilot
AI 資料庫副駕駛

Natural Language → Database Query → Structured Result

DBPilot is an AI-powered database exploration tool that bridges the gap between natural language and database queries.

It allows both engineers and non-technical users to interact with databases using simple questions.

🎬 Demo

⚠️ This project is ~95% generated with Claude & GPT

https://www.youtube.com/watch?v=xbvpvycP0N8

Test Database Example

<img width="288" height="215" alt="image" src="https://github.com/user-attachments/assets/bcb26e00-2aa5-43b5-a962-e53f48798d04" />
📌 Project Background

This project was originally developed for two real-world scenarios:

1️⃣ Pet Shop Operations
2️⃣ Stock & Financial Information Analysis

Both scenarios require frequent access to:

Latest News Data

Domain Knowledge Databases (e.g., cattery knowledge)

To improve maintainability and system modularity, the external data fetching logic was separated into an independent module:

📦 Data Fetching Module

This module centralizes all external data access logic and allows:

cleaner architecture

easier maintenance

reusable data connectors

🌏 Language

English

繁體中文

<a name="繁體中文"></a>

🇹🇼 繁體中文介紹
DBPilot 是什麼？

DBPilot 是一款 AI 驅動的資料庫探索與查詢工具，
讓使用者可以透過 自然語言 直接查詢資料庫。

目前主要支援：

MongoDB

並設計成可擴充支援其他資料庫。

🌟 核心特性
🧠 智慧 Schema 映射（AI 強化）

DBPilot 不只是簡單的欄位掃描。

系統會利用 LLM 分析資料樣本，並生成：

商業用途說明
用繁體中文描述每個 Collection 的業務意義

技術欄位映射
分析欄位型別與資料用途

巢狀結構解析
理解 nested object 與 reference key

🛡️ 企業級治理與安全
Human-in-the-Loop

執行查詢前可要求 人工確認

Dynamic Guardrails（三層防護）

每個 collection 可以設定：

禁用語法
delete
drop
update

查詢筆數限制

黑名單 Collection

Audit Log 稽核紀錄

系統會記錄：

每次查詢語法

Token 使用量

API 成本

查詢時間

所有資料都存入 本地 MongoDB

💰 即時 AI 成本追蹤

DBPilot 會即時計算：

Token 使用量

API 成本（USD）

並顯示在 UI 左上角。

讓企業可以清楚掌握 AI 使用成本。

📖 對話歷史紀錄

系統提供：

History Drawer

快速查看過去查詢。

Soft Delete

清除畫面歷史
但保留完整稽核紀錄。

🔌 雙模式架構

DBPilot 可用兩種方式使用：

1️⃣ Web GUI

精靈式 UI
三步驟即可開始使用。

2️⃣ Native SDK

可以直接嵌入企業系統。

🛠️ GUI 快速開始
0️⃣ 環境需求

請先啟動：

MongoDB
127.0.0.1:27017

⚠️ 安全提醒

此資料庫會儲存：

Schema metadata

AI 分析快照

Audit logs

請務必部署於 內部環境。

1️⃣ 安裝依賴
npm install
2️⃣ 設定環境變數

建立 .env

ANTHROPIC_API_KEY=
OPENAI_API_KEY=
3️⃣ 啟動 GUI
npm run gui
4️⃣ 開啟系統
http://localhost:4000

並完成三個設定：

1️⃣ 輸入資料庫連線
2️⃣ 輸入 AI API Key
3️⃣ 設定是否需要人工確認

Collection 規則

每個 Collection 可以設定：

說明

禁用語法

查詢限制

Query Debug

右下角可以查看：

AI 生成的 Query

實際執行語法

<a name="english"></a>

🇺🇸 English Version
What is DBPilot?

DBPilot is an AI-powered database exploration tool that allows users to query databases using natural language.

Currently supported:

MongoDB

Future versions will support additional databases.

🌟 Key Features
🧠 Smart Schema Mapping

DBPilot analyzes real database samples and automatically generates:

Business explanations

Field type mapping

Nested structure understanding

🛡️ Enterprise Governance
Human-in-the-loop

Optional manual confirmation before executing queries.

Guardrails

Per-collection security rules:

forbidden syntax

row limits

collection blacklist

Auditing

Every query records:

query statement

token usage

cost

execution time

Stored in the internal database.

💰 Real-time Cost Tracking

DBPilot calculates AI API cost based on token usage and displays it in the UI.

📖 Conversation History

Features include:

history drawer

soft delete

audit trail

🔌 Dual Usage

DBPilot supports:

Web GUI

Wizard-based interface for instant use.

SDK Integration

Developers can embed DBPilot into their systems.

📦 Developer SDK Example
import { DBPilotCore } from 'dbpilot';

const pilot = new DBPilotCore({
  targetDatabaseUri: 'mongodb://127.0.0.1:27017/my_app',
  cloudApiKey: process.env.ANTHROPIC_API_KEY,
  selectedAiModel: 'claude',
  requireUserApproval: false
});

await pilot.initialize();

const result = await pilot.ask(
  "Find all VIP customers whose spending exceeds 1000"
);

console.log("Summary:", result.summary);
console.log("Data:", result.data);
console.log("Cost:", result.costUSD);
🏗️ Architecture
Component	Technology
Core	Node.js + TypeScript
Internal Database	MongoDB
AI Engine	Claude / OpenAI / Ollama
Interface	Web GUI + SDK
