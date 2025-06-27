class DashboardManager {
    constructor() {
        this.currentSection = 'home';
        this.profiles = [];
        this.currentProfile = null;
        this.currentProfileForChat = null;
        this.conversationHistory = [];
        this.profileConversationHistory = [];
        this.selectedProfiles = new Set();
        this.sortOrder = 'updated';
        this.filterCategory = 'all';
        this.searchQuery = '';
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.bindEvents();
        this.initializeComponents();
        this.setupAdvancedFeatures();
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

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('allKiAuthToken')}`,
            'X-User-Email': localStorage.getItem('allKiUserEmail')
        };
    }

    // ERWEITERTE PROFILE-VERWALTUNG
    async loadProfiles() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/profiles/enhanced', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.profiles = data.profiles || [];
                this.updateDashboardSummary(data.summary);
                this.updateProfileTabs();
                this.renderProfilesSection();
                console.log('📊 Enhanced profiles loaded:', this.profiles.length);
            } else {
                console.log('No profiles found or error loading profiles');
                this.profiles = [];
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.profiles = [];
            this.showToast('Fehler beim Laden der Profile', 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateDashboardSummary(summary) {
        if (!summary) return;

        // Update overview widget with real statistics
        const overviewList = document.querySelector('.overview-list');
        if (overviewList) {
            overviewList.innerHTML = `
                <li>
                    <span class="overview-icon">👤</span>
                    <span>${summary.totalProfiles} Profile erstellt</span>
                </li>
                <li>
                    <span class="overview-icon">💬</span>
                    <span>${summary.totalConversations} Gespräche geführt</span>
                </li>
                <li>
                    <span class="overview-icon">📝</span>
                    <span>${summary.totalMessages} Nachrichten ausgetauscht</span>
                </li>
                <li>
                    <span class="overview-icon">⚡</span>
                    <span>${summary.activeProfiles} aktive Profile</span>
                </li>
            `;
        }
    }

    renderProfilesSection() {
        const container = document.querySelector('#profiles-section .profiles-container');
        if (!container) return;
        
        // Clear existing content except add button
        const addProfileBtn = container.querySelector('.add-profile');
        container.innerHTML = '';
        
        // Add profile management controls
        this.addProfileControls(container);
        
        // Filter and sort profiles
        const filteredProfiles = this.getFilteredAndSortedProfiles();
        
        if (filteredProfiles.length === 0) {
            this.addEmptyState(container);
        } else {
            // Add bulk selection controls if profiles selected
            if (this.selectedProfiles.size > 0) {
                this.addBulkControls(container);
            }
            
            // Add profile cards
            filteredProfiles.forEach(profile => {
                this.addEnhancedProfileCard(profile, container);
            });
        }
        
        // Add the "Add Profile" button back
        if (addProfileBtn) {
            container.appendChild(addProfileBtn);
        }
    }

    addProfileControls(container) {
        const controls = document.createElement('div');
        controls.className = 'profile-controls';
        controls.innerHTML = `
            <div class="profile-search">
                <input type="text" placeholder="Profile durchsuchen..." 
                       id="profileSearchInput" value="${this.searchQuery}">
                <button class="search-clear-btn" id="clearSearchBtn" 
                        style="display: ${this.searchQuery ? 'block' : 'none'}">✕</button>
            </div>
            <div class="profile-filters">
                <select id="categoryFilter">
                    <option value="all">Alle Kategorien</option>
                    <option value="work">Arbeit</option>
                    <option value="health">Gesundheit</option>
                    <option value="learning">Lernen</option>
                    <option value="creativity">Kreativität</option>
                    <option value="relationships">Beziehungen</option>
                    <option value="finance">Finanzen</option>
                    <option value="general">Allgemein</option>
                </select>
                <select id="sortOrder">
                    <option value="updated">Zuletzt verwendet</option>
                    <option value="created">Erstellungsdatum</option>
                    <option value="name">Name A-Z</option>
                    <option value="activity">Aktivität</option>
                    <option value="messages">Nachrichten</option>
                </select>
            </div>
            <div class="profile-stats">
                <span class="stat">
                    <strong>${this.profiles.length}</strong> Profile
                </span>
                <span class="stat">
                    <strong>${this.profiles.filter(p => p.health && p.health.status === 'active').length}</strong> aktiv
                </span>
            </div>
        `;
        
        container.appendChild(controls);
        this.bindProfileControlEvents();
    }

    bindProfileControlEvents() {
        // Search functionality
        const searchInput = document.getElementById('profileSearchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                if (clearBtn) clearBtn.style.display = this.searchQuery ? 'block' : 'none';
                this.renderProfilesSection();
            });
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.searchQuery = '';
                if (searchInput) searchInput.value = '';
                clearBtn.style.display = 'none';
                this.renderProfilesSection();
            });
        }
        
        // Filter controls
        const categoryFilter = document.getElementById('categoryFilter');
        const sortOrder = document.getElementById('sortOrder');
        
        if (categoryFilter) {
            categoryFilter.value = this.filterCategory;
            categoryFilter.addEventListener('change', (e) => {
                this.filterCategory = e.target.value;
                this.renderProfilesSection();
            });
        }
        
        if (sortOrder) {
            sortOrder.value = this.sortOrder;
            sortOrder.addEventListener('change', (e) => {
                this.sortOrder = e.target.value;
                this.renderProfilesSection();
            });
        }
    }

    getFilteredAndSortedProfiles() {
        let filtered = [...this.profiles];
        
        // Apply search filter
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(profile => 
                profile.name.toLowerCase().includes(query) ||
                profile.category.toLowerCase().includes(query) ||
                (profile.profileData.goals && profile.profileData.goals.some(goal => 
                    goal.toLowerCase().includes(query)
                )) ||
                (profile.profileData.preferences && profile.profileData.preferences.some(pref => 
                    pref.toLowerCase().includes(query)
                ))
            );
        }
        
        // Apply category filter
        if (this.filterCategory !== 'all') {
            filtered = filtered.filter(profile => profile.category === this.filterCategory);
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortOrder) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'activity':
                    return (b.stats && b.stats.activityScore || 0) - (a.stats && a.stats.activityScore || 0);
                case 'messages':
                    return (b.stats && b.stats.totalMessages || 0) - (a.stats && a.stats.totalMessages || 0);
                case 'updated':
                default:
                    return new Date(b.updatedAt) - new Date(a.updatedAt);
            }
        });
        
        return filtered;
    }

    addEnhancedProfileCard(profile, container) {
        const profileCard = document.createElement('div');
        profileCard.className = `profile-card enhanced ${this.selectedProfiles.has(profile._id) ? 'selected' : ''}`;
        profileCard.setAttribute('data-profile-id', profile._id);
        profileCard.setAttribute('data-category', profile.category);
        
        const categoryIcons = {
            'work': '💼', 'health': '🏥', 'learning': '📚', 'creativity': '🎨',
            'relationships': '👥', 'finance': '💰', 'general': '🎯'
        };
        
        const icon = categoryIcons[profile.category] || '🎯';
        const activityClass = profile.health && profile.health.status === 'active' ? 'active' : 'inactive';
        const engagementClass = profile.health && profile.health.engagement || 'low';
        
        // Calculate time since last activity
        const lastActivity = profile.health && profile.health.lastUsed ? 
            this.getRelativeTime(new Date(profile.health.lastUsed)) : 'Nie verwendet';
            
        // Get top goals (max 2)
        const topGoals = profile.profileData.goals && profile.profileData.goals.slice(0, 2) || [];
        
        // Get insights preview
        const topInsight = profile.insights && profile.insights[0];
        
        profileCard.innerHTML = `
            <div class="profile-header">
                <div class="profile-selection">
                    <input type="checkbox" class="profile-checkbox" 
                           ${this.selectedProfiles.has(profile._id) ? 'checked' : ''}
                           onchange="dashboardManager.toggleProfileSelection('${profile._id}', this.checked)">
                </div>
                <div class="profile-status-indicator ${activityClass}"></div>
                <div class="profile-icon">${icon}</div>
                <div class="profile-actions-menu">
                    <button class="menu-trigger" onclick="dashboardManager.showProfileMenu(event, '${profile._id}')">⋯</button>
                </div>
            </div>
            
            <div class="profile-main">
                <h3 class="profile-name" title="${profile.name}">${profile.name}</h3>
                <p class="profile-category">${this.getCategoryName(profile.category)}</p>
                
                <div class="profile-goals">
                    ${topGoals.map(goal => `<span class="goal-tag">${goal}</span>`).join('')}
                    ${profile.profileData.goals && profile.profileData.goals.length > 2 ? 
                        `<span class="goal-more">+${profile.profileData.goals.length - 2} mehr</span>` : ''}
                </div>
                
                ${topInsight ? `
                    <div class="profile-insight">
                        <span class="insight-icon">💡</span>
                        <span class="insight-text">${topInsight.content.substring(0, 60)}...</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="profile-stats-grid">
                <div class="stat-item">
                    <span class="stat-value">${profile.stats && profile.stats.totalChats || 0}</span>
                    <span class="stat-label">Chats</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${profile.stats && profile.stats.totalMessages || 0}</span>
                    <span class="stat-label">Nachrichten</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value engagement-${engagementClass}">${this.getEngagementIcon(engagementClass)}</span>
                    <span class="stat-label">Engagement</span>
                </div>
            </div>
            
            <div class="profile-footer">
                <div class="profile-last-activity">
                    <span class="activity-text">Zuletzt: ${lastActivity}</span>
                </div>
                <div class="profile-quick-actions">
                    <button class="quick-action-btn primary" 
                            onclick="event.stopPropagation(); dashboardManager.openProfileChatPage('${profile._id}')"
                            title="Chat öffnen">
                        💬
                    </button>
                    <button class="quick-action-btn secondary" 
                            onclick="event.stopPropagation(); dashboardManager.showProfileDetails('${profile._id}')"
                            title="Details anzeigen">
                        📊
                    </button>
                    <button class="quick-action-btn secondary" 
                            onclick="event.stopPropagation(); dashboardManager.editProfile('${profile._id}')"
                            title="Bearbeiten">
                        ✏️
                    </button>
                </div>
            </div>
        `;
        
        // Add click handler for the entire card
        profileCard.addEventListener('click', (e) => {
            if (!e.target.closest('.profile-checkbox') && 
                !e.target.closest('.quick-action-btn') && 
                !e.target.closest('.menu-trigger')) {
                this.openProfileChatPage(profile._id);
            }
        });
        
        container.appendChild(profileCard);
    }

    // PROFILE MANAGEMENT FUNCTIONS
    toggleProfileSelection(profileId, isSelected) {
        if (isSelected) {
            this.selectedProfiles.add(profileId);
        } else {
            this.selectedProfiles.delete(profileId);
        }
        
        // Update visual selection
        const card = document.querySelector(`[data-profile-id="${profileId}"]`);
        if (card) {
            card.classList.toggle('selected', isSelected);
        }
        
        // Update bulk controls
        this.renderProfilesSection();
    }

    addBulkControls(container) {
        const bulkControls = document.createElement('div');
        bulkControls.className = 'bulk-controls';
        bulkControls.innerHTML = `
            <div class="bulk-info">
                <span>${this.selectedProfiles.size} Profile ausgewählt</span>
                <button class="bulk-clear" onclick="dashboardManager.clearSelection()">Auswahl aufheben</button>
            </div>
            <div class="bulk-actions">
                <button class="bulk-action-btn" onclick="dashboardManager.bulkAction('archive')">
                    📁 Archivieren
                </button>
                <button class="bulk-action-btn danger" onclick="dashboardManager.bulkAction('delete')">
                    🗑️ Löschen
                </button>
                <select onchange="dashboardManager.bulkCategoryUpdate(this.value)">
                    <option value="">Kategorie ändern...</option>
                    <option value="work">Arbeit</option>
                    <option value="health">Gesundheit</option>
                    <option value="learning">Lernen</option>
                    <option value="creativity">Kreativität</option>
                    <option value="relationships">Beziehungen</option>
                    <option value="finance">Finanzen</option>
                    <option value="general">Allgemein</option>
                </select>
            </div>
        `;
        
        container.appendChild(bulkControls);
    }

    async bulkAction(action) {
        if (this.selectedProfiles.size === 0) return;
        
        const profileIds = Array.from(this.selectedProfiles);
        const confirmMessage = action === 'delete' 
            ? `Möchten Sie wirklich ${profileIds.length} Profile löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
            : `Möchten Sie ${profileIds.length} Profile ${action === 'archive' ? 'archivieren' : 'bearbeiten'}?`;
        
        if (!confirm(confirmMessage)) return;
        
        try {
            this.showLoading();
            
            const response = await fetch('/api/profiles/bulk-action', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    action: action,
                    profileIds: profileIds
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast(result.message, 'success');
                this.clearSelection();
                await this.loadProfiles();
            } else {
                this.showToast('Fehler bei der Bulk-Aktion', 'error');
            }
        } catch (error) {
            console.error('Bulk action error:', error);
            this.showToast('Verbindungsfehler', 'error');
        } finally {
            this.hideLoading();
        }
    }

    clearSelection() {
        this.selectedProfiles.clear();
        document.querySelectorAll('.profile-checkbox').forEach(cb => cb.checked = false);
        document.querySelectorAll('.profile-card').forEach(card => card.classList.remove('selected'));
        this.renderProfilesSection();
    }

    addEmptyState(container) {
        const emptyState = document.createElement('div');
        emptyState.className = 'profiles-empty';
        emptyState.innerHTML = `
            <div class="empty-icon">📋</div>
            <h3>Keine Profile gefunden</h3>
            <p>Erstellen Sie Ihr erstes Profil, um mit Ihrem persönlichen KI-Assistenten zu beginnen.</p>
            <button class="create-first-btn" onclick="dashboardManager.openProfileCreation()">
                Erstes Profil erstellen
            </button>
        `;
        container.appendChild(emptyState);
    }

    // PROFILE DETAILS MODAL
    async showProfileDetails(profileId) {
        try {
            this.showLoading();
            
            const response = await fetch(`/api/profiles/${profileId}/details`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            if (response.ok) {
                const data = await response.json();
                this.openProfileDetailsModal(data);
            } else {
                this.showToast('Fehler beim Laden der Profildetails', 'error');
            }
        } catch (error) {
            console.error('Profile details error:', error);
            this.showToast('Verbindungsfehler', 'error');
        } finally {
            this.hideLoading();
        }
    }

    openProfileDetailsModal(data) {
        const { profile, analysis, recommendations } = data;
        
        // Create or update modal
        let modal = document.getElementById('profileDetailsModal');
        if (!modal) {
            modal = this.createProfileDetailsModal();
        }
        
        // Update modal content with detailed analysis
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div class="modal-header">
                <h3>📊 ${profile.name} - Detailanalyse</h3>
                <button class="modal-close" onclick="dashboardManager.closeModal('profileDetailsModal')">✕</button>
            </div>
            <div class="profile-details-content">
                <div class="details-grid">
                    <div class="detail-section">
                        <h4>💬 Gespräche</h4>
                        <div class="stats-row">
                            <div class="stat">
                                <span class="value">${analysis.conversation.totalChats}</span>
                                <span class="label">Chats</span>
                            </div>
                            <div class="stat">
                                <span class="value">${analysis.conversation.totalMessages}</span>
                                <span class="label">Nachrichten</span>
                            </div>
                            <div class="stat">
                                <span class="value">${Math.round(analysis.conversation.avgSessionLength)}</span>
                                <span class="label">Ø Session</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>🧠 Erinnerungen</h4>
                        <div class="stats-row">
                            <div class="stat">
                                <span class="value">${analysis.memory.totalMemories}</span>
                                <span class="label">Gesamt</span>
                            </div>
                        </div>
                        
                        ${analysis.memory.importantMemories.length > 0 ? `
                        <div class="important-memories">
                            <h5>Wichtige Erinnerungen:</h5>
                            ${analysis.memory.importantMemories.slice(0, 3)
                                .map(memory => `<div class="memory-item">
                                    <span class="memory-content">${memory.content}</span>
                                    <span class="memory-importance">${Math.round(memory.importance * 100)}%</span>
                                </div>`).join('')}
                        </div>
                        ` : ''}
                    </div>
                    
                    <div class="detail-section">
                        <h4>🎯 Ziele & Fortschritt</h4>
                        <div class="goals-progress">
                            ${analysis.goals.map(goal => `
                                <div class="goal-progress">
                                    <span class="goal-name">${goal.goal}</span>
                                    <div class="goal-mentions">
                                        <span class="mentions-count">${goal.mentions}</span>
                                        <span class="mentions-label">Erwähnungen</span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>💡 Empfehlungen</h4>
                        <div class="recommendations">
                            ${recommendations.map(rec => `
                                <div class="recommendation ${rec.priority}">
                                    <h5>${rec.title}</h5>
                                    <p>${rec.description}</p>
                                    <button class="rec-action" onclick="dashboardManager.executeRecommendation('${rec.action}', '${profile._id}')">
                                        Umsetzen
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal('profileDetailsModal');
    }

    // UTILITY FUNCTIONS
    getRelativeTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Gerade eben';
        if (minutes < 60) return `vor ${minutes}m`;
        if (hours < 24) return `vor ${hours}h`;
        if (days < 7) return `vor ${days}d`;
        if (days < 30) return `vor ${Math.floor(days/7)}w`;
        return `vor ${Math.floor(days/30)}mon`;
    }

    getEngagementIcon(level) {
        const icons = {
            'high': '🔥',
            'medium': '⚡',
            'low': '💤'
        };
        return icons[level] || '➖';
    }

    getCategoryName(category) {
        const names = {
            'work': 'Arbeit', 'health': 'Gesundheit', 'learning': 'Lernen',
            'creativity': 'Kreativität', 'relationships': 'Beziehungen',
            'finance': 'Finanzen', 'general': 'Allgemein'
        };
        return names[category] || 'Allgemein';
    }

    openProfileChatPage(profileId) {
        window.location.href = `/chat.html?profile=${profileId}`;
    }

    // EXISTING METHODS (from original dashboard.js)
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

        // Profile Creation
        document.getElementById('addProfileBtn').addEventListener('click', () => {
            this.openProfileCreation();
        });

        document.getElementById('createProfileBtn').addEventListener('click', () => {
            this.openProfileCreation();
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

    setupAdvancedFeatures() {
        // Setup keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'f':
                        e.preventDefault();
                        document.getElementById('profileSearchInput')?.focus();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.openProfileCreation();
                        break;
                    case 'a':
                        if (this.currentSection === 'profiles') {
                            e.preventDefault();
                            this.selectAllProfiles();
                        }
                        break;
                }
            }
        });
    }

    selectAllProfiles() {
        const visibleProfiles = this.getFilteredAndSortedProfiles();
        visibleProfiles.forEach(profile => {
            this.selectedProfiles.add(profile._id);
        });
        this.renderProfilesSection();
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
            this.renderProfilesSection();
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

    updateProfileTabs() {
        const tabsContainer = document.getElementById('profileTabs');
        
        // Clear existing tabs except general
        const generalTab = tabsContainer.querySelector('[data-profile="general"]');
        tabsContainer.innerHTML = '';
        if (generalTab) {
            tabsContainer.appendChild(generalTab);
        }

        // Add profile tabs (first 5 most recent)
        this.profiles.slice(0, 5).forEach(profile => {
            this.addProfileTab(profile.name, profile._id);
        });
    }

    addProfileTab(profileName, profileId) {
        const tabsContainer = document.getElementById('profileTabs');
        
        // Remove active from all tabs
        tabsContainer.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Create new tab
        const newTab = document.createElement('div');
        newTab.className = 'tab';
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

    openProfileCreation() {
        this.showModal('profileModal');
        this.resetProfileChat();
    }

    resetProfileChat() {
        const messagesContainer = document.getElementById('profileChatMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="chat-message ai-message">
                    <span class="message-avatar">🤖</span>
                    <div class="message-content">
                        <p>Hallo! Lassen Sie uns gemeinsam ein neues Profil erstellen. Wie soll Ihr Profil heißen?</p>
                    </div>
                </div>
            `;
        }
        
        const profilePreview = document.getElementById('profilePreview');
        if (profilePreview) {
            profilePreview.innerHTML = `
                <h4>📋 Profil-Vorschau</h4>
                <p>Informationen werden während des Interviews gesammelt...</p>
            `;
        }
        
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.classList.add('hidden');
        }
        
        this.profileConversationHistory = [];
    }

    // Modal management
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

    createProfileDetailsModal() {
        const modal = document.createElement('div');
        modal.id = 'profileDetailsModal';
        modal.className = 'modal-overlay hidden';
        modal.innerHTML = '<div class="modal-content large"></div>';
        document.body.appendChild(modal);
        return modal;
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
        
        return messageDiv;
    }

    async sendToAI(message, containerId) {
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
            
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            if (data.success && data.response) {
                this.addChatMessage(containerId, data.response, 'ai');
            } else {
                this.addChatMessage(containerId, 'Entschuldigung, ich konnte nicht antworten. Bitte versuchen Sie es erneut.', 'ai');
            }
        } catch (error) {
            console.error('AI Chat Error:', error);
            
            if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
            }
            
            this.addChatMessage(containerId, 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.', 'ai');
        }
    }

    showLoading() {
        document.getElementById('loadingOverlay')?.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingOverlay')?.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 4000);
    }
}

// Initialize Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Export for use in other scripts
window.DashboardManager = DashboardManager;