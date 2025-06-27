// dashboard.js - Dashboard Funktionalität mit MongoDB Profile Integration

class DashboardManager {
    constructor() {
        this.currentSection = 'home';
        this.profiles = [];
        this.currentProfile = null;
        this.currentProfileForChat = null;
        this.conversationHistory = [];
        this.profileConversationHistory = [];
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.bindEvents();
        this.initializeComponents();
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('allKiLoggedIn');
        if (isLoggedIn !== 'true') {
            window.location.href = '/login.html';
            return;
        }
    }

    loadUserData() {
        const userName = localStorage.getItem('allKiUserName');
        const userEmail = localStorage.getItem('allKiUserEmail');
        
        if (userName) {
            document.getElementById('userGreeting').textContent = `Hallo, ${userName}!`;
            document.getElementById('userAvatar').innerHTML = `<span>${userName.charAt(0).toUpperCase()}</span>`;
        } else if (userEmail) {
            document.getElementById('userGreeting').textContent = `Hallo, ${userEmail}!`;
            document.getElementById('userAvatar').innerHTML = `<span>${userEmail.charAt(0).toUpperCase()}</span>`;
        }
    }

    // Helper method to get auth headers
    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('allKiAuthToken')}`,
            'X-User-Email': localStorage.getItem('allKiUserEmail')
        };
    }

    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSection(link.dataset.section);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Quick Chat
        document.getElementById('quickChatBtn').addEventListener('click', () => {
            this.openQuickChat();
        });

        document.getElementById('quickChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.openQuickChat();
            }
        });

        // Quick Chat Modal
        document.getElementById('closeQuickChat').addEventListener('click', () => {
            this.closeModal('quickChatModal');
        });

        document.getElementById('chatSendBtn').addEventListener('click', () => {
            this.sendQuickChatMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendQuickChatMessage();
            }
        });

        // Profile Creation
        document.getElementById('addProfileBtn').addEventListener('click', () => {
            this.openProfileCreation();
        });

        document.getElementById('createProfileBtn').addEventListener('click', () => {
            this.openProfileCreation();
        });

        document.getElementById('closeProfileModal').addEventListener('click', () => {
            this.closeModal('profileModal');
        });

        document.getElementById('profileChatSendBtn').addEventListener('click', () => {
            this.sendProfileMessage();
        });

        document.getElementById('profileChatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendProfileMessage();
            }
        });

        document.getElementById('saveProfileBtn').addEventListener('click', () => {
            this.saveProfile();
        });

        // Add Widget
        document.getElementById('addWidgetBtn').addEventListener('click', () => {
            this.showToast('Widget-System wird bald verfügbar sein!', 'info');
        });

        // Modal overlay clicks
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id);
                }
            });
        });
    }

    async initializeComponents() {
        this.updateNavigation();
        await this.loadProfiles();
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionName}-section`).classList.add('active');

        this.currentSection = sectionName;

        // Load profiles when switching to profiles section
        if (sectionName === 'profiles') {
            this.loadProfilesSection();
        }
    }

    updateNavigation() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${this.currentSection}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    handleLogout() {
        localStorage.removeItem('allKiLoggedIn');
        localStorage.removeItem('allKiUserEmail');
        localStorage.removeItem('allKiUserName');
        localStorage.removeItem('allKiAuthToken');
        localStorage.removeItem('allKiRememberMe');
        localStorage.removeItem('allKiNewsletter');

        this.showToast('Erfolgreich abgemeldet!', 'success');
        
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }

    openQuickChat() {
        const input = document.getElementById('quickChatInput');
        const message = input.value.trim();
        
        if (message) {
            this.showModal('quickChatModal');
            this.addChatMessage('chatMessages', message, 'user');
            input.value = '';
            
            // Call real AI API
            this.sendToAI(message, 'chatMessages');
        } else {
            this.showModal('quickChatModal');
        }
    }

    async sendQuickChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            this.addChatMessage('chatMessages', message, 'user');
            input.value = '';
            
            // Call real AI API
            await this.sendToAI(message, 'chatMessages');
        }
    }

    async sendToAI(message, containerId) {
        // Show loading message
        const loadingMsg = this.addChatMessage(containerId, '🤔 Denkt nach...', 'ai');
        
        try {
            const response = await fetch('/api/chat/quick', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    message: message,
                    userContext: {
                        name: localStorage.getItem('allKiUserName'),
                        email: localStorage.getItem('allKiUserEmail')
                    }
                })
            });

            const data = await response.json();
            
            // Remove loading message
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            if (data.success && data.response) {
                this.addChatMessage(containerId, data.response, 'ai');
                
                // Store conversation history
                this.conversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
                
                // Keep only last 20 messages to avoid token limits
                if (this.conversationHistory.length > 20) {
                    this.conversationHistory = this.conversationHistory.slice(-20);
                }
            } else {
                this.addChatMessage(containerId, 'Entschuldigung, ich konnte nicht antworten. Bitte versuchen Sie es erneut.', 'ai');
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            
            // Remove loading message
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            this.addChatMessage(containerId, 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.', 'ai');
        }
    }

    // Load profiles from MongoDB
    async loadProfiles() {
        try {
            const response = await fetch('/api/profiles', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.profiles = data.profiles || [];
                this.updateProfileTabs();
                console.log('Profiles loaded:', this.profiles.length);
            } else {
                console.log('No profiles found or error loading profiles');
                this.profiles = [];
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.profiles = [];
        }
    }

    // Update profile tabs in UI
    updateProfileTabs() {
        const tabsContainer = document.getElementById('profileTabs');
        
        // Clear existing tabs except general
        const generalTab = tabsContainer.querySelector('[data-profile="general"]');
        tabsContainer.innerHTML = '';
        if (generalTab) {
            tabsContainer.appendChild(generalTab);
        }

        // Add profile tabs
        this.profiles.forEach(profile => {
            this.addProfileTab(profile.name, profile._id);
        });
    }

    openProfileCreation() {
        this.showModal('profileModal');
        this.resetProfileChat();
    }

    resetProfileChat() {
        const messagesContainer = document.getElementById('profileChatMessages');
        messagesContainer.innerHTML = `
            <div class="chat-message ai-message">
                <span class="message-avatar">🤖</span>
                <div class="message-content">
                    <p>Hallo! Lassen Sie uns gemeinsam ein neues Profil erstellen. Wie soll Ihr Profil heißen?</p>
                </div>
            </div>
        `;
        
        document.getElementById('profilePreview').innerHTML = `
            <h4>📋 Profil-Vorschau</h4>
            <p>Informationen werden während des Interviews gesammelt...</p>
        `;
        
        document.getElementById('saveProfileBtn').classList.add('hidden');
        this.profileConversationHistory = [];
    }

    async sendProfileMessage() {
        const input = document.getElementById('profileChatInput');
        const message = input.value.trim();
        
        if (message) {
            this.addChatMessage('profileChatMessages', message, 'user');
            input.value = '';
            
            // Call real AI interview API
            await this.sendToProfileAI(message);
        }
    }

    async sendToProfileAI(message) {
        // Show loading message
        const loadingMsg = this.addChatMessage('profileChatMessages', '🤖 Analysiert Ihre Antwort...', 'ai');
        
        try {
            const response = await fetch('/api/chat/profile-interview', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    message: message,
                    conversationHistory: this.profileConversationHistory,
                    profileData: {}
                })
            });

            const data = await response.json();
            
            // Remove loading message
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            if (data.success && data.response) {
                this.addChatMessage('profileChatMessages', data.response, 'ai');
                
                // Store conversation history
                this.profileConversationHistory.push(
                    { role: 'user', content: message },
                    { role: 'assistant', content: data.response }
                );
                
                // Update profile preview
                this.updateProfilePreview();
                
                // Show save button if interview is complete or after enough messages
                if (data.isComplete || this.profileConversationHistory.length >= 6) {
                    document.getElementById('saveProfileBtn').classList.remove('hidden');
                }
            } else {
                this.addChatMessage('profileChatMessages', 'Entschuldigung, es gab ein Problem. Können Sie das nochmal versuchen?', 'ai');
            }
        } catch (error) {
            console.error('Profile Interview Error:', error);
            
            // Remove loading message
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            this.addChatMessage('profileChatMessages', 'Verbindungsfehler. Bitte versuchen Sie es erneut.', 'ai');
        }
    }

    updateProfilePreview() {
        const preview = document.getElementById('profilePreview');
        const userMessages = this.profileConversationHistory.filter(msg => msg.role === 'user');
        
        let content = `<h4>📋 Profil-Vorschau</h4>`;
        
        if (userMessages.length >= 1) {
            content += `<p><strong>Name:</strong> ${userMessages[0].content}</p>`;
        }
        if (userMessages.length >= 2) {
            content += `<p><strong>Bereich:</strong> ${userMessages[1].content}</p>`;
        }
        if (userMessages.length >= 3) {
            content += `<p><strong>Details:</strong> Weitere Informationen gesammelt</p>`;
            content += `<p><strong>Status:</strong> Bereit zur Erstellung</p>`;
        }
        
        preview.innerHTML = content;
    }

    async saveProfile() {
        if (this.profileConversationHistory.length === 0) {
            this.showToast('Bitte führen Sie zuerst das Interview durch.', 'warning');
            return;
        }

        this.showLoading();
        
        try {
            // Save profile to MongoDB
            const response = await fetch('/api/profiles/create', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    conversationHistory: this.profileConversationHistory,
                    profileData: {}
                })
            });

            const data = await response.json();
            
            if (data.success && data.profile) {
                // Add new tab
                this.addProfileTab(data.profile.name, data.profile.id);
                
                // Reload profiles
                await this.loadProfiles();
                
                this.showToast('Profil erfolgreich erstellt!', 'success');
                this.closeModal('profileModal');
            } else {
                this.showToast('Fehler beim Erstellen des Profils. Bitte versuchen Sie es erneut.', 'error');
            }
        } catch (error) {
            console.error('Save Profile Error:', error);
            this.showToast('Verbindungsfehler beim Speichern des Profils.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    addProfileTab(profileName, profileId) {
        const tabsContainer = document.getElementById('profileTabs');
        
        // Remove active from all tabs
        tabsContainer.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Create new tab
        const newTab = document.createElement('div');
        newTab.className = 'tab active';
        newTab.setAttribute('data-profile', profileId);
        newTab.innerHTML = `<span>🎯 ${profileName}</span>`;
        
        tabsContainer.appendChild(newTab);
        
        // Add click event
        newTab.addEventListener('click', () => {
            tabsContainer.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            newTab.classList.add('active');
            this.currentProfile = profileId;
        });
    }

    async loadProfilesSection() {
        const container = document.querySelector('#profiles-section .profiles-container');
        if (!container) return;
        
        // Clear existing content except add button
        const addProfileBtn = container.querySelector('.add-profile');
        container.innerHTML = '';
        if (addProfileBtn) {
            container.appendChild(addProfileBtn);
        }

        // Add profile cards
        this.profiles.forEach(profile => {
            this.addProfileCard(profile, container);
        });
    }

    // In dashboard.js - ersetzen Sie die addProfileCard Methode:

addProfileCard(profile, container) {
    const profileCard = document.createElement('div');
    profileCard.className = 'profile-card';
    profileCard.setAttribute('data-profile-id', profile._id);
    profileCard.setAttribute('data-category', profile.category);
    
    const categoryIcons = {
        'work': '💼',
        'health': '🏥',
        'learning': '📚',
        'creativity': '🎨',
        'relationships': '👥',
        'finance': '💰',
        'general': '🎯'
    };
    
    const icon = categoryIcons[profile.category] || '🎯';
    const goalsList = profile.profileData?.goals && profile.profileData.goals.length > 0
        ? profile.profileData.goals.slice(0, 3).join(', ') 
        : 'Keine Ziele definiert';
    
    profileCard.innerHTML = `
        <div class="profile-status"></div>
        <div class="profile-icon">${icon}</div>
        <h3>${profile.name}</h3>
        <p><strong>Kategorie:</strong> ${this.getCategoryName(profile.category)}</p>
        <p><strong>Ziele:</strong> ${goalsList}</p>
        <p><strong>Erstellt:</strong> ${new Date(profile.createdAt).toLocaleDateString('de-DE')}</p>
        <div class="profile-actions">
            <button class="btn-chat" onclick="event.stopPropagation(); dashboardManager.openProfileChatPage('${profile._id}')">💬 Chat</button>
            <button class="btn-delete" onclick="event.stopPropagation(); dashboardManager.deleteProfile('${profile._id}')">🗑️</button>
        </div>
    `;
    
    container.appendChild(profileCard);
    
    // Add click event for the entire card - opens chat page
    profileCard.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-chat') && !e.target.closest('.btn-delete')) {
            this.openProfileChatPage(profile._id);
        }
    });
}

