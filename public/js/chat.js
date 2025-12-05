// Semantix Chat Interface - State Management and Event Handlers

// State Management
const state = {
    currentChatId: null,
    chats: [],
    messages: [],
    pdfs: [],
    totalPdfSize: 0,
    isOnlineMode: false,
    isLoading: false,
    currentMode: 'normal'
};

// DOM Elements
const elements = {
    chatHistorySidebar: document.getElementById('chatHistorySidebar'),
    pdfSidebar: document.getElementById('pdfSidebar'),
    toggleChatHistory: document.getElementById('toggleChatHistory'),
    togglePdfSidebar: document.getElementById('togglePdfSidebar'),
    newChatBtn: document.getElementById('newChatBtn'),
    chatList: document.getElementById('chatList'),
    messagesContainer: document.getElementById('messagesContainer'),
    chatInput: document.getElementById('chatInput'),
    sendBtn: document.getElementById('sendBtn'),
    uploadPdfBtn: document.getElementById('uploadPdfBtn'),
    pdfFileInput: document.getElementById('pdfFileInput'),
    pdfList: document.getElementById('pdfList'),
    pdfTotal: document.getElementById('pdfTotal'),
    modeToggle: document.getElementById('modeToggle'),
    modeToggleSidebar: document.getElementById('modeToggleSidebar'),
    modeIndicator: document.getElementById('modeIndicator'),
    modeText: document.getElementById('modeText'),
    mobileToggleChatHistory: document.getElementById('mobileToggleChatHistory'),
    mobileTogglePdf: document.getElementById('mobileTogglePdf')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadChatHistory();
    updateModeIndicator();
});

// Event Listeners
function initializeEventListeners() {
    // Sidebar toggles
    elements.toggleChatHistory.addEventListener('click', toggleChatHistorySidebar);
    elements.togglePdfSidebar.addEventListener('click', togglePdfSidebar);
    elements.mobileToggleChatHistory.addEventListener('click', toggleChatHistorySidebar);
    elements.mobileTogglePdf.addEventListener('click', togglePdfSidebar);

    // New chat
    elements.newChatBtn.addEventListener('click', handleNewChatClick);

    // Chat input
    elements.chatInput.addEventListener('input', autoResizeTextarea);
    elements.chatInput.addEventListener('keydown', handleInputKeydown);
   // elements.sendBtn.addEventListener('click', sendMessage);
    elements.sendBtn.addEventListener('click', (e) => {
    e.preventDefault(); // <--- STOPS THE "Cannot GET" / PAGE RELOAD
    sendMessage(); });


    // PDF upload
    elements.uploadPdfBtn.addEventListener('click', () => elements.pdfFileInput.click());
    elements.pdfFileInput.addEventListener('change', handlePdfUpload);

    // Mode toggle (supports multiple toggle containers — main and sidebar)
    document.querySelectorAll('.mode-toggle .mode-option').forEach(btn => {
        btn.addEventListener('click', () => toggleMode(btn.dataset.mode));
    });
}

// Chat History Management
function loadChatHistory() {
    // In a real app, this would load from backend
    // For now, create a sample chat if none exist
    if (state.chats.length === 0) {
        createNewChat();
    } else {
        renderChatList();
    }
}

function createNewChat(title) {
    const chatId = generateId();
    const newChat = {
        id: chatId,
        title: title && title.trim() ? title.trim() : 'New Chat',
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    state.chats.unshift(newChat);
    selectChat(chatId);
    renderChatList();
}

// Prompt the user for a chat name before creating a new chat.
function handleNewChatClick() {
    const name = prompt('Enter a name for the new chat (leave blank for "New Chat"):', '');
    if (name === null) {
        // User cancelled the prompt; do nothing
        return;
    }

    createNewChat(name);
}

function selectChat(chatId) {
    state.currentChatId = chatId;
    const chat = state.chats.find(c => c.id === chatId);
    
    if (chat) {
        state.messages = chat.messages;
        renderMessages();
        renderChatList();
    }
}

function deleteChat(chatId) {
    if (confirm('Are you sure you want to delete this chat?')) {
        state.chats = state.chats.filter(c => c.id !== chatId);
        
        if (state.currentChatId === chatId) {
            if (state.chats.length > 0) {
                selectChat(state.chats[0].id);
            } else {
                createNewChat();
            }
        }
        
        renderChatList();
    }
}

function renameChat(chatId) {
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
        const newTitle = prompt('Enter new chat name:', chat.title);
        if (newTitle && newTitle.trim()) {
            chat.title = newTitle.trim();
            renderChatList();
        }
    }
}

