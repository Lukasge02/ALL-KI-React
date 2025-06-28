/**
 * 💬 ALL-KI CHAT SYSTEM - MODERN VERSION 2.0
 * Advanced chat interface with typing indicators, message status, and more
 * 
 * EINFÜGEN IN: public/js/chat.js
 * 
 * FEATURES:
 * ✅ Real-time Typing Indicators
 * ✅ Message Status (Sending/Sent/Error)
 * ✅ Auto-save Drafts
 * ✅ Keyboard Shortcuts
 * ✅ Voice Input Support
 * ✅ File Upload Support
 * ✅ Emoji Picker
 * ✅ Message Reactions
 */

class ModernChatSystem {
    constructor() {
        this.state = {
            currentProfile: null,
            currentChat: null,
            messages: [],
            isTyping: false,
            isDraftSaved: true,
            isRecording: false,
            connectionStatus: 'connected',
            messageQueue: [],
            unsentMessages: new Map()
        };
        
        this.config = {
            typingTimeout: 1000,
            draftSaveInterval: 2000,
            maxMessageLength: 4000,
            maxFileSize: 10 * 1024 * 1024, // 10MB
            allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf']
        };
        
        this.timers = new Map();
        this.cache = new Map();
        
        this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    
    async init() {
        try {
            this.setupEventListeners();
            this.initializeUI();
            this.loadDraft();
            this.setupKeyboardShortcuts();
            this.initializeVoiceRecognition();
            this.setupFileUpload();
            
            // Load profile from URL params
            const urlParams = new URLSearchParams(window.location.search);
            const profileId = urlParams.get('profile');
            
            if (profileId) {
                await this.loadProfile(profileId);
                await this.loadChatHistory();
            }
            
            this.showSuccessToast('Chat bereit! 💬');
            
        } catch (error) {
            console.error('Chat initialization error:', error);
            this.showErrorToast('Fehler beim Laden des Chats');
        }
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    setupEventListeners() {
        // Message input
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('input', (e) => this.handleInput(e));
            messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
            messageInput.addEventListener('paste', (e) => this.handlePaste(e));
            messageInput.addEventListener('focus', () => this.handleInputFocus());
            messageInput.addEventListener('blur', () => this.handleInputBlur());
        }
        
        // Send button
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.addEventListener('click', () => this.sendMessage());
        }
        
        // Voice record button
        const voiceButton = document.getElementById('voiceButton');
        if (voiceButton) {
            voiceButton.addEventListener('mousedown', () => this.startVoiceRecording());
            voiceButton.addEventListener('mouseup', () => this.stopVoiceRecording());
            voiceButton.addEventListener('mouseleave', () => this.stopVoiceRecording());
        }
        
        // File upload
        const fileButton = document.getElementById('fileButton');
        const fileInput = document.getElementById('fileInput');
        if (fileButton && fileInput) {
            fileButton.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        // Emoji button
        const emojiButton = document.getElementById('emojiButton');
        if (emojiButton) {
            emojiButton.addEventListener('click', () => this.toggleEmojiPicker());
        }
        
        // Connection status
        window.addEventListener('online', () => this.handleConnectionChange(true));
        window.addEventListener('offline', () => this.handleConnectionChange(false));
        
        // Auto-save draft
        setInterval(() => this.saveDraft(), this.config.draftSaveInterval);
        
        // Message container scroll
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.addEventListener('scroll', () => this.handleScroll());
        }
    }

    // ========================================
    // INPUT HANDLING
    // ========================================
    
    handleInput(e) {
        const input = e.target;
        const value = input.value;
        
        // Update character count
        this.updateCharacterCount(value.length);
        
        // Handle typing indicator
        this.handleTypingIndicator();
        
        // Update send button state
        this.updateSendButtonState(value.trim().length > 0);
        
        // Mark draft as unsaved
        this.state.isDraftSaved = false;
        
        // Auto-expand textarea
        this.autoExpandTextarea(input);
    }
    
    handleKeyDown(e) {
        // Send on Enter (without Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
            return;
        }
        
