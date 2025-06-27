/**
 * 💬 CHAT SYSTEM - Hauptklasse für Chat-Funktionalität
 * Separation of Concerns: Chat-Logic getrennt von UI-Management
 */
class ChatManager {
    constructor() {
        this.currentProfile = null;
        this.currentMessages = [];
        this.isTyping = false;
        this.chatHistory = new Map(); // Profile ID -> Messages
        this.maxRetries = 3;
        this.retryDelay = 1000;
        
        console.log('💬 ChatManager initializing...');
        this.init();
    }

    // ========================================
    // INITIALISIERUNG
    // ========================================

    init() {
        try {
            console.log('🔧 Setting up chat event listeners...');
            this.setupEventListeners();
            
            console.log('📱 Checking chat interface...');
            this.initializeChatInterface();
            
            console.log('✅ ChatManager ready!');
        } catch (error) {
            console.error('❌ ChatManager initialization failed:', error);
            this.showError('Chat-System konnte nicht initialisiert werden');
        }
    }

    setupEventListeners() {
        // Chat Input Handling
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            chatInput.addEventListener('input', () => {
                this.handleTyping();
            });
        }

        // Send Button
        const sendBtn = document.getElementById('sendMessageBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        // Quick Chat (falls vorhanden)
        const quickChatInput = document.getElementById('quickChatInput');
        if (quickChatInput) {
            quickChatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendQuickChat();
                }
            });
        }

        const quickChatBtn = document.getElementById('quickChatBtn');
        if (quickChatBtn) {
            quickChatBtn.addEventListener('click', () => {
                this.sendQuickChat();
            });
        }

        // Chat Controls
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => {
                this.clearCurrentChat();
            });
        }

        const exportChatBtn = document.getElementById('exportChatBtn');
        if (exportChatBtn) {
            exportChatBtn.addEventListener('click', () => {
                this.exportCurrentChat();
            });
        }
    }

    initializeChatInterface() {
        // Initialize chat messages container
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
            this.showWelcomeMessage();
        }

        // Reset input
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            chatInput.value = '';
            chatInput.placeholder = 'Schreiben Sie Ihre Nachricht...';
        }
    }

    // ========================================
    // CHAT-FUNKTIONALITÄT
    // ========================================

    async sendMessage() {
        const input = document.getElementById('chatInput');
        if (!input || this.isTyping) return;

        const message = input.value.trim();
        if (!message) return;

        try {
            // Add user message to chat
            this.addMessageToDOM(message, 'user');
            input.value = '';
            this.hideWelcomeMessage();

            // Show typing indicator
            this.showTypingIndicator();
            this.isTyping = true;

            let response;
            if (this.currentProfile) {
                // Profile-specific chat
                response = await this.sendProfileMessage(message);
            } else {
                // Quick chat
                response = await this.sendQuickMessage(message);
            }

            // Hide typing indicator and show response
            this.hideTypingIndicator();
            this.addMessageToDOM(response, 'assistant');

        } catch (error) {
            console.error('Send message error:', error);
            this.hideTypingIndicator();
            this.addMessageToDOM(
                'Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.', 
                'assistant'
            );
        } finally {
            this.isTyping = false;
        }
    }

    async sendQuickChat() {
        const input = document.getElementById('quickChatInput');
        if (!input || this.isTyping) return;

        const message = input.value.trim();
        if (!message) return;

        try {
            // Show loading state
            this.setQuickChatLoading(true);
            this.isTyping = true;

            const response = await this.sendQuickMessage(message);
            
            // Display response
            this.displayQuickChatResponse(message, response);
            input.value = '';

        } catch (error) {
            console.error('Quick chat error:', error);
            this.displayQuickChatResponse(
                message, 
                'Entschuldigung, es gab einen Fehler. Bitte versuchen Sie es erneut.'
            );
        } finally {
            this.setQuickChatLoading(false);
            this.isTyping = false;
        }
    }

    async sendProfileMessage(message, retryCount = 0) {
        try {
            const response = await fetch(`/api/profiles/${this.currentProfile._id}/chat`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    message,
                    conversationHistory: this.getCurrentConversationHistory()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unbekannter Fehler');
            }

            // Update conversation history
            this.addToConversationHistory(message, 'user');
            this.addToConversationHistory(data.response, 'assistant');

            return data.response;

        } catch (error) {
            console.error('Profile message error:', error);
            
            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`Retrying... Attempt ${retryCount + 1}/${this.maxRetries}`);
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.sendProfileMessage(message, retryCount + 1);
            }

            // Fallback response
            return this.getFallbackResponse();
        }
    }

    async sendQuickMessage(message, retryCount = 0) {
        try {
            const response = await fetch('/api/chat/quick', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ 
                    message,
                    userContext: this.getUserContext()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unbekannter Fehler');
            }

            return data.response;

        } catch (error) {
            console.error('Quick message error:', error);
            
            // Retry logic
            if (retryCount < this.maxRetries) {
                console.log(`Retrying... Attempt ${retryCount + 1}/${this.maxRetries}`);
                await this.delay(this.retryDelay * (retryCount + 1));
                return this.sendQuickMessage(message, retryCount + 1);
            }

            // Fallback response
            return this.getFallbackResponse();
        }
    }

    // ========================================
    // PROFILE CHAT MANAGEMENT
    // ========================================

    setCurrentProfile(profile) {
        this.currentProfile = profile;
        
        // Load conversation history for this profile
        if (!this.chatHistory.has(profile._id)) {
            this.chatHistory.set(profile._id, []);
        }
        
        this.currentMessages = this.chatHistory.get(profile._id);
        
        // Update UI
        this.updateChatHeader(profile);
        this.renderConversationHistory();
        
        console.log(`💬 Switched to profile chat: ${profile.name}`);
    }

    updateChatHeader(profile) {
        const title = document.getElementById('chatModalTitle');
        if (title) {
            title.textContent = profile.name;
        }

        const avatar = document.getElementById('chatProfileAvatar');
        if (avatar) {
            avatar.innerHTML = `
                <span class="profile-emoji">${profile.emoji || '👤'}</span>
                <div class="profile-info">
                    <div class="profile-name">${profile.name}</div>
                    <div class="profile-category">${profile.category || 'Allgemein'}</div>
                </div>
            `;
        }
    }

    renderConversationHistory() {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';

        if (this.currentMessages.length === 0) {
            this.showWelcomeMessage();
        } else {
            this.currentMessages.forEach(msg => {
                this.addMessageToDOM(msg.content, msg.role, msg.timestamp);
            });
        }

        this.scrollToBottom();
    }

    getCurrentConversationHistory() {
        return this.currentMessages.slice(-10); // Last 10 messages for context
    }

    addToConversationHistory(content, role) {
        const message = {
            content,
            role,
            timestamp: new Date().toISOString()
        };

        this.currentMessages.push(message);

        // Limit conversation history
        if (this.currentMessages.length > 50) {
            this.currentMessages = this.currentMessages.slice(-40);
        }

        // Update chat history
        if (this.currentProfile) {
            this.chatHistory.set(this.currentProfile._id, this.currentMessages);
        }
    }

    // ========================================
    // UI-MANAGEMENT
    // ========================================

    addMessageToDOM(content, role, timestamp = null) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const avatar = role === 'user' ? '👤' : (this.currentProfile?.emoji || '🤖');
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeString = time.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">
                    <p class="message-text">${this.formatMessage(content)}</p>
                </div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Add to current messages if not from history
        if (!timestamp) {
            this.addToConversationHistory(content, role);
        }
    }

    formatMessage(content) {
        // Basic formatting for messages
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
        
        typingDiv.innerHTML = `
            <div class="message-avatar">${this.currentProfile?.emoji || '🤖'}</div>
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

    showWelcomeMessage() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const welcomeDiv = document.createElement('div');
        welcomeDiv.className = 'welcome-message';
        
        const profileName = this.currentProfile?.name || 'AI-Assistent';
        const profileEmoji = this.currentProfile?.emoji || '🤖';
        
        welcomeDiv.innerHTML = `
            <div class="welcome-avatar">${profileEmoji}</div>
            <div class="welcome-content">
                <h3>Hallo! Ich bin ${profileName}</h3>
                <p>Wie kann ich Ihnen heute helfen? Stellen Sie mir eine Frage oder beginnen Sie ein Gespräch.</p>
                ${this.currentProfile ? this.getProfileSuggestions() : this.getQuickSuggestions()}
            </div>
        `;
        
        container.appendChild(welcomeDiv);
    }

    hideWelcomeMessage() {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.animation = 'fadeOut 0.3s ease-in forwards';
            setTimeout(() => welcomeMessage.remove(), 300);
        }
    }

    getProfileSuggestions() {
        if (!this.currentProfile) return '';
        
        const suggestions = this.getSuggestionsForProfile(this.currentProfile);
        if (suggestions.length === 0) return '';
        
        const suggestionsHTML = suggestions.map(suggestion => 
            `<button class="suggestion-btn" onclick="chatManager.sendSuggestion('${suggestion}')">${suggestion}</button>`
        ).join('');
        
        return `
            <div class="suggestions">
                <p class="suggestions-label">Vorschläge:</p>
                <div class="suggestions-list">${suggestionsHTML}</div>
            </div>
        `;
    }

    getQuickSuggestions() {
        const suggestions = [
            'Was sind Ihre Funktionen?',
            'Können Sie mir helfen?',
            'Was können Sie tun?',
            'Erklären Sie mir etwas'
        ];
        
        const suggestionsHTML = suggestions.map(suggestion => 
            `<button class="suggestion-btn" onclick="chatManager.sendSuggestion('${suggestion}')">${suggestion}</button>`
        ).join('');
        
        return `
            <div class="suggestions">
                <p class="suggestions-label">Schnellstart:</p>
                <div class="suggestions-list">${suggestionsHTML}</div>
            </div>
        `;
    }

    getSuggestionsForProfile(profile) {
        const categoryMap = {
            'Gesundheit': [
                'Erstelle einen Trainingsplan',
                'Ernährungstipps für heute',
                'Wie kann ich besser schlafen?',
                'Motiviere mich zum Sport'
            ],
            'Technologie': [
                'Erkläre mir ein Konzept',
                'Code-Review bitte',
                'Beste Praktiken zeigen',
                'Debugging-Hilfe'
            ],
            'Lernen': [
                'Lernplan erstellen',
                'Erklär mir das Thema',
                'Quiz zu diesem Bereich',
                'Zusammenfassung schreiben'
            ],
            'Kreativität': [
                'Brainstorming-Session',
                'Kreative Ideen sammeln',
                'Geschichte schreiben',
                'Design-Inspiration'
            ]
        };
        
        return categoryMap[profile.category] || [
            'Was können Sie für mich tun?',
            'Zeigen Sie mir Ihre Fähigkeiten',
            'Wie können Sie mir helfen?'
        ];
    }

    sendSuggestion(suggestion) {
        const input = document.getElementById('chatInput') || document.getElementById('quickChatInput');
        if (input) {
            input.value = suggestion;
            input.focus();
            
            // Trigger send
            setTimeout(() => {
                if (this.currentProfile) {
                    this.sendMessage();
                } else {
                    this.sendQuickChat();
                }
            }, 100);
        }
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    // ========================================
    // QUICK CHAT UI
    // ========================================

    setQuickChatLoading(loading) {
        const btn = document.getElementById('quickChatBtn');
        const input = document.getElementById('quickChatInput');
        
        if (btn) {
            btn.disabled = loading;
            btn.innerHTML = loading ? 
                '<span class="loading-spinner"></span>' : 
                '<span class="icon">💬</span>';
        }
        
        if (input) {
            input.disabled = loading;
        }
    }

    displayQuickChatResponse(userMessage, response) {
        const responseContainer = document.getElementById('quickChatResponse');
        if (!responseContainer) return;

        responseContainer.innerHTML = `
            <div class="quick-chat-conversation">
                <div class="quick-message user-message">
                    <div class="message-avatar">👤</div>
                    <div class="message-text">${userMessage}</div>
                </div>
                <div class="quick-message assistant-message">
                    <div class="message-avatar">🤖</div>
                    <div class="message-text">${this.formatMessage(response)}</div>
                </div>
            </div>
        `;
        
        responseContainer.style.display = 'block';
    }

    // ========================================
    // CHAT MANAGEMENT
    // ========================================

    clearCurrentChat() {
        if (!confirm('Chat-Verlauf wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            return;
        }

        // Clear messages
        if (this.currentProfile) {
            this.chatHistory.set(this.currentProfile._id, []);
            this.currentMessages = [];
        }

        // Clear UI
        const container = document.getElementById('chatMessages');
        if (container) {
            container.innerHTML = '';
            this.showWelcomeMessage();
        }

        this.showToast('Chat-Verlauf gelöscht', 'success');
    }

    exportCurrentChat() {
        if (this.currentMessages.length === 0) {
            this.showToast('Kein Chat-Verlauf zum Exportieren vorhanden', 'warning');
            return;
        }

        const exportData = {
            profile: this.currentProfile ? {
                name: this.currentProfile.name,
                category: this.currentProfile.category
            } : null,
            exportDate: new Date().toISOString(),
            messages: this.currentMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp
            }))
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Chat exportiert', 'success');
    }

    generateChatTitle(firstMessage) {
        // Generate a short title from the first message
        return firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...'
            : firstMessage;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    handleTyping() {
        // Optional: Show "user is typing" indicators in group chats
        // For now, just ensure send button is enabled/disabled
        const input = document.getElementById('chatInput') || document.getElementById('quickChatInput');
        const sendBtn = document.getElementById('sendMessageBtn') || document.getElementById('quickChatBtn');
        
        if (input && sendBtn) {
            sendBtn.disabled = !input.value.trim() || this.isTyping;
        }
    }

    getFallbackResponse() {
        const fallbackResponses = [
            "Entschuldigung, ich habe gerade technische Schwierigkeiten. Können Sie Ihre Frage später nochmal stellen?",
            "Es tut mir leid, aber ich kann momentan nicht antworten. Bitte versuchen Sie es in einem Moment erneut.",
            "Ich habe Probleme beim Verarbeiten Ihrer Anfrage. Bitte haben Sie einen Moment Geduld und versuchen Sie es erneut."
        ];
        
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    getUserContext() {
        return {
            userId: localStorage.getItem('allKiUserEmail'),
            timestamp: new Date().toISOString(),
            sessionInfo: {
                profileCount: dashboardManager?.profiles?.length || 0,
                currentSection: dashboardManager?.currentSection || 'unknown'
            }
        };
    }

    getAuthHeaders() {
        return {
            'Authorization': `Bearer ${localStorage.getItem('allKiAuthToken')}`,
            'X-User-Email': localStorage.getItem('allKiUserEmail'),
            'Content-Type': 'application/json'
        };
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showError(message) {
        console.error('Chat Error:', message);
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Use dashboard manager's toast if available
        if (typeof dashboardManager !== 'undefined' && dashboardManager.showToast) {
            dashboardManager.showToast(message, type);
            return;
        }

        // Fallback toast implementation
        const container = document.getElementById('toast-container') || document.body;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getToastIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
            <button class="toast-close">✕</button>
        `;

        container.appendChild(toast);

        // Auto-remove
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 4000);

        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        });
    }

    getToastIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    // ========================================
    // PUBLIC API METHODS
    // ========================================

    // Method to be called by dashboard when starting a profile chat
    startProfileChat(profile) {
        this.setCurrentProfile(profile);
    }

    // Method to be called when leaving a chat
    leaveChat() {
        this.currentProfile = null;
        this.currentMessages = [];
        this.initializeChatInterface();
    }

    // Method to check if chat is active
    isChatActive() {
        return this.currentProfile !== null;
    }

    // Method to get current chat stats
    getChatStats() {
        return {
            currentProfile: this.currentProfile?.name || null,
            messageCount: this.currentMessages.length,
            totalProfiles: this.chatHistory.size,
            isTyping: this.isTyping
        };
    }
}

// Global instance
let chatManager;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('💬 Chat system loading...');
    
    // Initialize chat manager
    chatManager = new ChatManager();
    console.log('✅ Chat Manager initialized');
    
    // Make it available globally for dashboard integration
    window.chatManager = chatManager;
});