const axios = require('axios');
require('dotenv').config();

class AIService {
    constructor() {
        this.deepseekApiKey = process.env.DEEPSEEK_API_KEY;
        this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.localFastModel = process.env.LOCAL_FAST_MODEL || 'phi:2.7b';
        
        // Chat history storage
        this.chatHistories = new Map();
    }

    /**
     * Intelligent router to decide which model to use
     */
    async routeQuery(query, context = {}) {
        const { chatId, pdfs = [], mode = 'normal' } = context;
        
        // Online mode always uses DeepSeek
        if (mode === 'online') {
            return await this.useDeepSeek(query, context);
        }
        
        // Check for simple queries
        if (this.isSimpleQuery(query)) {
            return await this.useLocalModel(query, context);
        }
        
        // Research queries or documents -> DeepSeek
        if (this.isResearchQuery(query) || pdfs.length > 0) {
            return await this.useDeepSeek(query, context);
        }
        
        // Default to local for short queries
        if (query.length < 200) {
            return await this.useLocalModel(query, context);
        }
        
        // Everything else -> DeepSeek
        return await this.useDeepSeek(query, context);
    }

    /**
     * Use local Ollama model
     */
    async useLocalModel(query, context) {
        try {
            const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
                model: this.localFastModel,
                prompt: this.formatPrompt(query, context),
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 512,
                }
            });

            return {
                reply: response.data.response,
                model: 'local',
                cost: 0
            };
        } catch (error) {
            console.error('Local model error:', error.message);
            // Fallback to DeepSeek
            return await this.useDeepSeek(query, context);
        }
    }

    /**
     * Use DeepSeek API
     */
    async useDeepSeek(query, context) {
        const { chatId, pdfs = [] } = context;
        
        // Get or create chat history
        if (!this.chatHistories.has(chatId)) {
            this.chatHistories.set(chatId, []);
        }
        const history = this.chatHistories.get(chatId);
        
        try {
            // Format messages
            const messages = [
                {
                    role: 'system',
                    content: this.getSystemPrompt(context)
                },
                ...history.slice(-6), // Last 6 messages
                { role: 'user', content: query }
            ];

            const response = await axios.post(
                'https://api.deepseek.com/v1/chat/completions',
                {
                    model: 'deepseek-chat',
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.deepseekApiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const reply = response.data.choices[0].message.content;
            
            // Update history
            history.push(
                { role: 'user', content: query },
                { role: 'assistant', content: reply }
            );
            this.chatHistories.set(chatId, history);
            
            return {
                reply: reply,
                model: 'deepseek',
                cost: 0.00000014 * response.data.usage.total_tokens,
                citations: this.extractCitations(reply)
            };
        } catch (error) {
            console.error('DeepSeek API error:', error.message);
            // Fallback to local model
            return await this.useLocalModel(query, context);
        }
    }

    // Utility Methods
    isSimpleQuery(query) {
        const simplePatterns = [
            /^hi\b/i,
            /^hello\b/i,
            /^hey\b/i,
            /^thanks?/i,
            /^thank you/i,
            /^bye\b/i,
            /^goodbye/i,
            /^what is your name/i,
            /^who are you/i,
            /^help$/i
        ];
        
        return simplePatterns.some(pattern => pattern.test(query.trim()));
    }

    isResearchQuery(query) {
        const researchPatterns = [
            /research/i,
            /study/i,
            /paper/i,
            /citation/i,
            /reference/i,
            /methodology/i,
            /analysis/i,
            /semantic/i,
            /embedding/i,
            /academic/i
        ];
        
        return researchPatterns.some(pattern => pattern.test(query));
    }

    formatPrompt(query, context) {
        const { pdfs = [] } = context;
        
        if (pdfs.length > 0) {
            return `User has uploaded: ${pdfs.join(', ')}\n\nQuestion: ${query}`;
        }
        
        return query;
    }

    getSystemPrompt(context) {
        const { pdfs = [], mode = 'normal' } = context;
        let prompt = `You are Semantix AI, a research assistant.`;
        
        if (pdfs.length > 0) {
            prompt += ` The user has these documents: ${pdfs.join(', ')}. Consider them in your response.`;
        }
        
        if (mode === 'online') {
            prompt += ` Provide up-to-date information with citations.`;
        }
        
        prompt += ` Be accurate and helpful for academic research.`;
        
        return prompt;
    }

    extractCitations(text) {
        // Simple citation extraction
        const citations = [];
        const patterns = [
            /\[(\d+)\]/g,
            /\((?:[^)]+?\s*)?(?:et al\.)?\s*(?:,?\s*\d{4})?\)/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                citations.push(match[0]);
            }
        });
        
        return citations.length > 0 ? citations.slice(0, 3) : null;
    }
}

module.exports = new AIService();