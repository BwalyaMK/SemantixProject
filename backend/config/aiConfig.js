module.exports = {
    // Model selection thresholds
    thresholds: {
        // Use local model for queries under this length
        maxLocalTokens: 512,
        
        // Use local model for these simple queries
        simpleQueryPatterns: [
            /^hi\b/i,
            /^hello\b/i,
            /^hey\b/i,
            /^thanks?/i,
            /^thank you/i,
            /^bye\b/i,
            /^goodbye/i,
            /^what is your name/i,
            /^who are you/i,
            /^help$/i,
            /^\?$/,
            /^\.\.\.$/,
            /^\.$/,
        ],
        
        // Force DeepSeek for these complex queries
        researchQueryPatterns: [
            /research/i,
            /study/i,
            /paper/i,
            /citation/i,
            /reference/i,
            /literature/i,
            /methodology/i,
            /analysis/i,
            /findings/i,
            /conclusion/i,
            /semantic/i,
            /embedding/i,
            /vector/i,
            /academic/i,
            /scholarly/i,
            /pubmed/i,
            /openalex/i,
        ],
        
        // Force DeepSeek when documents are involved
        documentQueryPatterns: [
            /document/i,
            /pdf/i,
            /file/i,
            /upload/i,
            /extract/i,
            /summarize/i,
            /analyze/i,
        ],
    },
    
    // Model endpoints
    endpoints: {
        deepseek: "https://api.deepseek.com/v1/chat/completions",
        ollama: "http://localhost:11434/api/generate",
        ollamaEmbed: "http://localhost:11434/api/embeddings",
    },
    
    // Cost tracking
    costTracking: {
        deepseekPerToken: 0.00000014, // $0.14 per 1M tokens
        maxMonthlyBudget: 10, // $10 monthly budget
    }
};