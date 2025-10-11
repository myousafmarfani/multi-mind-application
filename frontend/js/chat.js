// Chat Interface JavaScript with API Integration
class MultiMindChat {
    constructor() {
        this.apiEndpoints = {
            gemini: '/api/gemini',
            chatgpt: '/api/chatgpt',
            claude: '/api/claude',
            grok: '/api/grok'
        };
        
        this.healthEndpoints = {
            gemini: '/api/gemini/health',
            chatgpt: '/api/chatgpt/health',
            claude: '/api/claude/health',
            grok: '/api/grok/health'
        };
        
        this.messageCount = 0;
        this.responseTimes = [];
        this.isProcessing = false;
        this.maximizedChat = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedChatbot = 'all';
        
        this.initializeChat();
    }
    
    async initializeChat() {
        this.setupEventListeners();
        await this.checkServiceHealth();
        this.updateSelectionUI();
        this.focusInput();
    }
    
    setupEventListeners() {
        // Send button click
        const sendButton = document.getElementById('sendButton');
        sendButton.addEventListener('click', () => this.sendMessage());
        
        // Enter key in textarea - Shift+Enter or Ctrl+Enter to send
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.shiftKey || e.ctrlKey)) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Clear all chats
        const clearButton = document.getElementById('clearButton');
        clearButton.addEventListener('click', () => this.clearAllChats());
        
        // Auto-resize textarea
        messageInput.addEventListener('input', this.autoResizeTextarea);
        
        // Maximize/minimize buttons
        const maximizeButtons = document.querySelectorAll('.maximize-btn');
        maximizeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const chatId = btn.getAttribute('data-chat');
                this.toggleMaximize(chatId);
            });
        });
        
        // Close maximized chat when clicking overlay
        const overlay = document.getElementById('chatOverlay');
        overlay.addEventListener('click', () => this.minimizeChat());
        
        // ESC key to minimize
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.maximizedChat) {
                this.minimizeChat();
            }
        });
        
        // Chatbot selection
        this.setupChatbotSelector();
        
        // Drag functionality for input section
        this.setupDragFunctionality();
    }
    
    setupChatbotSelector() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        const dropdownOptions = document.querySelectorAll('.dropdown-option');
        
        // Toggle dropdown on click
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Handle option selection
        dropdownOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Remove active class from all options
                dropdownOptions.forEach(opt => opt.classList.remove('active'));
                
                // Add active class to clicked option
                option.classList.add('active');
                
                // Update selected chatbot
                this.selectedChatbot = option.dataset.value;
                
                // Update dropdown display
                this.updateDropdownDisplay(option);
                
                // Update UI based on selection
                this.updateSelectionUI();
                
                // Close dropdown
                this.closeDropdown();
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-container')) {
                this.closeDropdown();
            }
        });
        
        // Close dropdown on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });
    }
    
    toggleDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        if (dropdownMenu.classList.contains('show')) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    openDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        dropdownToggle.classList.add('open');
        dropdownMenu.classList.add('show');
    }
    
    closeDropdown() {
        const dropdownToggle = document.getElementById('dropdownToggle');
        const dropdownMenu = document.getElementById('dropdownMenu');
        
        dropdownToggle.classList.remove('open');
        dropdownMenu.classList.remove('show');
    }
    
    updateDropdownDisplay(selectedOption) {
        const selectedIcon = document.querySelector('.selected-icon');
        const selectedText = document.querySelector('.selected-text');
        
        const optionIcon = selectedOption.querySelector('.option-icon');
        const text = selectedOption.querySelector('.option-text').textContent;
        
        // Check if the option icon is an image or emoji
        if (optionIcon.tagName === 'IMG') {
            // Replace with image
            selectedIcon.innerHTML = `<img src="${optionIcon.src}" alt="${optionIcon.alt}" class="selected-icon">`;
        } else {
            // Replace with emoji/text
            selectedIcon.textContent = optionIcon.textContent;
        }
        
        selectedText.textContent = text;
    }
    
    updateSelectionUI() {
        const sendButtonText = document.getElementById('sendButtonText');
        const messageInput = document.getElementById('messageInput');
        
        // Update send button text and placeholder
        if (this.selectedChatbot === 'all') {
            sendButtonText.textContent = 'Send to All';
            messageInput.placeholder = 'Type your message to all AI models...';
        } else {
            const chatbotNames = {
                gemini: 'Gemini',
                chatgpt: 'ChatGPT', 
                claude: 'Claude',
                grok: 'Grok'
            };
            sendButtonText.textContent = `Send to ${chatbotNames[this.selectedChatbot]}`;
            messageInput.placeholder = `Type your message to ${chatbotNames[this.selectedChatbot]}...`;
        }
        
        // Update dropdown display if not already updated
        const activeOption = document.querySelector(`.dropdown-option[data-value="${this.selectedChatbot}"]`);
        if (activeOption) {
            // Remove active from all options
            document.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('active'));
            // Add active to current selection
            activeOption.classList.add('active');
            // Update dropdown display
            this.updateDropdownDisplay(activeOption);
        }
        
        // Update visual indicators for chat windows
        this.updateChatWindowIndicators();
    }
    
    updateChatWindowIndicators() {
        const models = ['gemini', 'chatgpt', 'claude', 'grok'];
        
        models.forEach(model => {
            const chatBot = document.getElementById(`${model}-chat`);
            if (this.selectedChatbot === 'all' || this.selectedChatbot === model) {
                chatBot.classList.remove('dimmed');
                chatBot.classList.add('active-target');
            } else {
                chatBot.classList.add('dimmed');
                chatBot.classList.remove('active-target');
            }
        });
    }

    setupDragFunctionality() {
        const inputSection = document.getElementById('inputSection');
        const dragHandle = document.getElementById('dragHandle');
        
        // Mouse events
        dragHandle.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Touch events for mobile
        dragHandle.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]));
        document.addEventListener('touchmove', (e) => this.drag(e.touches[0]));
        document.addEventListener('touchend', () => this.endDrag());
        
        // Double-click to reset position
        dragHandle.addEventListener('dblclick', () => this.resetInputPosition());
    }
    
    startDrag(e) {
        if (!this.maximizedChat) return;
        
        this.isDragging = true;
        const inputSection = document.getElementById('inputSection');
        const rect = inputSection.getBoundingClientRect();
        
        this.dragOffset.x = e.clientX - rect.left;
        this.dragOffset.y = e.clientY - rect.top;
        
        inputSection.classList.add('dragging');
        e.preventDefault();
    }
    
    drag(e) {
        if (!this.isDragging || !this.maximizedChat) return;
        
        const inputSection = document.getElementById('inputSection');
        const newX = e.clientX - this.dragOffset.x;
        const newY = e.clientY - this.dragOffset.y;
        
        // Constrain to viewport
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
        inputSection.classList.remove('dragging');
    }
    
    resetInputPosition() {
        const inputSection = document.getElementById('inputSection');
        inputSection.style.left = '50%';
        inputSection.style.top = 'auto';
        inputSection.style.bottom = '0.5rem';
        inputSection.style.transform = 'translateX(-50%)';
    }
    
    async checkServiceHealth() {
        const models = ['gemini', 'chatgpt', 'claude', 'grok'];
        let activeCount = 0;
        
        for (const model of models) {
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
                console.warn(`${model} service is not available:`, error);
                this.updateStatus(model, 'offline', 'Offline');
            }
        }
        
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
    
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || this.isProcessing) {
            console.log('Message empty or already processing', { message, isProcessing: this.isProcessing });
            return;
        }
        
        console.log('Starting to send message:', message);
        
        this.isProcessing = true;
        this.updateSendButton(true);
        
        // Add user message to selected chats
        this.addMessageToSelectedChats(message, 'user');
        
        // Clear input
        messageInput.value = '';
        this.autoResizeTextarea.call(messageInput);
        
        // Increment message count
        this.messageCount++;
        const totalMessagesElement = document.getElementById('totalMessages');
        if (totalMessagesElement) {
            totalMessagesElement.textContent = this.messageCount;
        }
        
        // Send to selected models
        const startTime = Date.now();
        let promises;
        
        if (this.selectedChatbot === 'all') {
            // Send to all models simultaneously
            promises = Object.keys(this.apiEndpoints).map(model => 
                this.sendToModel(model, message)
            );
        } else {
            // Send to specific model only
            promises = [this.sendToModel(this.selectedChatbot, message)];
        }
        
        // Safety timeout to prevent button from getting stuck
        const safetyTimeout = setTimeout(() => {
            console.warn('Safety timeout triggered - resetting send button');
            this.isProcessing = false;
            this.updateSendButton(false);
        }, 45000); // 45 seconds - longer than individual request timeout
        
        try {
            console.log('Sending to models:', this.selectedChatbot === 'all' ? 'all models' : this.selectedChatbot);
            const results = await Promise.allSettled(promises);
            console.log('All promises settled:', results);
            
            const endTime = Date.now();
            const responseTime = (endTime - startTime) / 1000;
            this.updateAverageResponseTime(responseTime);
            
            console.log(`Message sending completed in ${responseTime}s`);
        } catch (error) {
            console.error('Error sending messages:', error);
        } finally {
            // Clear safety timeout
            clearTimeout(safetyTimeout);
            
            // Always reset the send button when all requests are done
            console.log('All requests completed - resetting send button...');
            this.isProcessing = false;
            this.updateSendButton(false);
        } 
    }
    
    async sendToModel(model, message) {
        const messagesContainer = document.getElementById(`${model}-messages`);
        let loadingWrapper = null;
        
        try {
            // Create loading message wrapper
            loadingWrapper = document.createElement('div');
            loadingWrapper.className = 'message-wrapper loading-wrapper';
            
            const loadingDiv = this.createLoadingMessage();
            loadingWrapper.appendChild(loadingDiv);
            messagesContainer.appendChild(loadingWrapper);
            this.scrollToBottom(messagesContainer);
            
            // Update status to loading
            this.updateStatus(model, 'loading', 'Thinking...');
            
            console.log(`Sending request to ${model}...`);
            
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
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
            
            // Try to parse the JSON response
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // If not JSON, treat as text
                const textResponse = await response.text();
                data = { response: textResponse };
            }
            
            console.log(`Response from ${model}:`, data);
            
            // Remove loading wrapper
            if (loadingWrapper && loadingWrapper.parentNode) {
                loadingWrapper.remove();
                loadingWrapper = null;
            }
            
            // Add response message - handle different possible response formats
            let responseText = '';
            if (data.response) {
                responseText = data.response;
            } else if (data.message) {
                responseText = data.message;
            } else if (data.content) {
                responseText = data.content;
            } else if (typeof data === 'string') {
                responseText = data;
            } else {
                responseText = JSON.stringify(data, null, 2);
            }
            
            if (responseText) {
                console.log(`Adding message from ${model}:`, responseText);
                this.addMessage(messagesContainer, responseText, 'bot');
            } else {
                console.error(`No valid response field in data from ${model}:`, data);
                this.addMessage(messagesContainer, "Sorry, I received an invalid response format.", 'bot error');
            }
            
            this.updateStatus(model, 'online', 'Online');
            
        } catch (error) {
            console.error(`Error communicating with ${model}:`, error);
            
            // Remove loading wrapper if it exists
            if (loadingWrapper && loadingWrapper.parentNode) {
                loadingWrapper.remove();
                loadingWrapper = null;
            }
            
            // Add error message with specific error type
            let errorMessage;
            if (error.name === 'AbortError') {
                errorMessage = `${model} is taking too long to respond. Please try again.`;
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = `Cannot connect to ${model}. Please check if the service is running.`;
            } else {
                errorMessage = `${model} error: ${error.message}`;
            }
            
            this.addMessage(messagesContainer, errorMessage, 'bot error');
            this.updateStatus(model, 'offline', 'Error');
            
            // Don't throw the error, just log it - this allows other models to continue
            return Promise.resolve();
        } finally {
            console.log(`${model} request completed.`);
        }
    }
    
    addMessageToSelectedChats(message, type) {
        if (this.selectedChatbot === 'all') {
            const models = ['gemini', 'chatgpt', 'claude', 'grok'];
            models.forEach(model => {
                const container = document.getElementById(`${model}-messages`);
                this.addMessage(container, message, type);
            });
        } else {
            const container = document.getElementById(`${this.selectedChatbot}-messages`);
            this.addMessage(container, message, type);
        }
    }
    
    addMessage(container, message, type) {
        console.log(`Adding message - Type: ${type}, Container:`, container, 'Message:', message);
        
        if (!container) {
            console.error('Container not found for message:', message);
            return;
        }
        
        // Verify container exists and is visible
        console.log('Container children before adding:', container.children.length);
        
        if (type === 'bot' || type === 'bot error') {
            // Create a wrapper for bot messages that includes actions
            const messageWrapper = document.createElement('div');
            messageWrapper.className = 'message-wrapper';
            
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            
            try {
                messageDiv.innerHTML = this.formatMarkdown(message);
            } catch (error) {
                console.error('Error formatting markdown:', error);
                messageDiv.textContent = message; // Fallback to plain text
            }
            
            // Set initial styles for animation
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
            
            // Create action buttons only for non-error messages
            if (type === 'bot') {
                const actionsDiv = this.createMessageActions(message);
                messageWrapper.appendChild(messageDiv);
                messageWrapper.appendChild(actionsDiv);
            } else {
                messageWrapper.appendChild(messageDiv);
            }
            
            container.appendChild(messageWrapper);
            
            // Apply syntax highlighting to code blocks
            if (window.Prism) {
                Prism.highlightAllUnder(messageDiv);
            }
            
            // Add click handlers for custom links
            this.setupCustomLinkHandlers(messageDiv);
            
            // Add animation with a more reliable approach
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        } else {
            // For user messages, just add normally
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;
            messageDiv.textContent = message;
            
            // Set initial styles for animation
            messageDiv.style.opacity = '0';
            messageDiv.style.transform = 'translateY(10px)';
            
            container.appendChild(messageDiv);
            
            // Add animation with a more reliable approach
            requestAnimationFrame(() => {
                messageDiv.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
                messageDiv.style.opacity = '1';
                messageDiv.style.transform = 'translateY(0)';
            });
        }
        
        this.scrollToBottom(container);
    }
    
    createMessageActions(originalMessage) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn copy-btn';
        copyBtn.innerHTML = '📋';
        copyBtn.title = 'Copy response';
        copyBtn.addEventListener('click', () => this.copyMessage(copyBtn, originalMessage));
        
        // Like button
        const likeBtn = document.createElement('button');
        likeBtn.className = 'action-btn like-btn';
        likeBtn.innerHTML = '👍';
        likeBtn.title = 'Like response';
        likeBtn.addEventListener('click', () => this.likeMessage(likeBtn));
        
        // Dislike button
        const dislikeBtn = document.createElement('button');
        dislikeBtn.className = 'action-btn dislike-btn';
        dislikeBtn.innerHTML = '👎';
        dislikeBtn.title = 'Dislike response';
        dislikeBtn.addEventListener('click', () => this.dislikeMessage(dislikeBtn));
        
        actionsDiv.appendChild(copyBtn);
        actionsDiv.appendChild(likeBtn);
        actionsDiv.appendChild(dislikeBtn);
        
        return actionsDiv;
    }
    
    async copyMessage(button, message) {
        try {
            await navigator.clipboard.writeText(message);
            this.showCopyFeedback(button, 'Copied!');
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = message;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showCopyFeedback(button, 'Copied!');
        }
    }
    
    showCopyFeedback(button, text) {
        // Create feedback tooltip
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback';
        feedback.textContent = text;
        
        // Position relative to button
        button.style.position = 'relative';
        button.appendChild(feedback);
        
        // Show feedback
        setTimeout(() => feedback.classList.add('show'), 10);
        
        // Hide and remove feedback
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 1500);
    }
    
    likeMessage(button) {
        const messageWrapper = button.closest('.message-wrapper');
        const allActionBtns = messageWrapper.querySelectorAll('.like-btn, .dislike-btn');
        
        // Reset all buttons in this message
        allActionBtns.forEach(btn => {
            btn.classList.remove('liked', 'disliked');
        });
        
        // Toggle like state
        if (button.classList.contains('liked')) {
            button.classList.remove('liked');
            this.showActionFeedback(button, 'Like removed');
        } else {
            button.classList.add('liked');
            
            // Add pulse effect
            button.style.animation = 'pulse 0.6s ease-out';
            setTimeout(() => {
                button.style.animation = '';
            }, 600);
            
            // Change emoji to show it's liked
            button.innerHTML = '👍';
            setTimeout(() => {
                button.innerHTML = '👍'; // Keep the liked state
            }, 300);
            
            // Provide user feedback
            this.showActionFeedback(button, 'Liked! Thanks for the feedback 👍');
        }
    }
    
    dislikeMessage(button) {
        const messageWrapper = button.closest('.message-wrapper');
        const allActionBtns = messageWrapper.querySelectorAll('.like-btn, .dislike-btn');
        
        // Reset all buttons in this message
        allActionBtns.forEach(btn => {
            btn.classList.remove('liked', 'disliked');
        });
        
        // Toggle dislike state
        if (button.classList.contains('disliked')) {
            button.classList.remove('disliked');
            this.showActionFeedback(button, 'Dislike removed');
        } else {
            button.classList.add('disliked');
            
            // Add pulse effect
            button.style.animation = 'pulseDanger 0.6s ease-out';
            setTimeout(() => {
                button.style.animation = '';
            }, 600);
            
            // Change emoji to show it's disliked
            button.innerHTML = '👎';
            setTimeout(() => {
                button.innerHTML = '👎'; // Keep the disliked state
            }, 300);
            
            // Provide user feedback
            this.showActionFeedback(button, 'Disliked. We\'ll improve! 👎');
        }
    }
    
    showActionFeedback(button, text) {
        // Create feedback tooltip with enhanced styling
        const feedback = document.createElement('div');
        feedback.className = 'action-feedback';
        feedback.textContent = text;
        
        // Add special styling based on the action
        if (text.includes('Liked')) {
            feedback.classList.add('like-feedback');
        } else if (text.includes('Disliked')) {
            feedback.classList.add('dislike-feedback');
        }
        
        // Position relative to button
        button.style.position = 'relative';
        button.appendChild(feedback);
        
        // Show feedback with animation
        setTimeout(() => feedback.classList.add('show'), 10);
        
        // Hide and remove feedback
        setTimeout(() => {
            feedback.classList.remove('show');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    formatMarkdown(text) {
        // Escape HTML first to prevent XSS
        let formatted = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Format code blocks with language detection
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            const languageLabel = this.getLanguageLabel(language);
            return `<pre class="language-${language}" data-language="${languageLabel}"><code class="language-${language}">${code.trim()}</code></pre>`;
        });
        
        // Format inline code
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
        formatted = formatted.replace(/(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g, (match, url) => {
            return `<span class="custom-link" data-url="${url}">${url}</span>`;
        });
        
        // Format bold text
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Format headers
        formatted = formatted.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        
        // Format numbered lists
        formatted = formatted.replace(/^\d+\.\s(.+)$/gm, '<li class="numbered-item">$1</li>');
        
        // Format bullet points
        formatted = formatted.replace(/^\*\s(.+)$/gm, '<li class="bullet-item">$1</li>');
        
        // Wrap consecutive list items
        formatted = formatted.replace(/(<li class="numbered-item">.*<\/li>)/gs, '<ol>$1</ol>');
        formatted = formatted.replace(/(<li class="bullet-item">.*<\/li>)/gs, '<ul>$1</ul>');
        
        // Format line breaks
        formatted = formatted.replace(/\n\n/g, '</p><p>');
        formatted = '<p>' + formatted + '</p>';
        
        // Clean up empty paragraphs
        formatted = formatted.replace(/<p><\/p>/g, '');
        formatted = formatted.replace(/<p>\s*<\/p>/g, '');
        
        return formatted;
    }
    
    getLanguageLabel(lang) {
        const languageMap = {
            'python': 'Python',
            'javascript': 'JavaScript',
            'js': 'JavaScript',
            'typescript': 'TypeScript',
            'ts': 'TypeScript',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'csharp': 'C#',
            'php': 'PHP',
            'ruby': 'Ruby',
            'go': 'Go',
            'rust': 'Rust',
            'html': 'HTML',
            'css': 'CSS',
            'sql': 'SQL',
            'bash': 'Bash',
            'json': 'JSON',
            'xml': 'XML',
            'yaml': 'YAML',
            'text': 'Code'
        };
        return languageMap[lang.toLowerCase()] || lang.toUpperCase();
    }
    
    setupCustomLinkHandlers(container) {
        const customLinks = container.querySelectorAll('.custom-link');
        customLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
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
    
    createLoadingMessage() {
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
        return loadingDiv;
    }
    
    scrollToBottom(container) {
        container.scrollTop = container.scrollHeight;
    }
    
    updateSendButton(isLoading) {
        const sendButton = document.getElementById('sendButton');
        const sendButtonText = document.getElementById('sendButtonText');
        
        if (isLoading) {
            sendButton.disabled = true;
            sendButtonText.textContent = 'Sending...';
            sendButton.style.opacity = '0.7';
        } else {
            sendButton.disabled = false;
            // Restore the correct button text based on selection
            if (this.selectedChatbot === 'all') {
                sendButtonText.textContent = 'Send to All';
            } else {
                const chatbotNames = {
                    gemini: 'Gemini',
                    chatgpt: 'ChatGPT', 
                    claude: 'Claude',
                    grok: 'Grok'
                };
                sendButtonText.textContent = `Send to ${chatbotNames[this.selectedChatbot]}`;
            }
            sendButton.style.opacity = '1';
        }
    }
    
    // Emergency reset function for debugging - can be called from browser console
    emergencyReset() {
        console.log('Emergency reset triggered');
        this.isProcessing = false;
        this.updateSendButton(false);
        console.log('Emergency reset completed');
    }
    
    clearAllChats() {
        if (!confirm('Are you sure you want to clear all conversations?')) {
            return;
        }
        
        const models = ['gemini', 'chatgpt', 'claude', 'grok'];
        models.forEach(model => {
            const container = document.getElementById(`${model}-messages`);
            // Clear all messages (no initial greeting messages)
            container.innerHTML = '';
        });
        
        // Reset stats
        this.messageCount = 0;
        this.responseTimes = [];
        const totalMessagesElement = document.getElementById('totalMessages');
        const avgResponseTimeElement = document.getElementById('avgResponseTime');
        if (totalMessagesElement) totalMessagesElement.textContent = '0';
        if (avgResponseTimeElement) avgResponseTimeElement.textContent = '0.0s';
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
    
    focusInput() {
        const messageInput = document.getElementById('messageInput');
        messageInput.focus();
    }
    
    // Test function for debugging - can be called from browser console
    testAddMessage(model = 'gemini', message = 'Test message from console') {
        const container = document.getElementById(`${model}-messages`);
        this.addMessage(container, message, 'bot');
        console.log('Test message added to', model);
    }
    
    toggleMaximize(chatId) {
        if (this.maximizedChat === chatId) {
            this.minimizeChat();
        } else {
            this.maximizeChat(chatId);
        }
    }
    
    maximizeChat(chatId) {
        // Minimize any currently maximized chat first
        if (this.maximizedChat) {
            this.minimizeChat();
        }
        
        const chatElement = document.getElementById(chatId);
        const chatGrid = document.querySelector('.chat-grid');
        const overlay = document.getElementById('chatOverlay');
        const maximizeBtn = chatElement.querySelector('.maximize-btn');
        const icon = maximizeBtn.querySelector('.maximize-icon');
        const inputSection = document.getElementById('inputSection');
        
        // Add classes
        chatElement.classList.add('maximized');
        chatGrid.classList.add('has-maximized');
        overlay.classList.add('active');
        maximizeBtn.classList.add('minimized');
        inputSection.classList.add('draggable');
        
        // Update button
        icon.textContent = '✕';
        maximizeBtn.title = 'Minimize';
        
        // Store maximized state
        this.maximizedChat = chatId;
        
        // Scroll to top of messages
        const messagesContainer = chatElement.querySelector('.chat-messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    minimizeChat() {
        if (!this.maximizedChat) return;
        
        const chatElement = document.getElementById(this.maximizedChat);
        const chatGrid = document.querySelector('.chat-grid');
        const overlay = document.getElementById('chatOverlay');
        const maximizeBtn = chatElement.querySelector('.maximize-btn');
        const icon = maximizeBtn.querySelector('.maximize-icon');
        const inputSection = document.getElementById('inputSection');
        
        // Remove classes
        chatElement.classList.remove('maximized');
        chatGrid.classList.remove('has-maximized');
        overlay.classList.remove('active');
        maximizeBtn.classList.remove('minimized');
        inputSection.classList.remove('draggable');
        
        // Update button
        icon.textContent = '⛶';
        maximizeBtn.title = 'Maximize';
        
        // Reset input position
        this.resetInputPosition();
        
        // Clear maximized state
        this.maximizedChat = null;
    }
}

// Utility functions for enhanced UX
class ChatEnhancements {
    static addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to send message (this is redundant now but kept for compatibility)
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                const sendButton = document.getElementById('sendButton');
                if (sendButton && !sendButton.disabled) {
                    sendButton.click();
                }
            }
            
            // Number keys (1-5) to select chatbots when Ctrl is held
            if (e.ctrlKey && e.key >= '1' && e.key <= '5') {
                e.preventDefault();
                const selections = ['all', 'gemini', 'chatgpt', 'claude', 'grok'];
                const index = parseInt(e.key) - 1;
                if (index < selections.length) {
                    const option = document.querySelector(`.dropdown-option[data-value="${selections[index]}"]`);
                    if (option) {
                        option.click();
                    }
                }
            }
            
            // Escape to clear input
            if (e.key === 'Escape') {
                const messageInput = document.getElementById('messageInput');
                messageInput.value = '';
                messageInput.focus();
            }
        });
    }
    
    static addTooltips() {
        // Add helpful tooltips
        const sendButton = document.getElementById('sendButton');
        if (sendButton) sendButton.title = 'Send message (Shift+Enter or Ctrl+Enter)';
        
        const clearButton = document.getElementById('clearButton');
        if (clearButton) clearButton.title = 'Clear all conversations';
        
        const messageInput = document.getElementById('messageInput');
        if (messageInput) messageInput.title = 'Type your message here (Shift+Enter or Ctrl+Enter to send)';
        
        // Add tooltip to dropdown toggle
        const dropdownToggle = document.getElementById('dropdownToggle');
        if (dropdownToggle) {
            dropdownToggle.title = 'Select AI model to send messages to';
        }
    }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the main chat functionality
    window.multiMindChat = new MultiMindChat();
    
    // Add enhancements
    ChatEnhancements.addKeyboardShortcuts();
    ChatEnhancements.addTooltips();
    
    console.log('MultiMind Chat initialized successfully!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.multiMindChat) {
        // Refresh service health when page becomes visible
        window.multiMindChat.checkServiceHealth();
    }
});

// Handle connection issues gracefully
window.addEventListener('online', () => {
    if (window.multiMindChat) {
        window.multiMindChat.checkServiceHealth();
    }
});

window.addEventListener('offline', () => {
    console.warn('Internet connection lost. Some features may not work properly.');
}); 


