// Chat Memory Management System
class ChatMemory {
    constructor() {
        this.conversations = new Map();
        this.currentConversationId = null;
        this.loadConversations();
    }

    // Create a new conversation
    createConversation(title = 'New Chat') {
        const conversationId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const conversation = {
            id: conversationId,
            title: title,
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.conversations.set(conversationId, conversation);
        this.currentConversationId = conversationId;
        this.saveConversations();
        return conversationId;
    }

    // Add message to current conversation
    addMessage(message) {
        if (!this.currentConversationId) {
            this.createConversation();
        }
        
        const conversation = this.conversations.get(this.currentConversationId);
        if (conversation) {
            conversation.messages.push({
                id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                ...message,
                timestamp: new Date().toISOString()
            });
            
            // Update conversation title if it's the first user message
            if (conversation.messages.length === 1 && message.type === 'user') {
                conversation.title = this.generateConversationTitle(message.content);
            }
            
            conversation.updatedAt = new Date().toISOString();
            this.saveConversations();
        }
    }

    // Get conversation history for AI context
    getConversationContext(limit = 10) {
        if (!this.currentConversationId) return [];
        
        const conversation = this.conversations.get(this.currentConversationId);
        if (!conversation) return [];
        
        // Create context from all messages in chronological order
        const contextMessages = [];
        const messages = conversation.messages;
        
        console.log('Getting conversation context. Total messages:', messages.length);
        
        // Convert all messages to context format
        for (const msg of messages) {
            if (msg.type === 'user') {
                contextMessages.push({
                    role: 'user',
                    content: msg.content
                });
            } else if (msg.type === 'ai') {
                // Use the first AI response found for context (to avoid repetition)
                const existingAssistantMsg = contextMessages[contextMessages.length - 1];
                if (!existingAssistantMsg || existingAssistantMsg.role !== 'assistant') {
                    contextMessages.push({
                        role: 'assistant',
                        content: msg.content
                    });
                }
            }
        }
        
        console.log('Context messages created:', contextMessages.length);
        
        // Return the last 'limit' messages (but keep user-assistant pairs)
        const result = contextMessages.slice(-limit);
        console.log('Returning context:', result);
        return result;
    }

    // Generate conversation title from first message
    generateConversationTitle(content) {
        const words = content.split(' ').slice(0, 6);
        return words.join(' ') + (content.split(' ').length > 6 ? '...' : '');
    }

    // Save to localStorage
    saveConversations() {
        try {
            const conversationsObj = {};
            this.conversations.forEach((value, key) => {
                conversationsObj[key] = value;
            });
            localStorage.setItem('multimind_conversations', JSON.stringify(conversationsObj));
            localStorage.setItem('multimind_current_conversation', this.currentConversationId);
        } catch (error) {
            console.error('Failed to save conversations:', error);
        }
    }

    // Load from localStorage
    loadConversations() {
        try {
            const saved = localStorage.getItem('multimind_conversations');
            const currentId = localStorage.getItem('multimind_current_conversation');
            
            if (saved) {
                const conversationsObj = JSON.parse(saved);
                Object.entries(conversationsObj).forEach(([key, value]) => {
                    this.conversations.set(key, value);
                });
            }
            
            this.currentConversationId = currentId;
        } catch (error) {
            console.error('Failed to load conversations:', error);
        }
    }

    // Switch to different conversation
    switchConversation(conversationId) {
        if (this.conversations.has(conversationId)) {
            this.currentConversationId = conversationId;
            this.saveConversations();
            return true;
        }
        return false;
    }

    // Delete conversation
    deleteConversation(conversationId) {
        this.conversations.delete(conversationId);
        if (this.currentConversationId === conversationId) {
            this.currentConversationId = null;
        }
        this.saveConversations();
    }

    // Rename conversation
    renameConversation(conversationId, newTitle) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.title = newTitle;
            conversation.updatedAt = new Date().toISOString();
            this.saveConversations();
        }
    }

    // Update conversation date
    updateConversationDate(conversationId, newDate) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.updatedAt = newDate;
            this.saveConversations();
        }
    }

    // Get all conversations
    getAllConversations() {
        return Array.from(this.conversations.values())
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    // Get current conversation
    getCurrentConversation() {
        if (!this.currentConversationId) return null;
        return this.conversations.get(this.currentConversationId);
    }
}

// MultiMind Chat Interface - Clean & Optimized Version
class MultiMindChat {
    constructor() {
        // Initialize memory system
        this.memory = new ChatMemory();
        
        // API endpoints for each AI service
        this.apiEndpoints = {
            gemini: 'http://localhost:8001/chat',
            chatgpt: 'http://localhost:8002/chat',
            claude: 'http://localhost:8003/chat',
            grok: 'http://localhost:8004/chat'
        };
        
        this.healthEndpoints = {
            gemini: 'http://localhost:8001/health',
            chatgpt: 'http://localhost:8002/health',
            claude: 'http://localhost:8003/health',
            grok: 'http://localhost:8004/health'
        };
        
        // State management
        this.messageCount = 0;
        this.responseTimes = [];
        this.isProcessing = false;
        this.selectedChatbot = 'all';
        this.maximizedChat = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.checkServiceHealth();
        this.updateSelectionUI();
        this.renderConversationHistory();
        this.loadCurrentConversation();
        this.focusInput();
    }
    