function autoNameChat() {
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat && chat.messages.length > 0 && chat.title === 'New Chat') {
        const firstMessage = chat.messages.find(m => m.role === 'user');
        if (firstMessage) {
            chat.title = firstMessage.content.substring(0, 50) + (firstMessage.content.length > 50 ? '...' : '');
            renderChatList();
        }
    }
}

function renderChatList() {
    if (state.chats.length === 0) {
        elements.chatList.innerHTML = '<div class="empty-state"><p>No chats yet</p></div>';
        return;
    }

    elements.chatList.innerHTML = state.chats.map(chat => `
        <div class="chat-item ${chat.id === state.currentChatId ? 'active' : ''}" data-chat-id="${chat.id}">
            <div class="chat-item-title">${escapeHtml(chat.title)}</div>
            <div class="chat-item-preview">${getLastMessagePreview(chat)}</div>
            <div class="chat-item-actions">
                <button onclick="renameChat('${chat.id}')" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteChat('${chat.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Add click listeners
    document.querySelectorAll('.chat-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (!e.target.closest('.chat-item-actions')) {
                selectChat(item.dataset.chatId);
            }
        });
    });
}

function getLastMessagePreview(chat) {
    if (chat.messages.length === 0) return 'No messages yet';
    const lastMessage = chat.messages[chat.messages.length - 1];
    return lastMessage.content.substring(0, 60) + (lastMessage.content.length > 60 ? '...' : '');
}

// Message Management
async function sendMessage() {
    const content = elements.chatInput.value.trim();
    if (!content || state.isLoading) return;

    addMessage('user', content);
    elements.chatInput.value = '';
    autoResizeTextarea();
    autoNameChat();

    state.isLoading = true;
    elements.sendBtn.disabled = true;
    showTypingIndicator();

    try {
        const payload = {
            chatId: state.currentChatId,
            message: content,
            mode: state.currentMode,         // normal / document / online
            pdfs: state.pdfs.map(p => p.name) // you can include IDs instead
        };

        const res = await fetch('/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Server error');

        const data = await res.json();

        hideTypingIndicator();
        // Support both `reply` (new) and `response` (older) keys
        const replyText = data.reply || data.response || "";
        addMessage('assistant', replyText, data.citations || []);

    } catch (err) {
        hideTypingIndicator();
        addMessage('assistant', "I couldn't process that due to a server error. Please try again.");
        console.error(err);

    } finally {
        state.isLoading = false;
        elements.sendBtn.disabled = false;
    }
}


function addMessage(role, content, citations = null) {
    const message = {
        id: generateId(),
        role,
        content,
        citations,
        timestamp: Date.now()
    };

    state.messages.push(message);
    
    // Update current chat
    const chat = state.chats.find(c => c.id === state.currentChatId);
    if (chat) {
        chat.messages = state.messages;
        chat.updatedAt = Date.now();
    }

    renderMessages();
    scrollToBottom();
}

function renderMessages() {
    if (state.messages.length === 0) {
        elements.messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments fa-3x mb-3"></i>
                <h3>Start a conversation</h3>
                <p>Upload PDFs to enable Document-Aware Mode or ask questions directly.</p>
            </div>
        `;
        return;
    }

    elements.messagesContainer.innerHTML = state.messages.map(msg => {
        if (msg.role === 'user') {
            return `
                <div class="message user">
                    <div class="message-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <div class="message-text">${escapeHtml(msg.content)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="message assistant">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-bubble">
                            <div class="message-text">${formatMessageContent(msg.content)}</div>
                            ${msg.citations ? renderCitations(msg.citations) : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    }).join('');
}

function formatMessageContent(content) {
    // Basic markdown-like formatting
    let formatted = escapeHtml(content);
    
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

function renderCitations(citations) {
    if (!citations || citations.length === 0) return '';
    
    return `
        <div class="references">
            <div class="references-title">References:</div>
            ${citations.map((citation, index) => `
                <div class="reference-item">
                    <span class="citation">[${index + 1}]</span> ${escapeHtml(citation)}
                </div>
            `).join('')}
        </div>
    `;
}

function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message assistant';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="message-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    elements.messagesContainer.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

function generateMockResponse() {
    return {
        content: "The server is not available.",
        citations: null
    };
}


// PDF Management
function handlePdfUpload(event) {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
        if (file.type !== 'application/pdf') {
            alert(`${file.name} is not a PDF file`);
            return;
        }

        // Check if already uploaded
        if (state.pdfs.some(pdf => pdf.name === file.name)) {
            alert(`${file.name} is already uploaded`);
            return;
        }

        const sizeInMB = file.size / (1024 * 1024);
        
        // Check total size limit
        if (state.totalPdfSize + sizeInMB > 100) {
            alert(`Cannot upload ${file.name}. Total size would exceed 100MB limit.`);
            return;
        }

        addPdf(file, sizeInMB);
    });

    // Clear input
    event.target.value = '';
}

function addPdf(file, sizeInMB) {
    const pdf = {
        id: generateId(),
        name: file.name,
        size: sizeInMB,
        file: file
    };

    state.pdfs.push(pdf);
    state.totalPdfSize += sizeInMB;
    
    renderPdfList();
    updateModeIndicator();

    // In real app, upload to backend here
    console.log('Uploading PDF:', pdf.name);
}

function removePdf(pdfId) {
    const pdf = state.pdfs.find(p => p.id === pdfId);
    if (!pdf) return;

    if (confirm(`Remove ${pdf.name}?`)) {
        state.pdfs = state.pdfs.filter(p => p.id !== pdfId);
        state.totalPdfSize -= pdf.size;
        
        renderPdfList();
        updateModeIndicator();

        // In real app, delete from backend here
        console.log('Deleting PDF:', pdf.name);
    }
}

function renderPdfList() {
    if (state.pdfs.length === 0) {
        elements.pdfList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open fa-2x mb-2"></i>
                <p>No documents uploaded</p>
                <small>Click the PDF icon below to upload</small>
            </div>
        `;
    } else {
        elements.pdfList.innerHTML = state.pdfs.map(pdf => `
            <div class="pdf-item">
                <div class="pdf-item-header">
                    <div style="display: flex; align-items: flex-start;">
                        <i class="fas fa-file-pdf pdf-item-icon"></i>
                        <div class="pdf-item-info">
                            <div class="pdf-item-name">${escapeHtml(pdf.name)}</div>
                            <div class="pdf-item-size">${pdf.size.toFixed(2)} MB</div>
                        </div>
                    </div>
                    <button class="pdf-item-delete" onclick="removePdf('${pdf.id}')" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    elements.pdfTotal.innerHTML = `
        <span>Total: <strong>${state.totalPdfSize.toFixed(2)} MB</strong> / 100 MB</span>
    `;
}

// Mode Management
function toggleMode(mode) {
    state.isOnlineMode = mode === 'online';
    
    // Update all mode toggle controls present in the DOM
    document.querySelectorAll('.mode-toggle .mode-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    updateModeIndicator();
}

function updateModeIndicator() {
    const hasDocuments = state.pdfs.length > 0;
    const isOnline = state.isOnlineMode;

    let modeText = '';
    let icon = 'fa-circle-info';

    if (!hasDocuments && !isOnline) {
        modeText = 'Normal Mode - No documents uploaded';
        state.currentMode = 'normal';
    } else if (hasDocuments && !isOnline) {
        modeText = `Document-Aware Mode - ${state.pdfs.length} document${state.pdfs.length > 1 ? 's' : ''} loaded`;
        state.currentMode = 'document';
        icon = 'fa-book';
    } else if (isOnline) {
        modeText = hasDocuments 
            ? `Online Mode - Using documents + web search`
            : `Online Mode - Web search enabled`;
        state.currentMode = 'online';
        icon = 'fa-globe';
    }

    if (elements.modeText) {
        elements.modeText.innerHTML = `<i class="fas ${icon} me-1"></i>${modeText}`;
    } else {
        // Fallback: set an ARIA label on visible toggle containers so screen readers
        // and hovering users get context when a dedicated mode indicator isn't present.
        document.querySelectorAll('.mode-toggle').forEach(el => {
            el.setAttribute('aria-label', modeText);
            el.title = modeText;
        });
    }
}

// UI Helpers
function toggleChatHistorySidebar() {
    const isMobile = window.innerWidth < 992;
    
    if (isMobile) {
        elements.chatHistorySidebar.classList.toggle('open');
    } else {
        const isCollapsed = elements.chatHistorySidebar.classList.toggle('collapsed');
        const icon = elements.toggleChatHistory.querySelector('i');
        icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        elements.toggleChatHistory.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    }
}

function togglePdfSidebar() {
    const isMobile = window.innerWidth < 992;
    
    if (isMobile) {
        elements.pdfSidebar.classList.toggle('open');
    } else {
        const isCollapsed = elements.pdfSidebar.classList.toggle('collapsed');
        const icon = elements.togglePdfSidebar.querySelector('i');
        icon.className = isCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
        elements.togglePdfSidebar.title = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
    }
}

function autoResizeTextarea() {
    elements.chatInput.style.height = 'auto';
    elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 150) + 'px';
}

function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Utility Functions
function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close mobile sidebars on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 992) {
        elements.chatHistorySidebar.classList.remove('open');
        elements.pdfSidebar.classList.remove('open');
    }
});

// Make functions globally accessible for inline onclick handlers
window.deleteChat = deleteChat;
window.renameChat = renameChat;
window.removePdf = removePdf;