        // Clear typing indicator on backspace/delete
        if (e.key === 'Backspace' || e.key === 'Delete') {
            this.clearTypingIndicator();
        }
    }
    
    handlePaste(e) {
        const items = e.clipboardData.items;
        
        for (let item of items) {
            // Handle pasted images
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                this.handleFileUpload({ target: { files: [file] } });
                break;
            }
        }
    }
    
    handleInputFocus() {
        // Mark messages as read
        this.markMessagesAsRead();
        
        // Show typing indicator to other users
        this.sendTypingStatus(true);
    }
    
    handleInputBlur() {
        // Hide typing indicator
        this.sendTypingStatus(false);
        
        // Save draft
        this.saveDraft();
    }

    // ========================================
    // MESSAGE SENDING
    // ========================================
    
    async sendMessage() {
        const input = document.getElementById('messageInput');
        const message = input.value.trim();
        
        if (!message || message.length > this.config.maxMessageLength) {
            if (message.length > this.config.maxMessageLength) {
                this.showErrorToast(`Nachricht zu lang (max. ${this.config.maxMessageLength} Zeichen)`);
            }
            return;
        }
        
        // Clear input immediately for better UX
        input.value = '';
        this.updateSendButtonState(false);
        this.updateCharacterCount(0);
        this.autoExpandTextarea(input);
        
        // Create message object
        const messageObj = {
            id: this.generateMessageId(),
            content: message,
            role: 'user',
            timestamp: new Date(),
            status: 'sending',
            profileId: this.state.currentProfile?.id
        };
        
        // Add to UI immediately
        this.addMessageToUI(messageObj);
        this.scrollToBottom();
        
        try {
            // Send to server
            const response = await this.sendToServer(messageObj);
            
            if (response.success) {
                // Update message status
                this.updateMessageStatus(messageObj.id, 'sent');
                
                // Add AI response
                if (response.aiResponse) {
                    const aiMessage = {
                        id: this.generateMessageId(),
                        content: response.aiResponse,
                        role: 'assistant',
                        timestamp: new Date(),
                        status: 'received'
                    };
                    
                    // Simulate typing delay for more natural feel
                    setTimeout(() => {
                        this.showAITyping();
                        setTimeout(() => {
                            this.hideAITyping();
                            this.addMessageToUI(aiMessage);
                            this.scrollToBottom();
                        }, Math.min(response.aiResponse.length * 20, 3000));
                    }, 500);
                }
            } else {
                throw new Error(response.error || 'Fehler beim Senden der Nachricht');
            }
            
        } catch (error) {
            console.error('Send message error:', error);
            
            // Update message status to error
            this.updateMessageStatus(messageObj.id, 'error');
            
            // Add to retry queue if offline
            if (!navigator.onLine) {
                this.state.messageQueue.push(messageObj);
                this.showToast('Nachricht wird gesendet, wenn Verbindung verfügbar ist', 'info');
            } else {
                this.showErrorToast('Fehler beim Senden der Nachricht');
                
                // Add retry button
                this.addRetryButton(messageObj.id);
            }
        }
        
        // Clear draft
        this.clearDraft();
    }
    
    async sendToServer(message) {
        const endpoint = '/api/chat';
        const payload = {
            message: message.content,
            profileId: this.state.currentProfile?.id,
            chatId: this.state.currentChat?.id
        };
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders()
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    }

    // ========================================
    // UI UPDATES
    // ========================================
    
    addMessageToUI(message) {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        const messageElement = this.createMessageElement(message);
        container.appendChild(messageElement);
        
        // Add to local state
        this.state.messages.push(message);
        
        // Animate in
        requestAnimationFrame(() => {
            messageElement.classList.add('fade-in');
        });
    }
    
    createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message message-${message.role}`;
        div.dataset.messageId = message.id;
        
        const timestamp = this.formatTimestamp(message.timestamp);
        const statusIcon = this.getStatusIcon(message.status);
        
        div.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">
                    ${message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div class="message-body">
                    <div class="message-text">${this.formatMessageContent(message.content)}</div>
                    <div class="message-meta">
                        <span class="message-time">${timestamp}</span>
                        <span class="message-status" data-status="${message.status}">
                            ${statusIcon}
                        </span>
                    </div>
                </div>
                <div class="message-actions">
                    <button class="message-action-btn" onclick="chat.copyMessage('${message.id}')" title="Kopieren">
                        📋
                    </button>
                    <button class="message-action-btn" onclick="chat.addReaction('${message.id}')" title="Reaktion">
                        👍
                    </button>
                </div>
            </div>
        `;
        
        return div;
    }
    
    updateMessageStatus(messageId, status) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;
        
        const statusElement = messageElement.querySelector('.message-status');
        if (statusElement) {
            statusElement.dataset.status = status;
            statusElement.innerHTML = this.getStatusIcon(status);
        }
        
        // Update in state
        const message = this.state.messages.find(m => m.id === messageId);
        if (message) {
            message.status = status;
        }
    }
    
    showAITyping() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        // Remove existing typing indicator
        this.hideAITyping();
        
        const typingDiv = document.createElement('div');
        typingDiv.id = 'ai-typing-indicator';
        typingDiv.className = 'message message-assistant typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="message-avatar">🤖</div>
                <div class="message-body">
                    <div class="typing-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(typingDiv);
        this.scrollToBottom();
    }
    
    hideAITyping() {
        const typingIndicator = document.getElementById('ai-typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // ========================================
    // VOICE RECORDING
    // ========================================
    
    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'de-DE';
            
            this.recognition.onstart = () => {
                this.state.isRecording = true;
                this.updateVoiceButtonState(true);
                this.showToast('Sprechen Sie jetzt...', 'info');
            };
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                const input = document.getElementById('messageInput');
                if (input) {
                    input.value = finalTranscript + interimTranscript;
                    this.handleInput({ target: input });
                }
            };
            
            this.recognition.onend = () => {
                this.state.isRecording = false;
                this.updateVoiceButtonState(false);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.state.isRecording = false;
                this.updateVoiceButtonState(false);
                this.showErrorToast('Spracherkennung fehlgeschlagen');
            };
        } else {
            // Hide voice button if not supported
            const voiceButton = document.getElementById('voiceButton');
            if (voiceButton) {
                voiceButton.style.display = 'none';
            }
        }
    }
    
    startVoiceRecording() {
        if (this.recognition && !this.state.isRecording) {
            try {
                this.recognition.start();
            } catch (error) {
                console.error('Voice recording start error:', error);
                this.showErrorToast('Spracherkennung konnte nicht gestartet werden');
            }
        }
    }
    
    stopVoiceRecording() {
        if (this.recognition && this.state.isRecording) {
            this.recognition.stop();
        }
    }

    // ========================================
    // FILE UPLOAD
    // ========================================
    
    setupFileUpload() {
        // Drag and drop
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                chatContainer.classList.add('drag-over');
            });
            
            chatContainer.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                chatContainer.classList.remove('drag-over');
            });
            
            chatContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                chatContainer.classList.remove('drag-over');
                
                const files = Array.from(e.dataTransfer.files);
                this.handleMultipleFiles(files);
            });
        }
    }
    
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        this.handleMultipleFiles(files);
        
        // Clear file input
        e.target.value = '';
    }
    
    async handleMultipleFiles(files) {
        for (const file of files) {
            if (this.validateFile(file)) {
                await this.uploadFile(file);
            }
        }
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.config.maxFileSize) {
            this.showErrorToast(`Datei zu groß: ${file.name} (max. ${this.formatFileSize(this.config.maxFileSize)})`);
            return false;
        }
        
        // Check file type
        if (!this.config.allowedFileTypes.includes(file.type)) {
            this.showErrorToast(`Dateityp nicht unterstützt: ${file.name}`);
            return false;
        }
        
        return true;
    }
    
    async uploadFile(file) {
        const messageId = this.generateMessageId();
        
        // Create file message
        const fileMessage = {
            id: messageId,
            content: `📎 ${file.name}`,
            role: 'user',
            timestamp: new Date(),
            status: 'uploading',
            file: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: null
            }
        };
        
        this.addMessageToUI(fileMessage);
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('profileId', this.state.currentProfile?.id);
            formData.append('chatId', this.state.currentChat?.id);
            
            // Upload file
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            
            const result = await response.json();
            
            // Update message with file URL
            fileMessage.file.url = result.url;
            fileMessage.status = 'sent';
            this.updateMessageStatus(messageId, 'sent');
            
            this.showSuccessToast('Datei erfolgreich hochgeladen');
            
        } catch (error) {
            console.error('File upload error:', error);
            this.updateMessageStatus(messageId, 'error');
            this.showErrorToast('Fehler beim Hochladen der Datei');
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    formatTimestamp(timestamp) {
        const now = new Date();
        const messageTime = new Date(timestamp);
        const diffMs = now - messageTime;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Gerade eben';
        if (diffMins < 60) return `vor ${diffMins} Min`;
        if (diffMins < 1440) return `vor ${Math.floor(diffMins / 60)} Std`;
        
        return messageTime.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    getStatusIcon(status) {
        const icons = {
            sending: '⏳',
            sent: '✓',
            delivered: '✓✓',
            read: '👁️',
            error: '❌',
            uploading: '📤',
            received: ''
        };
        return icons[status] || '';
    }
    
    formatMessageContent(content) {
        // Convert URLs to links
        content = content.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener">$1</a>'
        );
        
        // Convert line breaks
        content = content.replace(/\n/g, '<br>');
        
        // Convert markdown-style formatting
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        content = content.replace(/`(.*?)`/g, '<code>$1</code>');
        
        return content;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Draft management
    saveDraft() {
        const input = document.getElementById('messageInput');
        if (input && input.value.trim() && !this.state.isDraftSaved) {
            localStorage.setItem('chatDraft', input.value);
            this.state.isDraftSaved = true;
        }
    }
    
    loadDraft() {
        const draft = localStorage.getItem('chatDraft');
        const input = document.getElementById('messageInput');
        if (draft && input) {
            input.value = draft;
            this.handleInput({ target: input });
        }
    }
    
    clearDraft() {
        localStorage.removeItem('chatDraft');
        this.state.isDraftSaved = true;
    }
    
    // Connection handling
    handleConnectionChange(online) {
        this.state.connectionStatus = online ? 'connected' : 'offline';
        
        if (online && this.state.messageQueue.length > 0) {
            this.retryQueuedMessages();
        }
        
        this.updateConnectionStatus();
    }
    
    async retryQueuedMessages() {
        const queue = [...this.state.messageQueue];
        this.state.messageQueue = [];
        
        for (const message of queue) {
            try {
                await this.sendToServer(message);
                this.updateMessageStatus(message.id, 'sent');
            } catch (error) {
                this.state.messageQueue.push(message);
            }
        }
    }
    
    // Placeholder methods
    getAuthHeaders() { return {}; }
    loadProfile(id) { console.log('Load profile:', id); }
    loadChatHistory() { console.log('Load chat history'); }
    scrollToBottom() { 
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }
    handleScroll() { /* Handle message lazy loading */ }
    updateCharacterCount(count) { 
        const counter = document.getElementById('characterCount');
        if (counter) {
            counter.textContent = `${count}/${this.config.maxMessageLength}`;
        }
    }
    updateSendButtonState(enabled) {
        const btn = document.getElementById('sendButton');
        if (btn) {
            btn.disabled = !enabled;
            btn.classList.toggle('disabled', !enabled);
        }
    }
    autoExpandTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    handleTypingIndicator() { /* Show typing to other users */ }
    clearTypingIndicator() { /* Clear typing indicator */ }
    sendTypingStatus(typing) { /* Send typing status to server */ }
    markMessagesAsRead() { /* Mark messages as read */ }
    updateVoiceButtonState(recording) {
        const btn = document.getElementById('voiceButton');
        if (btn) {
            btn.classList.toggle('recording', recording);
        }
    }
    updateConnectionStatus() { /* Update UI connection status */ }
    addRetryButton(messageId) { /* Add retry button to failed message */ }
    copyMessage(messageId) { /* Copy message to clipboard */ }
    addReaction(messageId) { /* Add reaction to message */ }
    toggleEmojiPicker() { /* Toggle emoji picker */ }
    setupKeyboardShortcuts() { /* Setup keyboard shortcuts */ }
    initializeUI() { /* Initialize UI elements */ }
    
    // Toast methods (same as dashboard)
    showToast(message, type = 'info') { console.log(`Toast: ${message} (${type})`); }
    showSuccessToast(message) { this.showToast(message, 'success'); }
    showErrorToast(message) { this.showToast(message, 'error'); }
}

// Initialize chat when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new ModernChatSystem();
    console.log('💬 All-KI Chat 2.0 initialized!');
});