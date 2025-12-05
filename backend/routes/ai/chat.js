const express = require("express");
const router = express.Router();
const aiService = require("../../services/aiService");

// Main chat endpoint
router.post("/chat", async (req, res) => {
    try {
        const { message, chatId, pdfs = [], mode = 'normal' } = req.body;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        if (!chatId) {
            return res.status(400).json({ error: "Chat ID is required" });
        }

        console.log(`Chat request: ${chatId.substring(0, 8)}..., mode: ${mode}`);

        // Use intelligent routing
        const result = await aiService.routeQuery(message, {
            chatId,
            pdfs,
            mode
        });

        // Return response
        return res.json({
            chatId,
            reply: result.reply,
            citations: result.citations || [],
            model: result.model,
            cost: result.cost,
            tokens: result.tokens || 0
        });

    } catch (err) {
        console.error("AI Service Error:", err);
        return res.status(500).json({
            error: "AI request failed",
            details: err.message
        });
    }
});

// Additional endpoints
router.post("/search", async (req, res) => {
    res.status(501).json({ message: "Semantic search coming soon" });
});

router.get("/stats", async (req, res) => {
    try {
        // Simple stats
        res.json({
            status: "active",
            timestamp: new Date().toISOString(),
            models: {
                local: process.env.LOCAL_FAST_MODEL || "phi:2.7b",
                cloud: "deepseek-chat"
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint
router.post("/test", async (req, res) => {
    try {
        const { model } = req.body;
        
        if (model === 'local') {
            // Test local model
            const axios = require('axios');
            const response = await axios.post('http://localhost:11434/api/generate', {
                model: process.env.LOCAL_FAST_MODEL || 'phi:2.7b',
                prompt: 'Hello, are you working?',
                stream: false
            });
            
            res.json({
                status: 'success',
                model: 'local',
                response: response.data.response
            });
        } else if (model === 'deepseek') {
            // Test DeepSeek
            const result = await aiService.useDeepSeek('Hello, are you working?', {
                chatId: 'test-' + Date.now(),
                pdfs: []
            });
            
            res.json({
                status: 'success',
                model: 'deepseek',
                response: result.reply
            });
        } else {
            res.status(400).json({ error: 'Invalid model specified' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;