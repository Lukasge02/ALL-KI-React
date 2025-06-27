/**
 * 💬 CHAT MANAGEMENT
 * Zentrale Chat-Funktionalität für Profile-Chats und Quick-Chat
 * 
 * SEPARATION OF CONCERNS:
 * - Message Management
 * - API Communication
 * - UI Updates & Rendering
 * - Chat History Management
 * - Error Handling & Fallbacks
 */

class ChatManager {
    constructor() {
        this.currentMessages = [];
        this.isTyping = false;
        this.currentProfile = null;
        this.chatId = null;
        this.messageHistory = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 3;
        
        this.initializeEventListeners();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    initializeEventListeners() {
        // Chat input handling
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            chatInput.addEventListener('input', () => {
                this.updateSendButtonState();
            });
        }

        if (sendButton) {
            sendButton.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Chat history navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && e.ctrlKey && chatInput?.value === '') {
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown' && e.ctrlKey) {
                this.navigateHistory(1);
            }
        });

        // Auto-resize textarea
        if (chatInput) {
            chatInput.addEventListener('input', this.autoResizeTextarea);
        }
    }

    autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    updateSendButtonState() {
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendButton');
        
        if (chatInput && sendButton) {
            const hasContent = chatInput.value.trim().length > 0;
            sendButton.disabled = !hasContent || this.isTyping;
            sendButton.classList.toggle('disabled', !hasContent || this.isTyping);
        }
    }

    // ========================================
    // CHAT OPERATIONS
    // ========================================

    async sendMessage() {
        const chatInput = document.getElementById('chatInput');
        if (!chatInput || this.isTyping) return;

        const message = chatInput.value.trim();
        if (!message) return;

        try {
            this.isTyping = true;
            this.updateSendButtonState();

            // Clear input immediately for better UX
            chatInput.value = '';
            chatInput.style.height = 'auto';

            // Add user message to chat
            this.addMessageToDOM(message, 'user');
            this.currentMessages.push({
                role: 'user',
                content: message,
                timestamp: new Date().toISOString()
            });

            // Show typing indicator
            this.showTypingIndicator();

            // Hide welcome message if present
            this.hideWelcomeMessage();

            // Get AI response
            let response;
            if (this.currentProfile) {
                response = await this.getProfileResponse(message);
            } else {
                response = await this.getQuickChatResponse(message);
            }

            // Hide typing indicator
            this.hideTypingIndicator();

            // Add AI response to chat
            this.addMessageToDOM(response, 'assistant');
            this.currentMessages.push({
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString()
            });

            // Save chat if profile chat
            if (this.currentProfile && this.chatId) {
                await this.saveChatMessage(message, response);
            }

            // Update chat title if needed
            this.updateChatTitle();

        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.handleChatError(error);
        } finally {
            this.isTyping = false;
            this.updateSendButtonState();
        }
    }

    async getQuickChatResponse(message) {
        try {
            const response = await fetch('/api/chat/quick', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({
                    message: message,
                    userContext: this.getUserContext()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.reconnectAttempts = 0; // Reset on success
                return data.response;
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }

        } catch (error) {
            console.error('Quick chat API error:', error);
            return this.getFallbackResponse();
        }
    }

    async getProfileResponse(message) {
        if (!this.currentProfile || !this.chatId) {
            throw new Error('Kein Profil oder Chat-ID verfügbar');
        }

        try {
            const response = await fetch(`/api/profiles/${this.currentProfile._id}/chats/${this.chatId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success) {
                this.reconnectAttempts = 0; // Reset on success
                return data.response;
            } else {
                throw new Error(data.error || 'Unbekannter Fehler');
            }

        } catch (error) {
            console.error('Profile chat API error:', error);
            return this.getProfileFallbackResponse();
        }
    }

    getFallbackResponse() {
        const fallbackResponses = [
            "Entschuldigung, ich habe gerade technische Schwierigkeiten. Können Sie Ihre Frage später nochmal stellen?",
            "Es tut mir leid, aber ich kann momentan nicht antworten. Bitte versuchen Sie es in einem Moment erneut.",
            "Ich habe Probleme beim Verarbeiten Ihrer Anfrage. Bitte haben Sie einen Moment Geduld.",
            "Leider kann ich Ihnen gerade nicht helfen. Versuchen Sie es bitte später noch einmal."
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    getProfileFallbackResponse() {
        if (this.currentProfile) {
            return `Entschuldigung, ich kann als ${this.currentProfile.name} gerade nicht antworten. Bitte versuchen Sie es später erneut.`;
        }
        return this.getFallbackResponse();
    }

    // ========================================
    // MESSAGE RENDERING
    // ========================================

    addMessageToDOM(content, role, timestamp = null) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const avatar = role === 'user' ? '👤' : (this.currentProfile ? '🤖' : '💬');
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeString = time.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">
                    <p class="message-text">${this.formatMessageContent(content)}</p>
                </div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Add animation
        requestAnimationFrame(() => {
            messageDiv.classList.add('message-animate');
        });
    }

    formatMessageContent(content) {
        // Basic formatting for chat messages
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    showTypingIndicator() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        // Remove existing typing indicator
        this.hideTypingIndicator();
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        const avatar = this.currentProfile ? '🤖' : '💬';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="typing-dots">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        container.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // ========================================
    // PROFILE CHAT MANAGEMENT
    // ========================================

    async initializeProfileChat(profile, chatId = null) {
        this.currentProfile = profile;
        this.currentMessages = [];
        
        try {
            if (chatId) {
                // Load existing chat
                this.chatId = chatId;
                await this.loadChatHistory();
            } else {
                // Create new chat
                await this.createNewChat();
            }
            
            this.updateChatHeader();
            
        } catch (error) {
            console.error('Error initializing profile chat:', error);
            this.showChatError('Fehler beim Laden des Chats');
        }
    }

    async createNewChat() {
        if (!this.currentProfile) {
            throw new Error('Kein Profil ausgewählt');
        }

        try {
            const response = await fetch(`/api/profiles/${this.currentProfile._id}/chats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({
                    title: this.generateChatTitle()
                })
            });

            if (!response.ok) {
                throw new Error('Fehler beim Erstellen des Chats');
            }

            const data = await response.json();
            this.chatId = data.chat._id;
            
        } catch (error) {
            console.error('Error creating new chat:', error);
            throw error;
        }
    }

    async loadChatHistory() {
        if (!this.currentProfile || !this.chatId) return;

        try {
            const response = await fetch(`/api/profiles/${this.currentProfile._id}/chats/${this.chatId}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error('Fehler beim Laden der Chat-Historie');
            }

            const data = await response.json();
            
            if (data.success && data.messages) {
                this.currentMessages = data.messages;
                this.renderChatHistory();
            }
            
        } catch (error) {
            console.error('Error loading chat history:', error);
            this.showChatError('Fehler beim Laden der Chat-Historie');
        }
    }

    renderChatHistory() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        // Clear existing messages
        container.innerHTML = '';

        // Render each message
        this.currentMessages.forEach(msg => {
            this.addMessageToDOM(msg.content, msg.role, msg.timestamp);
        });

        // Show welcome message if no messages
        if (this.currentMessages.length === 0) {
            this.showWelcomeMessage();
        }
    }

    showWelcomeMessage() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        
        if (this.currentProfile) {
            welcomeDiv.innerHTML = `
                <div class="welcome-avatar">🤖</div>
                <div class="welcome-content">
                    <h3>Hallo! Ich bin ${this.currentProfile.name}</h3>
                    <p>${this.currentProfile.description || 'Wie kann ich Ihnen heute helfen?'}</p>
                    <div class="welcome-suggestions">
                        ${this.generateWelcomeSuggestions()}
                    </div>
                </div>
            `;
        } else {
            welcomeDiv.innerHTML = `
                <div class="welcome-avatar">💬</div>
                <div class="welcome-content">
                    <h3>Willkommen beim Quick Chat!</h3>
                    <p>Stellen Sie mir gerne Ihre Fragen. Ich helfe Ihnen weiter!</p>
                </div>
            `;
        }
        
        container.appendChild(welcomeDiv);
    }

    generateWelcomeSuggestions() {
        if (!this.currentProfile || !this.currentProfile.profileData) {
            return '';
        }

        const suggestions = [];
        const data = this.currentProfile.profileData;
        
        if (data.goals && data.goals.length > 0) {
            suggestions.push(`Hilf mir bei: ${data.goals[0]}`);
        }
        
        if (data.category) {
            suggestions.push(`Erzähl mir mehr über ${data.category}`);
        }
        
        if (suggestions.length === 0) {
            suggestions.push('Wie funktionierst du?', 'Was kannst du für mich tun?');
        }

        return suggestions.map(suggestion => 
            `<button class="suggestion-btn" onclick="chatManager.sendSuggestion('${suggestion}')">${suggestion}</button>`
        ).join('');
    }

    sendSuggestion(suggestion) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = suggestion;
            this.sendMessage();
        }
    }

    async saveChatMessage(userMessage, assistantMessage) {
        if (!this.currentProfile || !this.chatId) return;

        try {
            // Messages are already saved by the API endpoint
            // This method is for additional operations if needed
            console.log('Chat message saved successfully');
            
        } catch (error) {
            console.error('Error saving chat message:', error);
        }
    }

    updateChatHeader() {
        const headerTitle = document.getElementById('chatHeaderTitle');
        const headerSubtitle = document.getElementById('chatHeaderSubtitle');
        
        if (this.currentProfile) {
            if (headerTitle) {
                headerTitle.textContent = this.currentProfile.name;
            }
            if (headerSubtitle) {
                headerSubtitle.textContent = this.currentProfile.category || 'AI Assistant';
            }
        } else {
            if (headerTitle) {
                headerTitle.textContent = 'Quick Chat';
            }
            if (headerSubtitle) {
                headerSubtitle.textContent = 'AI Assistant';
            }
        }
    }

    updateChatTitle() {
        // Update chat title based on first message if it's a new chat
        if (this.currentMessages.length <= 2 && this.chatId) {
            const firstUserMessage = this.currentMessages.find(msg => msg.role === 'user');
            if (firstUserMessage) {
                const title = this.generateChatTitle(firstUserMessage.content);
                this.updateChatTitleInDatabase(title);
            }
        }
    }

    generateChatTitle(firstMessage = null) {
        if (firstMessage) {
            // Generate title from first message
            return firstMessage.length > 30 
                ? firstMessage.substring(0, 30) + '...'
                : firstMessage;
        }
        
        // Default title
        return `Neuer Chat - ${new Date().toLocaleDateString('de-DE')}`;
    }

    async updateChatTitleInDatabase(title) {
        if (!this.chatId) return;

        try {
            await fetch(`/api/chats/${this.chatId}/title`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders()
                },
                body: JSON.stringify({ title })
            });
        } catch (error) {
            console.error('Error updating chat title:', error);
        }
    }

    // ========================================
    // ERROR HANDLING
    // ========================================

    handleChatError(error) {
        console.error('Chat error:', error);
        
        let errorMessage = 'Ein unbekannter Fehler ist aufgetreten.';
        
        if (error.name === 'NetworkError' || error.message.includes('fetch')) {
            errorMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = 'Sitzung abgelaufen. Bitte melden Sie sich erneut an.';
        } else if (error.message.includes('429')) {
            errorMessage = 'Zu viele Anfragen. Bitte warten Sie einen Moment.';
        } else if (error.message.includes('500')) {
            errorMessage = 'Serverfehler. Bitte versuchen Sie es später erneut.';
        }

        this.addMessageToDOM(
            `⚠️ ${errorMessage}`, 
            'system'
        );

        // Attempt reconnection for network errors
        if (this.reconnectAttempts < this.maxReconnectAttempts && 
            (error.name === 'NetworkError' || error.message.includes('fetch'))) {
            
            this.reconnectAttempts++;
            setTimeout(() => {
                this.addMessageToDOM(
                    `🔄 Verbindungsversuch ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`, 
                    'system'
                );
            }, 2000);
        }
    }

    showChatError(message) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-error';
        errorDiv.innerHTML = `
            <div class="error-icon">⚠️</div>
            <div class="error-message">${message}</div>
            <button class="error-retry" onclick="location.reload()">Neu laden</button>
        `;
        
        container.appendChild(errorDiv);
        this.scrollToBottom();
    }

    // ========================================
    // HISTORY & NAVIGATION
    // ========================================

    navigateHistory(direction) {
        // TODO: Implement message history navigation
        console.log('Navigate history:', direction);
    }

    saveMessageToHistory(message) {
        const history = this.messageHistory.get('user') || [];
        history.push(message);
        
        // Keep only last 50 messages
        if (history.length > 50) {
            history.shift();
        }
        
        this.messageHistory.set('user', history);
        
        // Save to localStorage
        try {
            localStorage.setItem('allKiChatHistory', JSON.stringify(Array.from(this.messageHistory.entries())));
        } catch (error) {
            console.error('Error saving chat history:', error);
        }
    }

    loadMessageHistory() {
        try {
            const saved = localStorage.getItem('allKiChatHistory');
            if (saved) {
                const entries = JSON.parse(saved);
                this.messageHistory = new Map(entries);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    clearChat() {
        this.currentMessages = [];
        const container = document.getElementById('chatMessages');
        if (container) {
            container.innerHTML = '';
        }
        this.showWelcomeMessage();
    }

    exportChat() {
        const chatData = {
            profile: this.currentProfile,
            messages: this.currentMessages,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], 
            { type: 'application/json' });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    getUserContext() {
        return {
            timestamp: new Date().toISOString(),
            messageCount: this.currentMessages.length,
            profile: this.currentProfile ? {
                id: this.currentProfile._id,
                name: this.currentProfile.name,
                category: this.currentProfile.category
            } : null
        };
    }

    getAuthHeaders() {
        const token = localStorage.getItem('allKiAuthToken');
        const email = localStorage.getItem('allKiUserEmail');
        
        const headers = {};
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        if (email) {
            headers['X-User-Email'] = email;
        }
        
        return headers;
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    // Initialize quick chat mode
    initializeQuickChat() {
        this.currentProfile = null;
        this.chatId = null;
        this.currentMessages = [];
        this.updateChatHeader();
        this.showWelcomeMessage();
    }

    // Set typing state
    setTyping(typing) {
        this.isTyping = typing;
        this.updateSendButtonState();
        
        if (typing) {
            this.showTypingIndicator();
        } else {
            this.hideTypingIndicator();
        }
    }

    // Get current chat state
    getChatState() {
        return {
            profile: this.currentProfile,
            chatId: this.chatId,
            messageCount: this.currentMessages.length,
            isTyping: this.isTyping
        };
    }

    // Reset chat manager
    reset() {
        this.currentMessages = [];
        this.isTyping = false;
        this.currentProfile = null;
        this.chatId = null;
        this.reconnectAttempts = 0;
        
        this.clearChat();
    }
}

// Initialize chat manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
    
    // Load message history
    window.chatManager.loadMessageHistory();
    
    // Initialize quick chat by default
    window.chatManager.initializeQuickChat();
});