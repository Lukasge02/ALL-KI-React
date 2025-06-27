// chat.js - Profile Chat Page Functionality

class ProfileChatManager {
    constructor() {
        this.profileId = null;
        this.currentChatId = null;
        this.profile = null;
        this.chats = [];
        this.currentMessages = [];
        this.isTyping = false;
        this.init();
    }

    init() {
        this.checkAuth();
        this.extractProfileId();
        this.bindEvents();
        this.loadProfile();
        this.loadChats();
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('allKiLoggedIn');
        if (isLoggedIn !== 'true') {
            window.location.href = '/login.html';
            return;
        }
    }

    extractProfileId() {
        // Extract profile ID from URL: /chat.html?profile=ID
        const urlParams = new URLSearchParams(window.location.search);
        this.profileId = urlParams.get('profile');
        
        if (!this.profileId) {
            this.showToast('Profil-ID nicht gefunden', 'error');
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 2000);
            return;
        }
    }

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('allKiAuthToken')}`,
            'X-User-Email': localStorage.getItem('allKiUserEmail')
        };
    }

    bindEvents() {
        // Back to dashboard
        document.getElementById('backToDashboard').addEventListener('click', () => {
            window.location.href = '/dashboard.html';
        });

        // New chat
        document.getElementById('newChatBtn').addEventListener('click', () => {
            this.createNewChat();
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', () => {
            this.handleInputChange();
        });

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Chat actions
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearCurrentChat();
        });

        document.getElementById('exportChatBtn').addEventListener('click', () => {
            this.exportCurrentChat();
        });

        // Suggestion chips
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('suggestion-chip')) {
                this.sendSuggestion(e.target.textContent);
            }
        });
    }

    async loadProfile() {
        try {
            const response = await fetch(`/api/profiles/${this.profileId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.profile = data.profile;
                this.updateProfileInfo();
            } else {
                this.showToast('Profil konnte nicht geladen werden', 'error');
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 2000);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showToast('Verbindungsfehler beim Laden des Profils', 'error');
        }
    }

    updateProfileInfo() {
        if (!this.profile) return;

        const categoryIcons = {
            'work': '💼',
            'health': '🏥',
            'learning': '📚',
            'creativity': '🎨',
            'relationships': '👥',
            'finance': '💰',
            'general': '🎯'
        };

        const categoryNames = {
            'work': 'Arbeit',
            'health': 'Gesundheit',
            'learning': 'Lernen',
            'creativity': 'Kreativität',
            'relationships': 'Beziehungen',
            'finance': 'Finanzen',
            'general': 'Allgemein'
        };

        const icon = categoryIcons[this.profile.category] || '🎯';
        const categoryName = categoryNames[this.profile.category] || 'Allgemein';

        document.querySelector('.profile-avatar').textContent = icon;
        document.getElementById('profileName').textContent = this.profile.name;
        document.getElementById('profileCategory').textContent = categoryName;

        // Update welcome message
        const welcomeContent = document.querySelector('.welcome-content');
        if (welcomeContent) {
            welcomeContent.querySelector('h3').textContent = `Willkommen zu ${this.profile.name}!`;
            welcomeContent.querySelector('p').textContent = `Ich bin Ihr persönlicher KI-Assistent für ${this.profile.name}. Ich kenne Ihre Ziele und Präferenzen und kann Ihnen gezielt helfen.`;
        }
    }

    async loadChats() {
        try {
            const response = await fetch(`/api/profiles/${this.profileId}/chats`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.chats = data.chats || [];
                this.updateChatHistory();
                
                // Load most recent chat if available
                if (this.chats.length > 0) {
                    this.loadChat(this.chats[0]._id);
                }
            }
        } catch (error) {
            console.error('Error loading chats:', error);
        }
    }

    updateChatHistory() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todayChats = [];
        const yesterdayChats = [];
        const weekChats = [];
        const olderChats = [];

        this.chats.forEach(chat => {
            const chatDate = new Date(chat.updatedAt);
            const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

            if (chatDay.getTime() === today.getTime()) {
                todayChats.push(chat);
            } else if (chatDay.getTime() === yesterday.getTime()) {
                yesterdayChats.push(chat);
            } else if (chatDate >= weekAgo) {
                weekChats.push(chat);
            } else {
                olderChats.push(chat);
            }
        });

        this.renderChatSection('todayChats', todayChats);
        this.renderChatSection('yesterdayChats', yesterdayChats);
        this.renderChatSection('weekChats', weekChats);
        this.renderChatSection('olderChats', olderChats);
    }

    renderChatSection(containerId, chats) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat._id === this.currentChatId ? 'active' : ''}`;
            
            const title = chat.title || 'Neuer Chat';
            const time = new Date(chat.updatedAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit'
            });

            chatItem.innerHTML = `
                <div class="chat-item-icon">💬</div>
                <div class="chat-item-content">
                    <div class="chat-item-title">${title}</div>
                    <div class="chat-item-time">${time}</div>
                </div>
                <div class="chat-item-actions">
                    <button class="chat-action-btn" onclick="profileChatManager.deleteChat('${chat._id}')" title="Chat löschen">
                        🗑️
                    </button>
                </div>
            `;

            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-action-btn')) {
                    this.loadChat(chat._id);
                }
            });

            container.appendChild(chatItem);
        });
    }

    async createNewChat() {
        try {
            const response = await fetch(`/api/profiles/${this.profileId}/chats`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    title: 'Neuer Chat'
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.currentChatId = data.chat._id;
                this.currentMessages = [];
                
                // Reload chats and update UI
                await this.loadChats();
                this.clearChatMessages();
                this.updateChatTitle('Neuer Chat');
                
                this.showToast('Neuer Chat erstellt', 'success');
            } else {
                this.showToast('Fehler beim Erstellen des Chats', 'error');
            }
        } catch (error) {
            console.error('Error creating new chat:', error);
            this.showToast('Verbindungsfehler', 'error');
        }
    }

    async loadChat(chatId) {
        try {
            const response = await fetch(`/api/profiles/${this.profileId}/chats/${chatId}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.currentChatId = chatId;
                this.currentMessages = data.messages || [];
                
                this.updateChatHistory(); // Update active state
                this.renderMessages();
                this.updateChatTitle(data.chat.title || 'Chat');
            }
        } catch (error) {
            console.error('Error loading chat:', error);
            this.showToast('Fehler beim Laden des Chats', 'error');
        }
    }

    renderMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';

        // Add welcome message if no messages
        if (this.currentMessages.length === 0) {
            this.addWelcomeMessage(container);
            return;
        }

        this.currentMessages.forEach(message => {
            this.addMessageToDOM(message.content, message.role, message.timestamp);
        });

        this.scrollToBottom();
    }

    addWelcomeMessage(container) {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        
        const profileName = this.profile?.name || 'Ihr Profil';
        
        welcomeMessage.innerHTML = `
            <div class="welcome-avatar">🤖</div>
            <div class="welcome-content">
                <h3>Willkommen zu ${profileName}!</h3>
                <p>Ich bin Ihr persönlicher KI-Assistent für ${profileName}. Ich kenne Ihre Ziele und Präferenzen und kann Ihnen gezielt helfen.</p>
                <div class="suggestion-chips">
                    <button class="suggestion-chip">Wie kann ich meine Ziele erreichen?</button>
                    <button class="suggestion-chip">Gib mir einen Tipp für heute</button>
                    <button class="suggestion-chip">Was weißt du über mich?</button>
                    <button class="suggestion-chip">Hilf mir bei meinen Herausforderungen</button>
                </div>
            </div>
        `;
        
        container.appendChild(welcomeMessage);
    }

    handleInputChange() {
        const input = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const charCount = document.getElementById('charCount');
        
        const text = input.value.trim();
        const length = input.value.length;
        
        sendBtn.disabled = text.length === 0;
        charCount.textContent = `${length}/2000`;
        
        // Auto-resize textarea
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 200) + 'px';
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Clear input
        input.value = '';
        this.handleInputChange();
        
        // Send message
        await this.sendChatMessage(message);
    }

    async sendSuggestion(text) {
        await this.sendChatMessage(text);
    }

    async sendChatMessage(message) {
        if (!this.currentChatId) {
            await this.createNewChat();
        }
        
        this.isTyping = true;
        
        // Add user message to UI
        this.addMessageToDOM(message, 'user');
        this.hideWelcomeMessage();
        
        // Show typing indicator
        this.showTypingIndicator();
        
        try {
            const response = await fetch(`/api/profiles/${this.profileId}/chats/${this.currentChatId}/message`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            if (data.success && data.response) {
                // Add AI response to UI
                this.addMessageToDOM(data.response, 'assistant');
                
                // Update chat title if this is the first message
                if (this.currentMessages.length <= 2) {
                    const title = this.generateChatTitle(message);
                    this.updateChatTitle(title);
                    await this.updateChatTitleOnServer(title);
                }
                
                // Reload chats to update timestamps
                await this.loadChats();
            } else {
                this.addMessageToDOM('Entschuldigung, ich konnte nicht antworten. Bitte versuchen Sie es erneut.', 'assistant');
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.hideTypingIndicator();
            this.addMessageToDOM('Verbindungsfehler. Bitte versuchen Sie es erneut.', 'assistant');
        } finally {
            this.isTyping = false;
        }
    }

    addMessageToDOM(content, role, timestamp = null) {
        const container = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}-message`;
        
        const avatar = role === 'user' ? '👤' : '🤖';
        const time = timestamp ? new Date(timestamp) : new Date();
        const timeString = time.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">
                    <p class="message-text">${content}</p>
                </div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        container.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Add to current messages
        this.currentMessages.push({
            content,
            role,
            timestamp: time.toISOString()
        });
    }

    showTypingIndicator() {
        const container = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typingIndicator';
        
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
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

    generateChatTitle(firstMessage) {
        // Generate a short title from the first message
        return firstMessage.length > 30 
            ? firstMessage.substring(0, 30) + '...'
            : firstMessage;
    }

    async updateChatTitleOnServer(title) {
        try {
            await fetch(`/api/profiles/${this.profileId}/chats/${this.currentChatId}`, {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ title })
            });
        } catch (error) {
            console.error('Error updating chat title:', error);
        }
    }

    updateChatTitle(title) {
        document.getElementById('currentChatTitle').textContent = title;
    }

    clearChatMessages() {
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';
        this.addWelcomeMessage(container);
        this.currentMessages = [];
    }

    async clearCurrentChat() {
        if (!this.currentChatId) return;
        
        if (!confirm('Möchten Sie diesen Chat wirklich löschen?')) return;
        
        await this.deleteChat(this.currentChatId);
    }

    async deleteChat(chatId) {
        try {
            const response = await fetch(`/api/profiles/${this.profileId}/chats/${chatId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                // If deleting current chat, clear it
                if (chatId === this.currentChatId) {
                    this.currentChatId = null;
                    this.clearChatMessages();
                    this.updateChatTitle('Neuer Chat');
                }
                
                // Reload chats
                await this.loadChats();
                this.showToast('Chat gelöscht', 'success');
            } else {
                this.showToast('Fehler beim Löschen des Chats', 'error');
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
            this.showToast('Verbindungsfehler', 'error');
        }
    }

    async exportCurrentChat() {
        if (!this.currentChatId || this.currentMessages.length === 0) {
            this.showToast('Kein Chat zum Exportieren vorhanden', 'warning');
            return;
        }
        
        const chatData = {
            profile: this.profile.name,
            title: document.getElementById('currentChatTitle').textContent,
            messages: this.currentMessages,
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${this.profile.name}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Chat exportiert', 'success');
    }

    scrollToBottom() {
        const container = document.querySelector('.chat-messages-container');
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileChatManager = new ProfileChatManager();
});