    setupEventListeners() {
        // Send message events
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');
        const clearButton = document.getElementById('clearButton');
        
        sendButton?.addEventListener('click', () => this.sendMessage());
        
        messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
            // Shift + Enter allows new line (default behavior)
        });
        
        messageInput?.addEventListener('input', this.autoResizeTextarea);
        
        // Plus dropdown functionality
        this.setupPlusDropdown();
        
        // Chatbot selection dropdown
        this.setupChatbotSelector();
        
        // Maximize/minimize functionality
        this.setupMaximizeFeature();
        
        // Drag functionality
        this.setupDragFunctionality();
        
        // Global keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Sidebar toggle functionality
        this.setupSidebarToggle();
    }
    
    setupChatbotSelector() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const dropdownOptions = document.querySelectorAll('.dropdown-option');
        
        dropdownToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        dropdownOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectChatbot(option);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container')) {
                this.closeDropdown();
            }
        });
    }
    
    setupMaximizeFeature() {
        const maximizeButtons = document.querySelectorAll('.maximize-btn');
        const overlay = document.getElementById('chatOverlay');
        
        maximizeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chatId = btn.getAttribute('data-chat');
                this.toggleMaximize(chatId);
            });
        });
        
        overlay?.addEventListener('click', () => this.minimizeChat());
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.maximizedChat) {
                this.minimizeChat();
            }
        });
    }
    
    setupDragFunctionality() {
        const dragHandle = document.getElementById('dragHandle');
        
        if (!dragHandle) return;
        
        dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        dragHandle.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        dragHandle.addEventListener('dblclick', () => this.resetInputPosition());
        
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        document.addEventListener('touchmove', (e) => this.drag(e.touches[0]));
        document.addEventListener('touchend', () => this.endDrag());
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Number keys (1-5) to select chatbots when Ctrl is held
            if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const selections = ['all', 'gemini', 'chatgpt', 'claude', 'grok'];
                const index = parseInt(e.key) - 1;
                if (index < selections.length) {
                    const option = document.querySelector(`.dropdown-option[data-value="${selections[index]}"]`);
                    option?.click();
                }
            }
            
            // Escape to clear input
            if (e.key === 'Escape' && !this.maximizedChat) {
                const messageInput = document.getElementById('messageInput');
                if (messageInput) {
                    messageInput.value = '';
                    messageInput.focus();
                }
            }
            
            // Ctrl+B to toggle sidebar
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }
    
    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarShowToggle = document.getElementById('sidebarShowToggle');
        
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        if (sidebarShowToggle) {
            sidebarShowToggle.addEventListener('click', () => this.showSidebar());
        }
        
        // Initialize sidebar state from localStorage
        const sidebarHidden = localStorage.getItem('sidebar-hidden') === 'true';
        if (sidebarHidden) {
            this.hideSidebar();
        }
    }
    
    toggleSidebar() {
        const sidebar = document.querySelector('.conversation-sidebar');
        const mainArea = document.querySelector('.main-chat-area');
        
        if (sidebar && mainArea) {
            const isHidden = sidebar.classList.contains('hidden');
            
            if (isHidden) {
                this.showSidebar();
            } else {
                this.hideSidebar();
            }
        }
    }
    
    hideSidebar() {
        const sidebar = document.querySelector('.conversation-sidebar');
        const mainArea = document.querySelector('.main-chat-area');
        const showToggle = document.getElementById('sidebarShowToggle');
        
        if (sidebar && mainArea) {
            sidebar.classList.add('hidden');
            mainArea.classList.add('sidebar-hidden');
            
            // Show the floating toggle button
            if (showToggle) {
                setTimeout(() => {
                    showToggle.classList.add('visible');
                }, 300); // Wait for sidebar animation to complete
            }
            
            localStorage.setItem('sidebar-hidden', 'true');
        }
    }
    
    showSidebar() {
        const sidebar = document.querySelector('.conversation-sidebar');
        const mainArea = document.querySelector('.main-chat-area');
        const showToggle = document.getElementById('sidebarShowToggle');
        
        if (sidebar && mainArea) {
            sidebar.classList.remove('hidden');
            mainArea.classList.remove('sidebar-hidden');
            
            // Hide the floating toggle button
            if (showToggle) {
                showToggle.classList.remove('visible');
            }
            
            localStorage.setItem('sidebar-hidden', 'false');
        }
    }
    
    // Service Health Management
    async checkServiceHealth() {
        const models = Object.keys(this.apiEndpoints);
        let activeCount = 0;
        
        const healthChecks = models.map(async (model) => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch(this.healthEndpoints[model], {
                    method: 'GET',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    this.updateStatus(model, 'online', 'Online');
                    activeCount++;
                } else {
                    this.updateStatus(model, 'offline', 'Offline');
                }
            } catch (error) {
                console.warn(`${model} service unavailable:`, error.message);
                this.updateStatus(model, 'offline', 'Offline');
            }
        });
        
        await Promise.allSettled(healthChecks);
        
        // Update active models count
        const activeModelsElement = document.getElementById('activeModels');
        if (activeModelsElement) {
            activeModelsElement.textContent = activeCount;
        }
    }
    
    updateStatus(model, status, text) {
        const statusElement = document.getElementById(`${model}-status`);
        if (statusElement) {
            statusElement.textContent = text;
            statusElement.className = `bot-status ${status}`;
        }
    }
    
    // Message Sending Logic
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput?.value.trim();
        
        if (!message || this.isProcessing) {
            return;
        }
        
        console.log('Sending message:', message);
        
        this.isProcessing = true;
        this.updateSendButton(true);
        
        // Add user message to memory
        this.memory.addMessage({
            type: 'user',
            content: message,
            model: null
        });
        
        // Add user message to selected chats
        this.addMessageToSelectedChats(message, 'user');
        
        // Clear input and update UI
        messageInput.value = '';
        this.autoResizeTextarea.call(messageInput);
        this.incrementMessageCount();
        
        // Get conversation context for AI
        const conversationHistory = this.memory.getConversationContext();
        
        const startTime = Date.now();
        
        try {
            // Check if think longer is active
            if (this.activeFeatures && this.activeFeatures.has('think-longer')) {
                this.showThinkingLongerOverlay();
                // Add 8-12 seconds delay for thinking longer
                const thinkingTime = Math.random() * 4000 + 8000; // 8-12 seconds
                await new Promise(resolve => setTimeout(resolve, thinkingTime));
                this.hideThinkingLongerOverlay();
            }
            
            // Create promises for selected models with conversation context
            const promises = this.createRequestPromises(message, conversationHistory);
            
            // Send requests with timeout
            const results = await this.sendWithTimeout(promises, 45000);
            
            console.log('All requests completed:', results);
            
            // Update response time statistics
            const responseTime = (Date.now() - startTime) / 1000;
            this.updateAverageResponseTime(responseTime);
            
            // Update conversation history sidebar
            this.renderConversationHistory();
            
        } catch (error) {
            console.error('Error sending messages:', error);
        } finally {
            this.isProcessing = false;
            this.updateSendButton(false);
        }
    }
    
    createRequestPromises(message, conversationHistory) {
        if (this.selectedChatbot === 'all') {
            return Object.keys(this.apiEndpoints).map(model => 
                this.sendToModel(model, message, conversationHistory)
            );
        } else {
            return [this.sendToModel(this.selectedChatbot, message, conversationHistory)];
        }
    }
    
    async sendWithTimeout(promises, timeout) {
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Overall timeout exceeded')), timeout);
        });
        
        return Promise.race([
            Promise.allSettled(promises),
            timeoutPromise
        ]);
    }
    
    async sendToModel(model, message, conversationHistory = []) {
        const messagesContainer = document.getElementById(`${model}-messages`);
        if (!messagesContainer) return;
        
        let loadingWrapper = null;
        
        try {
            // Show loading indicator
            loadingWrapper = this.createLoadingIndicator(messagesContainer);
            this.updateStatus(model, 'loading', 'Thinking...');
            
            // Make API request with conversation history
            const response = await this.makeApiRequest(model, message, conversationHistory);
            const responseText = this.extractResponseText(response);
            
            // Add AI response to memory
            this.memory.addMessage({
                type: 'ai',
                content: responseText,
                model: model
            });
            
            // Remove loading and add response
            this.removeLoadingIndicator(loadingWrapper);
            this.addMessage(messagesContainer, responseText, 'bot');
            this.updateStatus(model, 'online', 'Online');
            
        } catch (error) {
            console.error(`Error with ${model}:`, error);
            
            this.removeLoadingIndicator(loadingWrapper);
            
            const errorMessage = this.getErrorMessage(model, error);
            this.addMessage(messagesContainer, errorMessage, 'bot error');
            this.updateStatus(model, 'offline', 'Error');
        }
    }
    
    async makeApiRequest(model, message, conversationHistory = []) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        try {
            const response = await fetch(this.apiEndpoints[model], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: message,
                    instructions: 'You are a helpful assistant. Provide clear and concise responses.',
                    conversationHistory: conversationHistory
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                return { response: text };
            }
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }
    
    extractResponseText(data) {
        if (data.response) return data.response;
        if (data.message) return data.message;
        if (data.content) return data.content;
        if (typeof data === 'string') return data;
        return JSON.stringify(data, null, 2);
    }
    
    getErrorMessage(model, error) {
        if (error.name === 'AbortError') {
            return `${model} is taking too long to respond. Please try again.`;
        } else if (error.message.includes('Failed to fetch')) {
            return `Cannot connect to ${model}. Please check if the service is running.`;
        } else {
            return `${model} error: ${error.message}`;
        }
    }
    
    // UI Helper Methods
    createLoadingIndicator(container) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper loading-wrapper';
        
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot loading';
        
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            typingIndicator.appendChild(dot);
        }
        
        loadingDiv.appendChild(typingIndicator);
        wrapper.appendChild(loadingDiv);
        container.appendChild(wrapper);
        
        this.scrollToBottom(container);
        return wrapper;
    }
    
    removeLoadingIndicator(wrapper) {
        if (wrapper?.parentNode) {
            wrapper.remove();
        }
    }
    
    addMessageToSelectedChats(message, type) {
        if (this.selectedChatbot === 'all') {
            Object.keys(this.apiEndpoints).forEach(model => {
                const container = document.getElementById(`${model}-messages`);
                if (container) this.addMessage(container, message, type);
            });
        } else {
            const container = document.getElementById(`${this.selectedChatbot}-messages`);
            if (container) this.addMessage(container, message, type);
        }
    }
    
    addMessage(container, message, type) {
        if (!container) return;
        
        if (type === 'bot' || type === 'bot error') {
            this.addBotMessage(container, message, type);
        } else {
            this.addUserMessage(container, message);
        }
        
        this.scrollToBottom(container);
    }
    
    addBotMessage(container, message, type) {
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        try {
            messageDiv.innerHTML = this.formatMarkdown(message);
        } catch (error) {
            messageDiv.textContent = message;
        }
        
        wrapper.appendChild(messageDiv);
        
        if (type === 'bot') {
            const actions = this.createMessageActions(message);
            wrapper.appendChild(actions);
        }
        
        container.appendChild(wrapper);
        
        // Apply syntax highlighting if available
        if (window.Prism) {
            Prism.highlightAllUnder(messageDiv);
        }
        
        // Add click handlers for custom links
        this.setupCustomLinkHandlers(messageDiv);
        
        // Animate message appearance
        this.animateMessageAppearance(messageDiv);
    }
    
    addUserMessage(container, message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.textContent = message;
        
        container.appendChild(messageDiv);
        this.animateMessageAppearance(messageDiv);
    }
    
    animateMessageAppearance(element) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(10px)';
        
        requestAnimationFrame(() => {
            element.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        });
    }
    
    createMessageActions(originalMessage) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const actions = [
            { emoji: '📋', title: 'Copy response', handler: () => this.copyMessage(originalMessage) },
            { emoji: '👍', title: 'Like response', handler: (btn) => this.likeMessage(btn) },
            { emoji: '👎', title: 'Dislike response', handler: (btn) => this.dislikeMessage(btn) }
        ];
        
        actions.forEach(({ emoji, title, handler }) => {
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.innerHTML = emoji;
            btn.title = title;
            btn.addEventListener('click', () => handler(btn));
            actionsDiv.appendChild(btn);
        });
        
        return actionsDiv;
    }
    
    // Message Actions
    async copyMessage(message) {
        try {
            await navigator.clipboard.writeText(message);
            this.showToast('Copied to clipboard!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = message;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showToast('Copied to clipboard!');
        }
    }
    
    likeMessage(button) {
        this.toggleMessageReaction(button, 'liked', 'Like removed', 'Liked! Thanks for the feedback 👍');
    }
    
    dislikeMessage(button) {
        this.toggleMessageReaction(button, 'disliked', 'Dislike removed', 'Disliked. We\'ll improve! 👎');
    }
    
    toggleMessageReaction(button, className, removeText, addText) {
        const messageWrapper = button.closest('.message-wrapper');
        const allActionBtns = messageWrapper?.querySelectorAll('.action-btn');
        
        if (!allActionBtns) return;
        
        // Reset all buttons in this message
        allActionBtns.forEach(btn => {
            btn.classList.remove('liked', 'disliked');
        });
        
        if (button.classList.contains(className)) {
            button.classList.remove(className);
            this.showToast(removeText);
        } else {
            button.classList.add(className);
            this.showToast(addText);
            
            // Add pulse animation
            button.style.animation = 'pulse 0.6s ease-out';
            setTimeout(() => button.style.animation = '', 600);
        }
    }
    
    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }
    
    // Markdown Formatting
    formatMarkdown(text) {
        let formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Code blocks
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            const languageLabel = this.getLanguageLabel(language);
            return `<pre class="language-${language}" data-language="${languageLabel}"><code class="language-${language}">${code.trim()}</code></pre>`;
        });
        
        // Inline code
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        
        // First, handle markdown-style links and convert them to plain URLs
        formatted = formatted.replace(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g, (match, text, url) => {
            return url; // Just return the URL, removing the markdown formatting
        });
        
        // Also handle cases where URLs are wrapped in brackets
        formatted = formatted.replace(/\[(https?:\/\/[^\]]+)\]/g, (match, url) => {
            return url; // Just return the URL, removing the brackets
        });
        
        // Format URLs with custom clickable links (after cleaning markdown)
        formatted = formatted.replace(/(https?:\/\/[^\s<>"'{}|\\\^`\[\]]+)/g, (match, url) => {
            // Remove trailing punctuation that's not part of the URL
            const cleanUrl = url.replace(/[.,:;!?]*$/, '');
            const trailingPunct = url.substring(cleanUrl.length);
            console.log('Formatting URL:', cleanUrl); // Debug log
            return `<span class="custom-link" data-url="${cleanUrl}">${cleanUrl}</span>${trailingPunct}`;
        });
        
        // Bold text
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Headers
        formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Lists
        formatted = formatted.replace(/^\d+\.\s(.+)$/gm, '<li class="numbered-item">$1</li>');
        formatted = formatted.replace(/^\*\s(.+)$/gm, '<li class="bullet-item">$1</li>');
        formatted = formatted.replace(/(<li class="numbered-item">.*<\/li>)/gs, '<ol>$1</ol>');
        formatted = formatted.replace(/(<li class="bullet-item">.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Paragraphs
        formatted = formatted.replace(/\n\n/g, '</p><p>');
        formatted = '<p>' + formatted + '</p>';
        formatted = formatted.replace(/<p><\/p>/g, '');
        
        return formatted;
    }
    
    getLanguageLabel(lang) {
        const languageMap = {
            'python': 'Python', 'javascript': 'JavaScript', 'js': 'JavaScript',
            'typescript': 'TypeScript', 'ts': 'TypeScript', 'java': 'Java',
            'cpp': 'C++', 'c': 'C', 'csharp': 'C#', 'php': 'PHP',
            'ruby': 'Ruby', 'go': 'Go', 'rust': 'Rust', 'html': 'HTML',
            'css': 'CSS', 'sql': 'SQL', 'bash': 'Bash', 'json': 'JSON',
            'xml': 'XML', 'yaml': 'YAML', 'text': 'Code'
        };
        return languageMap[lang.toLowerCase()] || lang.toUpperCase();
    }
    
    // Dropdown Management
    toggleDropdown() {
        const dropdownMenu = document.getElementById('dropdownMenu');
        const dropdownToggle = document.getElementById('dropdownToggle');
        
        if (dropdownMenu?.classList.contains('show')) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    openDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        dropdownToggle?.classList.add('open');
        dropdownMenu?.classList.add('show');
    }
    
    closeDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        dropdownToggle?.classList.remove('open');
        dropdownMenu?.classList.remove('show');
    }
    
    selectChatbot(option) {
        // Remove active class from all options
        document.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('active'));
        
        // Add active class to selected option
        option.classList.add('active');
        
        // Update selected chatbot
        this.selectedChatbot = option.dataset.value;
        
        // Update dropdown display
        this.updateDropdownDisplay(option);
        
        // Update UI
        this.updateSelectionUI();
        
        // Close dropdown
        this.closeDropdown();
    }
    
    updateDropdownDisplay(selectedOption) {
        const selectedIcon = document.querySelector('.selected-icon');
        
        if (!selectedIcon) return;
        
        const optionIcon = selectedOption.querySelector('.option-icon');
        
        if (optionIcon?.tagName === 'IMG') {
            selectedIcon.src = optionIcon.src;
            selectedIcon.alt = optionIcon.alt;
        }
    }
    
    updateSelectionUI() {
        this.updateSendButtonText();
        this.updateInputPlaceholder();
        this.updateChatWindowIndicators();
    }
    
    updateSendButtonText() {
        const sendButtonText = document.getElementById('sendButtonText');
        if (!sendButtonText) return;
        
        if (this.selectedChatbot === 'all') {
            sendButtonText.textContent = 'Send to All';
        } else {
            const chatbotNames = {
                gemini: 'Gemini', chatgpt: 'ChatGPT', 
                claude: 'Claude', grok: 'Grok'
            };
            sendButtonText.textContent = `Send to ${chatbotNames[this.selectedChatbot]}`;
        }
    }
    
    updateInputPlaceholder() {
        const messageInput = document.getElementById('messageInput');
        if (!messageInput) return;
        
        if (this.selectedChatbot === 'all') {
            messageInput.placeholder = 'Type your message to all AI models...';
        } else {
            const chatbotNames = {
                gemini: 'Gemini', chatgpt: 'ChatGPT', 
                claude: 'Claude', grok: 'Grok'
            };
            messageInput.placeholder = `Type your message to ${chatbotNames[this.selectedChatbot]}...`;
        }
    }
    
    updateChatWindowIndicators() {
        const models = Object.keys(this.apiEndpoints);
        
        models.forEach(model => {
            const chatBot = document.getElementById(`${model}-chat`);
            if (!chatBot) return;
            
            if (this.selectedChatbot === 'all' || this.selectedChatbot === model) {
                chatBot.classList.remove('dimmed');
                chatBot.classList.add('active-target');
            } else {
                chatBot.classList.add('dimmed');
                chatBot.classList.remove('active-target');
            }
        });
    }
    
    // Send Button Management
    updateSendButton(isLoading) {
        const sendButton = document.getElementById('sendButton');
        const sendButtonText = document.getElementById('sendButtonText');
        
        if (!sendButton || !sendButtonText) return;
        
        if (isLoading) {
            sendButton.disabled = true;
            sendButtonText.textContent = 'Sending...';
            sendButton.style.opacity = '0.7';
        } else {
            sendButton.disabled = false;
            sendButton.style.opacity = '1';
            this.updateSendButtonText();
        }
    }
    
    // Maximize/Minimize Chat Windows
    toggleMaximize(chatId) {
        if (this.maximizedChat === chatId) {
            this.minimizeChat();
        } else {
            this.maximizeChat(chatId);
        }
    }
    
    maximizeChat(chatId) {
        if (this.maximizedChat) {
            this.minimizeChat();
        }
        
        const chatElement = document.getElementById(chatId);
        const chatGrid = document.querySelector('.chat-grid');
        const overlay = document.getElementById('chatOverlay');
        const maximizeBtn = chatElement?.querySelector('.maximize-btn');
        const icon = maximizeBtn?.querySelector('.maximize-icon');
        const inputSection = document.getElementById('inputSection');
        
        if (!chatElement || !chatGrid || !overlay) return;
        
        chatElement.classList.add('maximized');
        chatGrid.classList.add('has-maximized');
        overlay.classList.add('active');
        maximizeBtn?.classList.add('minimized');
        inputSection?.classList.add('draggable');
        
        if (icon) {
            icon.textContent = '✕';
            maximizeBtn.title = 'Minimize';
        }
        
        this.maximizedChat = chatId;
        
        // Scroll to bottom
        const messagesContainer = chatElement.querySelector('.chat-messages');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    minimizeChat() {
        if (!this.maximizedChat) return;
        
        const chatElement = document.getElementById(this.maximizedChat);
        const chatGrid = document.querySelector('.chat-grid');
        const overlay = document.getElementById('chatOverlay');
        const maximizeBtn = chatElement?.querySelector('.maximize-btn');
        const icon = maximizeBtn?.querySelector('.maximize-icon');
        const inputSection = document.getElementById('inputSection');
        
        chatElement?.classList.remove('maximized');
        chatGrid?.classList.remove('has-maximized');
        overlay?.classList.remove('active');
        maximizeBtn?.classList.remove('minimized');
        inputSection?.classList.remove('draggable');
        
        if (icon) {
            icon.textContent = '⛶';
            maximizeBtn.title = 'Maximize';
        }
        
        this.resetInputPosition();
        this.maximizedChat = null;
    }
    
    // Drag Functionality
    startDrag(e) {
        if (!this.maximizedChat) return;
        
        this.isDragging = true;
        const inputSection = document.getElementById('inputSection');
        const rect = inputSection?.getBoundingClientRect();
        
        if (rect) {
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
        }
        
        inputSection?.classList.add('dragging');
        e.preventDefault();
    }
    
    drag(e) {
        if (!this.isDragging || !this.maximizedChat) return;
        
        const inputSection = document.getElementById('inputSection');
        if (!inputSection) return;
        
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        
        const maxX = window.innerWidth - inputSection.offsetWidth;
        const maxY = window.innerHeight - inputSection.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(newX, maxX));
        const constrainedY = Math.max(0, Math.min(newY, maxY));
        
        inputSection.style.left = constrainedX + 'px';
        inputSection.style.top = constrainedY + 'px';
        inputSection.style.bottom = 'auto';
        inputSection.style.transform = 'none';
        
        e.preventDefault();
    }
    
    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        const inputSection = document.getElementById('inputSection');
        inputSection?.classList.remove('dragging');
    }
    
    resetInputPosition() {
        const inputSection = document.getElementById('inputSection');
        if (inputSection) {
            inputSection.style.left = '50%';
            inputSection.style.top = 'auto';
            inputSection.style.bottom = '0.5rem';
            inputSection.style.transform = 'translateX(-50%)';
        }
    }
    
    // Utility Methods
    incrementMessageCount() {
        this.messageCount++;
        const totalMessagesElement = document.getElementById('totalMessages');
        if (totalMessagesElement) {
            totalMessagesElement.textContent = this.messageCount;
        }
    }
    
    updateAverageResponseTime(newTime) {
        this.responseTimes.push(newTime);
        const average = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
        const avgResponseTimeElement = document.getElementById('avgResponseTime');
        if (avgResponseTimeElement) {
            avgResponseTimeElement.textContent = average.toFixed(1) + 's';
        }
    }
    
    autoResizeTextarea() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    }
    
    scrollToBottom(container) {
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    
    focusInput() {
        const messageInput = document.getElementById('messageInput');
        messageInput?.focus();
    }
    
    clearAllChats() {
        if (!confirm('Are you sure you want to clear the current conversation?')) {
            return;
        }
        
        // Clear current conversation from memory
        const currentConversation = this.memory.getCurrentConversation();
        if (currentConversation) {
            currentConversation.messages = [];
            this.memory.saveConversations();
        }
        
        // Clear UI
        this.clearChatInterface();
        
        // Update conversation history sidebar
        this.renderConversationHistory();
        
        // Reset statistics for current session
        this.messageCount = 0;
        this.responseTimes = [];
        
        const totalMessagesElement = document.getElementById('totalMessages');
        const avgResponseTimeElement = document.getElementById('avgResponseTime');
        
        if (totalMessagesElement) totalMessagesElement.textContent = '0';
        if (avgResponseTimeElement) avgResponseTimeElement.textContent = '0.0s';
    }
    
    // Conversation History Management
    renderConversationHistory() {
        const conversations = this.memory.getAllConversations();
        const historyContainer = document.getElementById('conversationHistory');
        
        if (!historyContainer) return;

        historyContainer.innerHTML = `
            <div class="conversation-header">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 600; color: #ffffff;">Chat History</h3>
            </div>
            <div class="conversations-list">
                ${conversations.map(conv => `
                    <div class="conversation-item ${conv.id === this.memory.currentConversationId ? 'active' : ''}" 
                         onclick="chatInstance.switchToConversation('${conv.id}')">
                        <div class="conversation-title" 
                             ondblclick="event.stopPropagation(); chatInstance.startRenameConversation('${conv.id}', this, 'title')"
                             data-conversation-id="${conv.id}"
                             title="Double-click to edit title">${conv.title}</div>
                        <div class="conversation-date" 
                             ondblclick="event.stopPropagation(); chatInstance.startRenameConversation('${conv.id}', this, 'date')"
                             data-conversation-id="${conv.id}"
                             data-raw-date="${conv.updatedAt}"
                             title="Double-click to edit date">${this.formatDate(conv.updatedAt)}</div>
                        <div class="conversation-actions">
                            <button class="edit-title-conversation" onclick="event.stopPropagation(); chatInstance.startRenameConversation('${conv.id}', this.parentElement.parentElement.querySelector('.conversation-title'), 'title')" title="Edit title">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                                </svg>
                            </button>
                            <button class="edit-date-conversation" onclick="event.stopPropagation(); chatInstance.startRenameConversation('${conv.id}', this.parentElement.parentElement.querySelector('.conversation-date'), 'date')" title="Edit date">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                    <line x1="16" y1="2" x2="16" y2="6"/>
                                    <line x1="8" y1="2" x2="8" y2="6"/>
                                    <line x1="3" y1="10" x2="21" y2="10"/>
                                </svg>
                            </button>
                            <button class="delete-conversation" onclick="event.stopPropagation(); chatInstance.deleteConversation('${conv.id}')" title="Delete chat">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Start new conversation
    startNewConversation() {
        this.memory.createConversation();
        this.clearChatInterface();
        this.renderConversationHistory();
    }

    // Switch to existing conversation
    switchToConversation(conversationId) {
        if (this.memory.switchConversation(conversationId)) {
            this.loadConversationMessages();
            this.renderConversationHistory();
        }
    }

    // Delete conversation
    deleteConversation(conversationId) {
        if (confirm('Are you sure you want to delete this conversation?')) {
            this.memory.deleteConversation(conversationId);
            if (conversationId === this.memory.currentConversationId) {
                this.clearChatInterface();
            }
            this.renderConversationHistory();
        }
    }

    // Start renaming conversation (title or date)
    startRenameConversation(conversationId, element, type = 'title') {
        const currentValue = type === 'title' ? element.textContent : element.dataset.rawDate;
        const displayValue = element.textContent;
        
        // Create input element
        const input = document.createElement('input');
        input.className = type === 'title' ? 'conversation-title-input' : 'conversation-date-input';
        
        if (type === 'title') {
            input.type = 'text';
            input.value = currentValue;
            input.placeholder = 'Enter chat title...';
        } else {
            input.type = 'datetime-local';
            // Convert ISO string to datetime-local format
            if (currentValue) {
                const date = new Date(currentValue);
                const localDateTime = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
                input.value = localDateTime.toISOString().slice(0, 16);
            }
        }
        
        // Replace element with input
        element.style.display = 'none';
        element.parentNode.insertBefore(input, element);
        
        // Focus and select text
        input.focus();
        if (type === 'title') {
            input.select();
        }
        
        // Handle input events
        const finishEdit = () => {
            let newValue = input.value.trim();
            let hasChanged = false;
            
            if (type === 'title') {
                hasChanged = newValue && newValue !== currentValue;
                if (hasChanged) {
                    this.renameConversation(conversationId, newValue);
                }
            } else {
                if (newValue) {
                    // Convert datetime-local to ISO string
                    const newDate = new Date(newValue).toISOString();
                    hasChanged = newDate !== currentValue;
                    if (hasChanged) {
                        this.updateConversationDate(conversationId, newDate);
                    }
                }
            }
            
            input.remove();
            element.style.display = 'block';
        };
        
        const cancelEdit = () => {
            input.remove();
            element.style.display = 'block';
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    // Rename conversation
    renameConversation(conversationId, newTitle) {
        this.memory.renameConversation(conversationId, newTitle);
        this.renderConversationHistory();
    }

    // Update conversation date
    updateConversationDate(conversationId, newDate) {
        this.memory.updateConversationDate(conversationId, newDate);
        this.renderConversationHistory();
    }

    // Load messages for current conversation
    loadCurrentConversation() {
        const conversation = this.memory.getCurrentConversation();
        if (conversation && conversation.messages.length > 0) {
            this.loadConversationMessages();
        }
    }

    // Load messages for current conversation
    loadConversationMessages() {
        const conversation = this.memory.getCurrentConversation();
        if (!conversation) return;

        this.clearChatInterface();
        
        // Group messages and render them
        const messageGroups = this.groupMessagesByExchange(conversation.messages);
        messageGroups.forEach(group => this.renderMessageGroup(group));
    }

    // Group messages by user-AI exchange
    groupMessagesByExchange(messages) {
        const groups = [];
        let currentGroup = null;
        
        messages.forEach(message => {
            if (message.type === 'user') {
                if (currentGroup) groups.push(currentGroup);
                currentGroup = { userMessage: message, aiResponses: [] };
            } else if (currentGroup && message.type === 'ai') {
                currentGroup.aiResponses.push(message);
            }
        });
        
        if (currentGroup) groups.push(currentGroup);
        return groups;
    }

    // Render a message group (user message + AI responses)
    renderMessageGroup(group) {
        // Add user message to all visible chat containers
        if (this.selectedChatbot === 'all') {
            Object.keys(this.apiEndpoints).forEach(model => {
                const container = document.getElementById(`${model}-messages`);
                if (container) {
                    this.addMessage(container, group.userMessage.content, 'user');
                }
            });
        } else {
            const container = document.getElementById(`${this.selectedChatbot}-messages`);
            if (container) {
                this.addMessage(container, group.userMessage.content, 'user');
            }
        }

        // Add AI responses to their respective containers
        group.aiResponses.forEach(aiMessage => {
            if (aiMessage.model) {
                const container = document.getElementById(`${aiMessage.model}-messages`);
                if (container) {
                    this.addMessage(container, aiMessage.content, 'bot');
                }
            }
        });
    }

    // Clear chat interface
    clearChatInterface() {
        Object.keys(this.apiEndpoints).forEach(model => {
            const container = document.getElementById(`${model}-messages`);
            if (container) container.innerHTML = '';
        });
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }

    // Custom Link Handling
    setupCustomLinkHandlers(container) {
        const customLinks = container.querySelectorAll('.custom-link');
        console.log('Setting up custom link handlers for', customLinks.length, 'links'); // Debug log
        customLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Custom link clicked:', e.target.dataset.url); // Debug log
                this.showLinkOptionsMenu(e.target, e.target.dataset.url);
            });
        });
    }
    
    showLinkOptionsMenu(linkElement, url) {
        // Remove any existing menu
        const existingMenu = document.querySelector('.link-options-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Create options menu
        const menu = document.createElement('div');
        menu.className = 'link-options-menu';
        
        // Copy Link option
        const copyOption = document.createElement('div');
        copyOption.className = 'link-option';
        copyOption.innerHTML = '<span class="link-option-icon">📋</span><span class="link-option-text">Copy Link</span>';
        copyOption.addEventListener('click', () => {
            this.copyLinkToClipboard(url);
            menu.remove();
        });
        
        // Open Link option
        const openOption = document.createElement('div');
        openOption.className = 'link-option';
        openOption.innerHTML = '<span class="link-option-icon">🔗</span><span class="link-option-text">Open Link</span>';
        openOption.addEventListener('click', () => {
            window.open(url, '_blank', 'noopener,noreferrer');
            menu.remove();
        });
        
        menu.appendChild(copyOption);
        menu.appendChild(openOption);
        
        // Position menu near the clicked link
        const rect = linkElement.getBoundingClientRect();
        menu.style.top = (rect.bottom + window.scrollY + 5) + 'px';
        menu.style.left = rect.left + 'px';
        
        // Add to page
        document.body.appendChild(menu);
        
        // Show menu with animation
        requestAnimationFrame(() => {
            menu.classList.add('show');
        });
        
        // Close menu when clicking outside
        const closeMenu = (e) => {
            if (!menu.contains(e.target) && e.target !== linkElement) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 100);
        
        // Close menu on escape key
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                menu.remove();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }
    
    async copyLinkToClipboard(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showLinkFeedback('Link copied to clipboard! 📋');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = url;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                this.showLinkFeedback('Link copied to clipboard! 📋');
            } catch (err) {
                this.showLinkFeedback('Failed to copy link');
            }
            document.body.removeChild(textArea);
        }
    }
    
    showLinkFeedback(message) {
        // Create feedback notification
        const feedback = document.createElement('div');
        feedback.className = 'link-feedback';
        feedback.textContent = message;
        
        // Position at bottom right
        feedback.style.position = 'fixed';
        feedback.style.bottom = '100px';
        feedback.style.right = '20px';
        feedback.style.zIndex = '10000';
        
        document.body.appendChild(feedback);
        
        // Show with animation
        requestAnimationFrame(() => {
            feedback.classList.add('show');
        });
        
        // Hide and remove after 3 seconds
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }

    // Debug Methods
    emergencyReset() {
        console.log('Emergency reset triggered');
        this.isProcessing = false;
        this.updateSendButton(false);
        console.log('Emergency reset completed');
    }
    
    testAddMessage(model = 'gemini', message = 'Test message from console') {
        const container = document.getElementById(`${model}-messages`);
        if (container) {
            this.addMessage(container, message, 'bot');
            console.log('Test message added to', model);
        }
    }
    
    // Test link formatting function
    testLinkFormatting() {
        const testMessage = `Here are some useful links:
        
• https://www.codecademy.com - Great for learning coding
• https://www.freecodecamp.org - Free coding courses
• https://www.udacity.com/courses - Nanodegree programs

Check out https://www.python.org for Python documentation.`;
        
        console.log('Testing link formatting...');
        this.testAddMessage('gemini', testMessage);
    }

    // Improve Prompt Feature
    async improvePrompt() {
        const messageInput = document.getElementById('messageInput');
        const currentPrompt = messageInput?.value.trim();
        
        if (!currentPrompt) {
            this.showNotification('Please enter a prompt to improve', 'warning');
            return;
        }
        
        if (this.isProcessing) {
            this.showNotification('Please wait for current operation to complete', 'info');
            return;
        }
        
        console.log('Improving prompt:', currentPrompt);
        
        // Show tech animation
        this.showTechAnimation();
        
        // Disable button during processing
        const improveButton = document.getElementById('improvePromptButton');
        if (improveButton) {
            improveButton.disabled = true;
            improveButton.classList.add('processing');
        }
        
        try {
            const improvedPrompt = await this.callImprovePromptAPI(currentPrompt);
            
            if (improvedPrompt && improvedPrompt !== currentPrompt) {
                // Replace the prompt in the input field
                messageInput.value = improvedPrompt;
                this.autoResizeTextarea.call(messageInput);
                this.showNotification('Prompt improved successfully!', 'success');
            } else {
                this.showNotification('Your prompt is already well-structured!', 'info');
            }
        } catch (error) {
            console.error('Error improving prompt:', error);
            this.showNotification('Failed to improve prompt. Please try again.', 'error');
        } finally {
            // Hide animation and re-enable button
            this.hideTechAnimation();
            if (improveButton) {
                improveButton.disabled = false;
                improveButton.classList.remove('processing');
            }
        }
    }

    async callImprovePromptAPI(prompt) {
        // List of available AI services for prompt improvement
        const services = [
            { name: 'Gemini', url: 'http://localhost:8001/improve-prompt' },
            { name: 'ChatGPT', url: 'http://localhost:8002/improve-prompt' },
            { name: 'Claude', url: 'http://localhost:8003/improve-prompt' },
            { name: 'Grok', url: 'http://localhost:8004/improve-prompt' }
        ];
        
        // Try each service until one works
        for (const service of services) {
            try {
                console.log(`Trying to improve prompt with ${service.name}...`);
                const response = await fetch(service.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ prompt })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Successfully improved prompt using ${service.name}`);
                    return data.improved_prompt;
                }
            } catch (error) {
                console.warn(`Failed to connect to ${service.name}:`, error.message);
                continue; // Try next service
            }
        }
        
        // If all services failed
        throw new Error('All AI services are unavailable. Please make sure at least one backend service is running.');
    }

    showTechAnimation() {
        const overlay = document.getElementById('techAnimationOverlay');
        if (overlay) {
            overlay.style.display = 'block';
            this.createNeuralNetwork();
            this.createCodeStream();
        }
    }

    hideTechAnimation() {
        const overlay = document.getElementById('techAnimationOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    createNeuralNetwork() {
        const container = document.getElementById('neuralNetwork');
        if (!container) return;
        
        // Clear existing nodes
        container.innerHTML = '';
        
        // Create neural network nodes
        const layers = [
            { nodes: 3, x: 20 },
            { nodes: 4, x: 100 },
            { nodes: 3, x: 180 }
        ];
        
        layers.forEach((layer, layerIndex) => {
            for (let i = 0; i < layer.nodes; i++) {
                const node = document.createElement('div');
                node.className = 'neural-node';
                node.style.left = `${layer.x}px`;
                node.style.top = `${30 + (i * 30)}px`;
                node.style.animationDelay = `${layerIndex * 0.3 + i * 0.1}s`;
                container.appendChild(node);
                
                // Create connections to next layer
                if (layerIndex < layers.length - 1) {
                    const nextLayer = layers[layerIndex + 1];
                    for (let j = 0; j < nextLayer.nodes; j++) {
                        const connection = document.createElement('div');
                        connection.className = 'neural-connection';
                        
                        const startY = 30 + (i * 30) + 6; // +6 for node center
                        const endY = 30 + (j * 30) + 6;
                        const length = Math.sqrt(Math.pow(nextLayer.x - layer.x, 2) + Math.pow(endY - startY, 2));
                        const angle = Math.atan2(endY - startY, nextLayer.x - layer.x) * 180 / Math.PI;
                        
                        connection.style.left = `${layer.x + 6}px`;
                        connection.style.top = `${startY}px`;
                        connection.style.width = `${length}px`;
                        connection.style.transform = `rotate(${angle}deg)`;
                        connection.style.animationDelay = `${(layerIndex * 0.3 + i * 0.1 + j * 0.05)}s`;
                        
                        container.appendChild(connection);
                    }
                }
            }
        });
    }

    createCodeStream() {
        const container = document.getElementById('codeStream');
        if (!container) return;
        
        container.innerHTML = '';
        
        const codeLines = [
            'if (prompt.clarity < threshold) enhance();',
            'const optimized = AI.improve(userInput);',
            'function analyzeSyntax(text) { return parse(text); }',
            'neural_network.forward_pass(embeddings);',
            'response = transformer.generate(prompt);',
            'while (improving) { refine_structure(); }'
        ];
        
        codeLines.forEach((line, index) => {
            const codeLine = document.createElement('div');
            codeLine.className = 'code-line';
            codeLine.textContent = line;
            codeLine.style.top = `${index * 25 + 10}px`;
            codeLine.style.animationDelay = `${index * 0.4}s`;
            container.appendChild(codeLine);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10001',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        });
        
        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Show notification
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Plus Dropdown Functionality
    setupPlusDropdown() {
        const plusButton = document.getElementById('plusButton');
        const dropdownMenu = document.getElementById('plusDropdownMenu');
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        
        this.activeFeatures = new Set();
        
        // Toggle dropdown
        plusButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlusDropdown();
        });
        
        // Handle dropdown item clicks
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const feature = item.dataset.feature;
                this.handleFeatureSelection(feature, item);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.plus-dropdown-container')) {
                this.closePlusDropdown();
            }
        });
    }
    
    togglePlusDropdown() {
        const plusButton = document.getElementById('plusButton');
        const dropdownMenu = document.getElementById('plusDropdownMenu');
        
        if (dropdownMenu.classList.contains('show')) {
            this.closePlusDropdown();
        } else {
            this.openPlusDropdown();
        }
    }
    
    openPlusDropdown() {
        const plusButton = document.getElementById('plusButton');
        const dropdownMenu = document.getElementById('plusDropdownMenu');
        
        plusButton.classList.add('active');
        dropdownMenu.classList.add('show');
    }
    
    closePlusDropdown() {
        const plusButton = document.getElementById('plusButton');
        const dropdownMenu = document.getElementById('plusDropdownMenu');
        
        plusButton.classList.remove('active');
        dropdownMenu.classList.remove('show');
    }
    
    handleFeatureSelection(feature, itemElement) {
        switch (feature) {
            case 'improve-prompt':
                this.improvePrompt();
                break;
            case 'think-longer':
                this.toggleThinkLonger(itemElement);
                break;
            case 'clear-chat':
                this.clearAllChats();
                break;
        }
        
        this.closePlusDropdown();
    }
    
    toggleThinkLonger(itemElement) {
        if (this.activeFeatures.has('think-longer')) {
            this.activeFeatures.delete('think-longer');
            itemElement.classList.remove('active');
            this.showNotification('Think longer disabled', 'info');
        } else {
            this.activeFeatures.add('think-longer');
            itemElement.classList.add('active');
            this.showNotification('Think longer enabled - AI will process for 8-12 seconds', 'success');
        }
        
        this.updateSelectedFeatures();
    }
    
    updateSelectedFeatures() {
        const selectedFeaturesContainer = document.getElementById('selectedFeatures');
        selectedFeaturesContainer.innerHTML = '';
        
        this.activeFeatures.forEach(feature => {
            const indicator = document.createElement('div');
            indicator.className = 'feature-indicator';
            indicator.title = this.getFeatureTitle(feature);
            selectedFeaturesContainer.appendChild(indicator);
        });
    }
    
    getFeatureTitle(feature) {
        const titles = {
            'think-longer': 'Think Longer Active',
            'improve-prompt': 'Improve Prompt',
            'clear-chat': 'Clear Chat'
        };
        return titles[feature] || feature;
    }
    
    showThinkingLongerOverlay() {
        const overlay = document.getElementById('thinkingLongerOverlay');
        if (overlay) {
            overlay.style.display = 'block';
        }
    }
    
    hideThinkingLongerOverlay() {
        const overlay = document.getElementById('thinkingLongerOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
}

// Enhanced UX Features
class ChatEnhancements {
    static addTooltips() {
        const tooltips = [
            { id: 'sendButton', text: 'Send message (Enter)' },
            { id: 'clearButton', text: 'Clear all conversations' },
            { id: 'messageInput', text: 'Type your message here (Enter to send, Shift+Enter for new line)' },
            { id: 'dropdownToggle', text: 'Select AI model to send messages to' }
        ];
        
        tooltips.forEach(({ id, text }) => {
            const element = document.getElementById(id);
            if (element) element.title = text;
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.multiMindChat = new MultiMindChat();
        window.chatInstance = window.multiMindChat; // Make it globally accessible
        ChatEnhancements.addTooltips();
        console.log('MultiMind Chat initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize MultiMind Chat:', error);
    }
});

// Handle page visibility and connection changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.multiMindChat) {
        window.multiMindChat.checkServiceHealth();
    }
});

window.addEventListener('online', () => {
    if (window.multiMindChat) {
        window.multiMindChat.checkServiceHealth();
    }
});

window.addEventListener('offline', () => {
    console.warn('Internet connection lost. Some features may not work properly.');
});