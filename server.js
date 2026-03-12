const express = require('express');
const dotenv = require('dotenv');
const queryController = require('./src/controllers/queryController');
const { connectDB } = require('./src/infrastructure/database/mongoRunner');

dotenv.config();

const app = express();
app.use(express.json());

// API 路由
app.post('/api/v1/query', queryController.handleQuery);

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // STEP_01 初始化資料庫連線
        await connectDB();
        console.log('✅ Database connected');

        // STEP_02 啟動伺服器
        app.listen(PORT, () => {
            console.log(`🚀 querybridge-pilot-ai MVP running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