// Neue Methode für Chat-Seiten-Navigation:
openProfileChatPage(profileId) {
    // Navigate to dedicated chat page
    window.location.href = `/chat.html?profile=${profileId}`;
}

// Die alte openProfileChat Methode kann entfernt werden da wir jetzt eine separate Seite haben

    getCategoryName(category) {
        const categoryNames = {
            'work': 'Arbeit',
            'health': 'Gesundheit',
            'learning': 'Lernen',
            'creativity': 'Kreativität',
            'relationships': 'Beziehungen',
            'finance': 'Finanzen',
            'general': 'Allgemein'
        };
        return categoryNames[category] || 'Allgemein';
    }

    async openProfileChat(profileId) {
        try {
            console.log('Opening profile chat for:', profileId);
            
            // Find profile
            const profile = this.profiles.find(p => p._id === profileId);
            if (!profile) {
                this.showToast('Profil nicht gefunden', 'error');
                return;
            }

            // Load profile conversation history
            const response = await fetch(`/api/profiles/${profileId}/history?limit=20`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.openProfileChatModal(profile, data.history || []);
            } else {
                this.showToast('Fehler beim Laden des Chatverlaufs', 'error');
            }
        } catch (error) {
            console.error('Error opening profile chat:', error);
            this.showToast('Verbindungsfehler', 'error');
        }
    }

    openProfileChatModal(profile, history) {
        // Set current profile for chat first
        this.currentProfileForChat = profile._id;
        
        // Create or update profile chat modal
        let modal = document.getElementById('profileChatModal');
        if (!modal) {
            modal = this.createProfileChatModal();
        }

        // Update modal content
        document.getElementById('profileChatTitle').textContent = `💬 Chat mit ${profile.name}`;
        
        // Load conversation history
        const messagesContainer = document.getElementById('profileChatMessages');
        messagesContainer.innerHTML = '';
        
        if (history.length === 0) {
            this.addChatMessage('profileChatMessages', `Hallo! Ich bin Ihr persönlicher Assistent für ${profile.name}. Wie kann ich Ihnen heute helfen?`, 'ai');
        } else {
            history.reverse().forEach(msg => {
                this.addChatMessage('profileChatMessages', msg.content, msg.role === 'user' ? 'user' : 'ai');
            });
        }
        
        this.showModal('profileChatModal');
    }

    createProfileChatModal() {
        const modal = document.createElement('div');
        modal.id = 'profileChatModal';
        modal.className = 'modal-overlay hidden';
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="profileChatTitle">💬 Profil Chat</h3>
                    <button class="modal-close" onclick="dashboardManager.closeModal('profileChatModal')">✕</button>
                </div>
                <div class="chat-messages" id="profileChatMessages"></div>
                <div class="chat-input-container">
                    <input type="text" 
                           class="chat-input" 
                           placeholder="Nachricht eingeben..." 
                           id="profileChatInput"
                           onkeypress="if(event.key==='Enter') dashboardManager.sendProfileChatMessage()">
                    <button class="chat-send-btn" onclick="dashboardManager.sendProfileChatMessage()">→</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        return modal;
    }

    async sendProfileChatMessage() {
        const input = document.getElementById('profileChatInput');
        const message = input.value.trim();
        
        if (!message || !this.currentProfileForChat) return;
        
        // Add user message to UI
        this.addChatMessage('profileChatMessages', message, 'user');
        input.value = '';
        
        // Show loading message
        const loadingMsg = this.addChatMessage('profileChatMessages', '🤖 Denkt nach...', 'ai');
        
        try {
            const response = await fetch(`/api/profiles/${this.currentProfileForChat}/chat`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ message })
            });

            const data = await response.json();
            
            // Remove loading message
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            if (data.success && data.response) {
                this.addChatMessage('profileChatMessages', data.response, 'ai');
            } else {
                this.addChatMessage('profileChatMessages', 'Entschuldigung, ich konnte nicht antworten. Bitte versuchen Sie es erneut.', 'ai');
            }
        } catch (error) {
            console.error('Profile Chat Error:', error);
            
            // Remove loading message
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            this.addChatMessage('profileChatMessages', 'Verbindungsfehler. Bitte versuchen Sie es erneut.', 'ai');
        }
    }

    async deleteProfile(profileId) {
        if (!confirm('Möchten Sie dieses Profil wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            return;
        }

        this.showLoading();
        
        try {
            const response = await fetch(`/api/profiles/${profileId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                // Remove from local array
                this.profiles = this.profiles.filter(p => p._id !== profileId);
                
                // Update UI
                this.updateProfileTabs();
                if (this.currentSection === 'profiles') {
                    this.loadProfilesSection();
                }
                
                this.showToast('Profil erfolgreich gelöscht', 'success');
            } else {
                this.showToast('Fehler beim Löschen des Profils', 'error');
            }
        } catch (error) {
            console.error('Delete Profile Error:', error);
            this.showToast('Verbindungsfehler beim Löschen', 'error');
        } finally {
            this.hideLoading();
        }
    }

    addChatMessage(containerId, message, sender) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container not found:', containerId);
            return null;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}-message`;
        
        const avatar = sender === 'user' ? '👤' : '🤖';
        
        messageDiv.innerHTML = `
            <span class="message-avatar">${avatar}</span>
            <div class="message-content">
                <p>${message}</p>
            </div>
        `;
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
        
        return messageDiv; // Return for potential removal
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    showLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Click to dismiss
        toast.addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        // Auto remove after 4 seconds
        setTimeout(() => {
            this.removeToast(toast);
        }, 4000);
    }

    removeToast(toast) {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
}

// Initialize Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Export for potential use in other scripts
window.DashboardManager = DashboardManager;