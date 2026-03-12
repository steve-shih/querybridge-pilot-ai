import dotenv from 'dotenv';
dotenv.config();

export const Config = {
    // Server Configuration
    PORT: parseInt(process.env.PORT || '4000'),

    // Database Configuration
    INTERNAL_DB_URI: process.env.INTERNAL_DB_URI || 'mongodb://127.0.0.1:27017/querybridge-pilot-ai',

    // Performance Guard Thresholds
    LARGE_COLLECTION_THRESHOLD: parseInt(process.env.LARGE_COLLECTION_THRESHOLD || '10000'),
    DEFAULT_QUERY_LIMIT: parseInt(process.env.DEFAULT_QUERY_LIMIT || '50'),
    SAMPLE_SIZE: parseInt(process.env.SAMPLE_SIZE || '5'),

    // LLM Configuration
    LLM_TIMEOUT: parseInt(process.env.LLM_TIMEOUT || '25000'),

    // AI Models
    MODELS: {
        CLAUDE: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
        GPT4O: process.env.GPT4O_MODEL || "gpt-4o",
        GPT4O_MINI: process.env.GPT4O_MINI_MODEL || "gpt-4o-mini",
        OLLAMA_FALLBACK: process.env.OLLAMA_MODEL || "qwen2.5:7b"
    }
};
