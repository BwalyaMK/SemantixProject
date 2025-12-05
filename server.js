require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
// below existing routes



// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || "semantix-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Load passport strategies if they exist
try {
    require("./config/passport")(passport);
} catch (error) {
    console.log("Passport config not found, continuing without authentication");
}

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Static files - Serve from public folder
app.use(express.static(path.join(__dirname, "public")));

// API Routes - Updated to use new backend structure
try {
    const aiRoutes = require("./backend/routes/ai/chat");
    app.use("/ai", aiRoutes);
    console.log("AI routes loaded from backend/routes/ai/chat.js");
} catch (error) {
    console.log("AI routes not found in new structure, checking old location...");
    try {
        app.use("/ai", require("./routes/ai"));
        console.log("AI routes loaded from routes/ai.js");
    } catch (error2) {
        console.log("No AI routes found");
    }
}

// Legacy routes - keep for compatibility
try {
    app.use("/auth", require("./routes/auth"));
} catch (error) {
    console.log("Auth routes not found");
}

try {
    app.use("/chat", require("./routes/chat"));
} catch (error) {
    console.log("Chat routes not found");
}

try {
    app.use("/graph", require("./routes/graph"));
} catch (error) {
    console.log("Graph routes not found");
}

// Search route
try {
    app.use("/search", require("./routes/search"));
    console.log("Search routes loaded from routes/search.js");
} catch (error) {
    console.log("Search routes not found");
}

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        service: "Semantix AI",
        version: "1.0.0",
        ai: {
            localModel: process.env.LOCAL_FAST_MODEL || "phi:2.7b",
            apiAvailable: !!process.env.DEEPSEEK_API_KEY
        }
    });
});

// Ollama status check
app.get("/api/ollama-status", async (req, res) => {
    try {
        const axios = require('axios');
        const response = await axios.get('http://localhost:11434/api/tags', { timeout: 3000 });
        res.json({
            status: "running",
            models: response.data.models,
            ollamaUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        });
    } catch (error) {
        res.status(503).json({
            status: "not_running",
            message: "Ollama is not running. Please start it with 'ollama serve'",
            error: error.message
        });
    }
});

// Model list endpoint
app.get("/api/models", (req, res) => {
    res.json({
        local: {
            fast: process.env.LOCAL_FAST_MODEL || "phi:2.7b",
            embedding: process.env.LOCAL_EMBEDDING_MODEL || "nomic-embed-text"
        },
        cloud: {
            deepseek: process.env.DEEPSEEK_API_KEY ? "available" : "not_configured"
        },
        config: {
            ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
        }
    });
});

// Serve frontend files
app.get(["/", "/login"], (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/chat", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 404 handler for API routes - FIXED: Use regex pattern instead of wildcard
app.use(/^\/api\/.*/, (req, res) => {
    res.status(404).json({
        error: "API endpoint not found",
        path: req.originalUrl
    });
});

// Catch-all route for SPA (must be last)
// Use `/*` instead of `*` to avoid path-to-regexp parsing errors
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Server error:", err.stack);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("=".repeat(50));
    console.log("Semantix AI Server Started");
    console.log("=".repeat(50));
    console.log("URL: http://localhost:" + PORT);
    console.log("Static files: " + path.join(__dirname, "public"));
    console.log("AI Endpoint: http://localhost:" + PORT + "/ai/chat");
    console.log("Health check: http://localhost:" + PORT + "/health");
    console.log("Models: http://localhost:" + PORT + "/api/models");
    console.log("Environment: " + (process.env.NODE_ENV || 'development'));
    console.log("=".repeat(50));
    
    // Check Ollama status on startup
    setTimeout(async () => {
        try {
            const axios = require('axios');
            await axios.get('http://localhost:11434/api/tags', { timeout: 2000 });
            console.log("Ollama is running");
        } catch (error) {
            console.log("Ollama is not running. Start it with: ollama serve");
        }
    }, 1000);
});