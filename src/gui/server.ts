import express from 'express';
import cors from 'cors';
import path from 'path';
import { CollectionMetadata, SystemConfig, AuditLog, connectInternalDB } from '../db/internal';
import { DBPilotCore } from '../index';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files using absolute path so it works regardless of CWD
app.use(express.static(path.join(__dirname, '..', '..', 'src', 'gui', 'public')));

let pilot: DBPilotCore | null = null;
let initialized = false;

// ==================== API: Initialize ====================
app.post('/api/init', async (req, res) => {
    try {
        const { targetDatabaseUri, targetDatabaseType, cloudApiKey, selectedAiModel, requireUserApproval } = req.body;
        
        if (!targetDatabaseUri) return res.status(400).json({ error: 'Target Database URI is required' });

        console.log(`[API] Init request: target=${targetDatabaseUri}, model=${selectedAiModel || 'claude'}`);

        pilot = new DBPilotCore({
            systemDatabaseUri: 'mongodb://127.0.0.1:27017/DBPilot',
            targetDatabaseType: targetDatabaseType || 'mongodb',
            targetDatabaseUri: targetDatabaseUri,
            cloudApiKey: cloudApiKey || '',
            selectedAiModel: selectedAiModel || 'claude',
            requireUserApproval: requireUserApproval ?? true
        });
        
        await pilot.initialize();
        initialized = true;

        // Save config
        await SystemConfig.findOneAndUpdate({}, {
            targetDatabaseUri,
            targetDatabaseType: targetDatabaseType || 'mongodb',
            cloudApiKey: cloudApiKey || '',
            selectedAiModel: selectedAiModel || 'claude',
            requireUserApproval: requireUserApproval ?? true
        }, { upsert: true });

        // Return metadata count for confirmation
        const metaCount = await CollectionMetadata.countDocuments();
        res.json({ message: `DBPilot initialized successfully. ${metaCount} collections explored.` });
    } catch (e: any) {
        console.error('[API] Init error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== API: Re-explore (clear and re-scan) ====================
app.post('/api/re-explore', async (req, res) => {
    if (!initialized || !pilot) return res.status(400).json({ error: 'System not initialized' });
    try {
        await CollectionMetadata.deleteMany({});
        await pilot.initialize();
        const metaCount = await CollectionMetadata.countDocuments();
        res.json({ message: `Re-explored. ${metaCount} collections found.` });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== API: Ask ====================
app.post('/api/ask', async (req, res) => {
    if (!initialized || !pilot) return res.status(400).json({ error: 'System not initialized' });
    try {
        const { question } = req.body;
        if (!question) return res.status(400).json({ error: 'Question is required' });
        const response = await pilot.ask(question);
        res.json(response);
    } catch (e: any) {
        console.error('[API] Ask error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== API: Execute approved query ====================
app.post('/api/execute/:queryId', async (req, res) => {
    if (!initialized || !pilot) return res.status(400).json({ error: 'System not initialized' });
    try {
        const result = await pilot.executeApprovedQuery(req.params.queryId);
        res.json(result);
    } catch (e: any) {
        console.error('[API] Execute error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== API: History & Stats ====================
app.get('/api/history', async (_req, res) => {
    try {
        const logs = await AuditLog.find({ deleted: { $ne: true } }).sort({ timestamp: -1 }).limit(10);
        res.json(logs);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/history/:id', async (req, res) => {
    try {
        await AuditLog.findByIdAndUpdate(req.params.id, { deleted: true });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/history/clear', async (_req, res) => {
    try {
        await AuditLog.updateMany({ deleted: { $ne: true } }, { deleted: true });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/stats/cost', async (_req, res) => {
    try {
        const result = await AuditLog.aggregate([
            { $match: { deleted: { $ne: true } } },
            { $group: { _id: null, totalCost: { $sum: "$costUSD" } } }
        ]);
        res.json({ totalCost: result[0]?.totalCost || 0 });
    } catch (e) {
        res.json({ totalCost: 0 });
    }
});

app.post('/api/config', async (req, res) => {
    try {
        const { apiKey, aiModel } = req.body;
        if (!pilot) return res.status(400).json({ error: "System not initialized." });
        pilot.updateConfig(apiKey, aiModel);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== API: Metadata CRUD ====================
app.get('/api/metadata', async (_req, res) => {
    try {
        const metadatas = await CollectionMetadata.find({});
        res.json(metadatas);
    } catch (e: any) {
        res.json([]);
    }
});

app.put('/api/metadata/:id', async (req, res) => {
    try {
        const updated = await CollectionMetadata.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ==================== Start Server ====================
const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
   try {
       await connectInternalDB('mongodb://127.0.0.1:27017/DBPilot');
   } catch (e) {
       console.error('[DBPilot] Could not pre-connect to internal DB:', e);
   }
   console.log(`[GUI Server] Listening on http://localhost:${PORT}`);
});
