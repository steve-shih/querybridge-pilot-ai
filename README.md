# AI Natural Language Database Query Engine | AI 自然語言資料庫查詢引擎

DBPilot is a secure middleware layer that converts natural language into database queries. It safely bridges the gap between Large Language Models (LLMs) and your databases by enforcing strict security guards, preventing destructive operations and system overloads.

DBPilot 是一個安全的中介層，能將自然語言轉換為資料庫查詢語法。它在大型語言模型（Large Language Model, LLM）與您的資料庫之間建立了一道安全防線，透過嚴格的防護機制，防止破壞性操作與系統過載。

## 🌟 Why DataPilot? | 核心價值

Directly connecting an Artificial Intelligence (AI) model to a database is highly risky. DataPilot solves these critical issues:
讓 AI 直接操作資料庫充滿風險，DataPilot 解決了以下致命問題：

* **Prevent Data Loss (防止資料遺失)**: Blocks DELETE, DROP, UPDATE, and INSERT commands automatically.
* **Prevent Overload (防止系統過載)**: Enforces strict limits on query execution time and result sets (e.g., no full table scans).
* **Schema Awareness (精準理解結構)**: Feeds accurate database schema context to the AI for higher query accuracy.
* **Self-Healing (自我修復)**: Automatically catches execution errors and prompts the AI to correct and retry the query.

## 🏗️ System Architecture | 系統架構

DataPilot 採用模組化設計，確保職責分離。以下是核心資料流：
1. **使用者 (User)** 輸入自然語言問題。
2. **AI 模型 (LLM)** 接收問題與資料庫結構，生成查詢語法。
3. **DataPilot 攔截並驗證 (Query Guard)** 該查詢。
4. **執行引擎 (Query Runner)** 在資料庫中執行安全的查詢。
5. **結果 (Result)** 回傳並由 AI 解釋給使用者。

## 🧩 Core Components | 核心模組

為了達到最高的可維護性與安全性，系統拆分為以下五大核心模組：

| 模組 (Module) | 英文說明 (Description) | 中文說明 (功能) |
|---|---|---|
| **Schema Explorer** | Inspects DB and generates schema context for AI. | 結構探索器：自動解析資料庫的 Collection / Table、欄位型態與範例資料，提供給 AI 參考。 |
| **Query Guard** | The core safety layer. Blocks dangerous operations. | 查詢守衛：核心安全層。利用正規表達式與語法解析，阻擋所有非讀取的操作，並強制加上 Limit。 |
| **Query Runner** | Executes the verified query securely. | 執行引擎：負責與 MongoDB / SQL 連線並執行已經過安全驗證的查詢。 |
| **Retry Engine** | Handles failures and asks AI to self-correct (Max 3 retries). | 重試引擎：當查詢失敗時，將錯誤訊息（Error Log）倒扣回 AI，要求修正並重試，最多 3 次。 |
| **Query Logger** | Records all prompts, queries, and execution results. | 日誌系統：完整紀錄使用者的問題、AI 生成的語法、執行結果與重試次數，利於後續除錯與稽核。 |

## 📡 API Specification | 應用程式介面規格

DataPilot 提供簡潔且標準化的 RESTful API，並包含完整的狀態碼（Status Code）與錯誤處理。

### POST `/api/v1/query`
將自然語言轉換為資料庫查詢並回傳結果。

**Request Body (請求格式):**
```json
{
  "question": "最近30天新增了多少客戶？",
  "database": "mongodb"
}
```

**Response - 200 OK (成功回應):**
```json
{
  "status": "success",
  "data": {
    "generated_query": "db.customers.countDocuments({ createdAt: { $gte: ISODate('2026-02-10') } })",
    "result": 231,
    "retries": 0
  }
}
```

**Response - 400 Bad Request (驗證失敗或危險操作):**
```json
{
  "status": "error",
  "error": {
    "code": "GUARD_REJECTED",
    "message": "Query contains forbidden operations. Only read operations are allowed."
  }
}
```

**Response - 500 Internal Server Error (多次重試後仍失敗):**
```json
{
  "status": "error",
  "error": {
    "code": "AI_GENERATION_FAILED",
    "message": "Failed to generate a valid query after 3 retries."
  }
}
```

## 📂 Folder Structure | 專案目錄結構

建議採用乾淨架構 (Clean Architecture) 進行模組化封裝，方便未來擴充不同資料庫或 AI 模型：

```plaintext
datapilot/
├── src/
│   ├── config/              # 環境變數與系統設定
│   ├── controllers/         # API 路由與 HTTP 請求處理
│   ├── core/                # 核心業務邏輯 (Use Cases)
│   │   ├── aiGenerator/     # AI Prompt 組合與呼叫
│   │   ├── queryGuard/      # 安全檢查邏輯
│   │   └── retryEngine/     # 重試控制流
│   ├── infrastructure/      # 外部依賴實作
│   │   ├── database/        # DB 連線與 Query Runner (Mongo/SQL)
│   │   └── llmClient/       # OpenAI / Claude API 封裝
│   └── utils/               # Logger 與共用工具
├── logs/                    # 系統執行日誌 (query_log.txt)
├── server.js                # 應用程式進入點
└── package.json
```

## 🚀 Deployment | 部署建議

系統設計為無狀態（Stateless），非常適合容器化部署。
* **Docker**: 內建 Dockerfile，可輕易建置與運行。
* **Google Cloud Platform (GCP)**: 推薦使用 Cloud Run 進行無伺服器（Serverless）部署，具備自動擴展與高可用性。

## 🗺️ Roadmap | 未來發展藍圖

- [x] **MongoDB Support**: 完整支援 MongoDB 查詢與聚合管道 (Aggregation Pipeline)。
- [ ] **SQL Support**: 擴充對 MySQL 與 PostgreSQL 的支援。
- [ ] **Web Dashboard**: 建立視覺化介面，提供查詢歷史檢視與資料庫結構管理。
- [ ] **Query Cost Estimation**: 在執行前預估查詢成本，阻擋過度消耗資源的查詢。
- [ ] **Multi-Model Routing**: 依據問題複雜度，動態切換本地小模型（如 Ollama）或雲端大模型（如 Claude 3.5 Sonnet）。

## 📜 License

MIT License. 歡迎自由發揮與貢獻！
