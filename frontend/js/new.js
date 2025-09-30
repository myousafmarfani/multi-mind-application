// MultiMind Chat Interface - Clean & Optimized Version
class MultiMindChat {
    constructor() {
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
        this.focusInput();
    }
    
    setupEventListeners() {
        // Send message events
        const sendButton = document.getElementById('sendButton');
        const messageInput = document.getElementById('messageInput');
        const clearButton = document.getElementById('clearButton');
        
        sendButton?.addEventListener('click', () => this.sendMessage());
        
        messageInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        messageInput?.addEventListener('input', this.autoResizeTextarea);
        
        clearButton?.addEventListener('click', () => this.clearAllChats());
        
        // Chatbot selection dropdown
        this.setupChatbotSelector();
        
        // Maximize/minimize functionality
        this.setupMaximizeFeature();
        
        // Drag functionality
        this.setupDragFunctionality();
        
        // Global keyboard shortcuts
        this.setupKeyboardShortcuts();
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
        });
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
        
        // Add user message to selected chats
        this.addMessageToSelectedChats(message, 'user');
        
        // Clear input and update UI
        messageInput.value = '';
        this.autoResizeTextarea.call(messageInput);
        this.incrementMessageCount();
        
        const startTime = Date.now();
        
        try {
            // Create promises for selected models
            const promises = this.createRequestPromises(message);
            
            // Send requests with timeout
            const results = await this.sendWithTimeout(promises, 45000);
            
            console.log('All requests completed:', results);
            
            // Update response time statistics
            const responseTime = (Date.now() - startTime) / 1000;
            this.updateAverageResponseTime(responseTime);
            
        } catch (error) {
            console.error('Error sending messages:', error);
        } finally {
            this.isProcessing = false;
            this.updateSendButton(false);
        }
    }
    
    createRequestPromises(message) {
        if (this.selectedChatbot === 'all') {
            return Object.keys(this.apiEndpoints).map(model => 
                this.sendToModel(model, message)
            );
        } else {
            return [this.sendToModel(this.selectedChatbot, message)];
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
    
    async sendToModel(model, message) {
        const messagesContainer = document.getElementById(`${model}-messages`);
        if (!messagesContainer) return;
        
        let loadingWrapper = null;
        
        try {
            // Show loading indicator
            loadingWrapper = this.createLoadingIndicator(messagesContainer);
            this.updateStatus(model, 'loading', 'Thinking...');
            
            // Make API request
            const response = await this.makeApiRequest(model, message);
            const responseText = this.extractResponseText(response);
            
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
    
    async makeApiRequest(model, message) {
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
                    instructions: 'You are a helpful assistant. Provide clear and concise responses.'
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
        const selectedText = document.querySelector('.selected-text');
        
        if (!selectedIcon || !selectedText) return;
        
        const optionIcon = selectedOption.querySelector('.option-icon');
        const text = selectedOption.querySelector('.option-text')?.textContent;
        
        if (optionIcon?.tagName === 'IMG') {
            selectedIcon.innerHTML = `<img src="${optionIcon.src}" alt="${optionIcon.alt}" class="selected-icon">`;
        } else {
            selectedIcon.textContent = optionIcon?.textContent || '';
        }
        
        selectedText.textContent = text || '';
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
        if (!confirm('Are you sure you want to clear all conversations?')) {
            return;
        }
        
        Object.keys(this.apiEndpoints).forEach(model => {
            const container = document.getElementById(`${model}-messages`);
            if (container) container.innerHTML = '';
        });
        
        // Reset statistics
        this.messageCount = 0;
        this.responseTimes = [];
        
        const totalMessagesElement = document.getElementById('totalMessages');
        const avgResponseTimeElement = document.getElementById('avgResponseTime');
        
        if (totalMessagesElement) totalMessagesElement.textContent = '0';
        if (avgResponseTimeElement) avgResponseTimeElement.textContent = '0.0s';
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
}

// Enhanced UX Features
class ChatEnhancements {
    static addTooltips() {
        const tooltips = [
            { id: 'sendButton', text: 'Send message (Shift+Enter or Ctrl+Enter)' },
            { id: 'clearButton', text: 'Clear all conversations' },
            { id: 'messageInput', text: 'Type your message here (Shift+Enter or Ctrl+Enter to send)' },
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