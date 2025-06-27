/**
 * 🏠 DASHBOARD MANAGEMENT
 * Zentrale Steuerung für das Dashboard
 * 
 * SEPARATION OF CONCERNS:
 * - Navigation zwischen Sektionen
 * - Profile Management
 * - User Authentication
 * - Modal Management
 * - Search & Filter Functionality
 */

class DashboardManager {
    constructor() {
        this.currentSection = 'home';
        this.profiles = [];
        this.filteredProfiles = [];
        this.selectedProfiles = new Set();
        this.currentUser = null;
        this.searchQuery = '';
        this.currentSort = 'lastUsed';
        this.currentFilter = 'all';

        this.initializeApp();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    async initializeApp() {
        try {
            // Check authentication
            await this.checkAuthentication();
            
            // Initialize event listeners
            this.initializeEventListeners();
            
            // Load initial data
            await this.loadUserData();
            
            // Initialize sections
            this.initializeSections();
            
            // Set initial section
            this.switchSection('home');
            
            console.log('✅ Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Dashboard initialization failed:', error);
            this.handleAuthenticationError();
        }
    }

    async checkAuthentication() {
        const token = localStorage.getItem('allKiAuthToken');
        const email = localStorage.getItem('allKiUserEmail');
        
        if (!token || !email) {
            throw new Error('Not authenticated');
        }

        // Verify token with server
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Email': email
                }
            });

            if (!response.ok) {
                throw new Error('Token invalid');
            }

            const userData = await response.json();
            this.currentUser = userData.user;
            
        } catch (error) {
            console.log('Token verification failed, continuing with stored data');
            this.currentUser = {
                email: email,
                name: localStorage.getItem('allKiUserName') || 'Benutzer'
            };
        }
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.switchSection(section);
            });
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Profile Search
        document.getElementById('profileSearch')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterAndRenderProfiles();
        });

        // Search Clear Button
        document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
            document.getElementById('profileSearch').value = '';
            this.searchQuery = '';
            this.filterAndRenderProfiles();
        });

        // Profile Sort
        document.getElementById('profileSort')?.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndRenderProfiles();
        });

        // Profile Filter
        document.getElementById('profileFilter')?.addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.filterAndRenderProfiles();
        });

        // Bulk Actions
        document.getElementById('bulkActionSelect')?.addEventListener('change', (e) => {
            if (e.target.value && this.selectedProfiles.size > 0) {
                this.handleBulkAction(e.target.value);
                e.target.value = '';
            }
        });

        // Select All Profiles
        document.getElementById('selectAllProfiles')?.addEventListener('click', () => {
            this.toggleSelectAllProfiles();
        });

        // Create Profile
        document.getElementById('createProfileBtn')?.addEventListener('click', () => {
            this.showCreateProfileModal();
        });

        // Keyboard shortcuts
        this.initializeKeyboardShortcuts();

        // Window events
        window.addEventListener('beforeunload', () => {
            this.saveCurrentState();
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        this.showCreateProfileModal();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('profileSearch')?.focus();
                        break;
                    case 'a':
                        if (this.currentSection === 'profiles') {
                            e.preventDefault();
                            this.selectAllProfiles();
                        }
                        break;
                }
            }

            // Number keys for section switching
            if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey) {
                const sections = ['home', 'profiles', 'calendar', 'email', 'widgets'];
                const sectionIndex = parseInt(e.key) - 1;
                if (sections[sectionIndex]) {
                    this.switchSection(sections[sectionIndex]);
                }
            }
        });
    }

    initializeSections() {
        // Home Section
        this.initializeHomeSection();
        
        // Profiles Section
        this.initializeProfilesSection();
        
        // Calendar Section
        this.initializeCalendarSection();
        
        // Email Section
        this.initializeEmailSection();
        
        // Widgets Section - handled by widgets.js
    }

    // ========================================
    // NAVIGATION & SECTIONS
    // ========================================

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.currentSection = sectionName;

        // Load section-specific content
        this.loadSectionContent(sectionName);

        // Update URL without reload
        const url = new URL(window.location);
        url.searchParams.set('section', sectionName);
        window.history.replaceState({}, '', url);
    }

    async loadSectionContent(sectionName) {
        switch (sectionName) {
            case 'home':
                await this.loadHomeContent();
                break;
            case 'profiles':
                await this.loadProfilesContent();
                break;
            case 'calendar':
                await this.loadCalendarContent();
                break;
            case 'email':
                await this.loadEmailContent();
                break;
            case 'widgets':
                // Redirect to widgets page
                window.location.href = 'widgets.html';
                break;
        }
    }

    // ========================================
    // HOME SECTION
    // ========================================

    initializeHomeSection() {
        // Home section initialization
    }

    async loadHomeContent() {
        try {
            const welcomeMessage = document.getElementById('welcomeMessage');
            if (welcomeMessage && this.currentUser) {
                welcomeMessage.textContent = `Willkommen zurück, ${this.currentUser.name}!`;
            }

            // Load recent profiles
            await this.loadRecentProfiles();
            
            // Load quick stats
            await this.loadQuickStats();
            
        } catch (error) {
            console.error('Error loading home content:', error);
        }
    }

    async loadRecentProfiles() {
        try {
            const recentProfiles = this.profiles
                .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))
                .slice(0, 5);

            const container = document.getElementById('recentProfilesContainer');
            if (container) {
                container.innerHTML = this.renderRecentProfilesList(recentProfiles);
            }
        } catch (error) {
            console.error('Error loading recent profiles:', error);
        }
    }

    async loadQuickStats() {
        const stats = {
            totalProfiles: this.profiles.length,
            activeProfiles: this.profiles.filter(p => p.status === 'active').length,
            totalChats: this.profiles.reduce((sum, p) => sum + (p.chatCount || 0), 0),
            weeklyUsage: this.calculateWeeklyUsage()
        };

        const container = document.getElementById('quickStatsContainer');
        if (container) {
            container.innerHTML = this.renderQuickStats(stats);
        }
    }

    // ========================================
    // PROFILES SECTION
    // ========================================

    initializeProfilesSection() {
        // Profiles section specific initialization
    }

    async loadProfilesContent() {
        await this.loadProfiles();
        this.renderProfilesSection();
    }

    async loadProfiles() {
        try {
            const response = await fetch('/api/profiles', {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.profiles = data.profiles || [];
                this.filteredProfiles = [...this.profiles];
            } else {
                console.error('Failed to load profiles');
                this.profiles = [];
            }
        } catch (error) {
            console.error('Error loading profiles:', error);
            this.profiles = [];
        }
    }

    renderProfilesSection() {
        this.filterAndRenderProfiles();
        this.updateProfilesHeader();
    }

    filterAndRenderProfiles() {
        let filtered = [...this.profiles];

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(profile => 
                profile.name.toLowerCase().includes(this.searchQuery) ||
                profile.category.toLowerCase().includes(this.searchQuery) ||
                (profile.description && profile.description.toLowerCase().includes(this.searchQuery))
            );
        }

        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(profile => 
                profile.category.toLowerCase() === this.currentFilter.toLowerCase()
            );
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'category':
                    return a.category.localeCompare(b.category);
                case 'created':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'lastUsed':
                default:
                    return new Date(b.lastUsed || b.updatedAt) - new Date(a.lastUsed || a.updatedAt);
            }
        });

        this.filteredProfiles = filtered;
        this.renderProfilesList();
    }

    renderProfilesList() {
        const container = document.getElementById('profilesContainer');
        if (!container) return;

        if (this.filteredProfiles.length === 0) {
            container.innerHTML = this.renderEmptyProfilesState();
            return;
        }

        const html = this.filteredProfiles.map(profile => 
            this.renderProfileCard(profile)
        ).join('');

        container.innerHTML = html;

        // Add event listeners to profile cards
        this.initializeProfileCardEvents();
    }

    renderProfileCard(profile) {
        const isSelected = this.selectedProfiles.has(profile._id);
        const lastUsed = profile.lastUsed ? 
            new Date(profile.lastUsed).toLocaleDateString('de-DE') : 
            'Nie verwendet';

        return `
            <div class="profile-card ${isSelected ? 'selected' : ''}" data-profile-id="${profile._id}">
                <div class="profile-card-header">
                    <div class="profile-checkbox">
                        <input type="checkbox" class="profile-select" 
                               data-profile-id="${profile._id}" ${isSelected ? 'checked' : ''}>
                    </div>
                    <div class="profile-category">${profile.category}</div>
                    <div class="profile-menu">
                        <button class="profile-menu-btn" data-profile-id="${profile._id}">⋮</button>
                    </div>
                </div>
                
                <div class="profile-card-body">
                    <h3 class="profile-title">${profile.name}</h3>
                    <p class="profile-description">${profile.description || 'Keine Beschreibung verfügbar'}</p>
                    
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <span class="stat-icon">💬</span>
                            <span class="stat-value">${profile.chatCount || 0}</span>
                            <span class="stat-label">Chats</span>
                        </div>
                        <div class="profile-stat">
                            <span class="stat-icon">📅</span>
                            <span class="stat-value">${lastUsed}</span>
                            <span class="stat-label">Zuletzt</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-card-footer">
                    <button class="btn btn-secondary btn-sm profile-edit-btn" data-profile-id="${profile._id}">
                        ⚙️ Bearbeiten
                    </button>
                    <button class="btn btn-primary btn-sm profile-chat-btn" data-profile-id="${profile._id}">
                        💬 Chat starten
                    </button>
                </div>
            </div>
        `;
    }

    initializeProfileCardEvents() {
        // Profile selection
        document.querySelectorAll('.profile-select').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const profileId = e.target.dataset.profileId;
                if (e.target.checked) {
                    this.selectedProfiles.add(profileId);
                } else {
                    this.selectedProfiles.delete(profileId);
                }
                this.updateProfilesHeader();
                this.updateProfileCardSelection(profileId, e.target.checked);
            });
        });

        // Profile chat buttons
        document.querySelectorAll('.profile-chat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const profileId = e.target.dataset.profileId;
                this.startProfileChat(profileId);
            });
        });

        // Profile edit buttons
        document.querySelectorAll('.profile-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const profileId = e.target.dataset.profileId;
                this.editProfile(profileId);
            });
        });

        // Profile menu buttons
        document.querySelectorAll('.profile-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const profileId = e.target.dataset.profileId;
                const rect = e.target.getBoundingClientRect();
                this.showProfileContextMenu(rect.right - 10, rect.bottom + 5, profileId);
            });
        });

        // Profile card clicks
        document.querySelectorAll('.profile-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Skip if clicking on interactive elements
                if (e.target.closest('.profile-checkbox, .profile-menu, .btn')) {
                    return;
                }
                
                const profileId = card.dataset.profileId;
                this.viewProfile(profileId);
            });
        });
    }

    // ========================================
    // PROFILE ACTIONS
    // ========================================

    async startProfileChat(profileId) {
        const profile = this.profiles.find(p => p._id === profileId);
        if (!profile) return;

        try {
            // Update last used timestamp
            await this.updateProfileLastUsed(profileId);
            
            // Open chat modal or navigate to chat
            this.openProfileChatModal(profile);
            
        } catch (error) {
            console.error('Error starting profile chat:', error);
            this.showToast('Fehler beim Starten des Chats', 'error');
        }
    }

    async editProfile(profileId) {
        const profile = this.profiles.find(p => p._id === profileId);
        if (!profile) return;

        this.showEditProfileModal(profile);
    }

    async deleteProfile(profileId) {
        if (!confirm('Profil wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            return;
        }

        try {
            const response = await fetch(`/api/profiles/${profileId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                this.profiles = this.profiles.filter(p => p._id !== profileId);
                this.selectedProfiles.delete(profileId);
                this.filterAndRenderProfiles();
                this.showToast('Profil erfolgreich gelöscht', 'success');
            } else {
                throw new Error('Failed to delete profile');
            }
        } catch (error) {
            console.error('Error deleting profile:', error);
            this.showToast('Fehler beim Löschen des Profils', 'error');
        }
    }

    async duplicateProfile(profileId) {
        const profile = this.profiles.find(p => p._id === profileId);
        if (!profile) return;

        try {
            const duplicatedProfile = {
                ...profile,
                name: `${profile.name} (Kopie)`,
                _id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                lastUsed: undefined,
                chatCount: 0
            };

            const response = await fetch('/api/profiles', {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(duplicatedProfile)
            });

            if (response.ok) {
                const data = await response.json();
                this.profiles.push(data.profile);
                this.filterAndRenderProfiles();
                this.showToast('Profil erfolgreich dupliziert', 'success');
            } else {
                throw new Error('Failed to duplicate profile');
            }
        } catch (error) {
            console.error('Error duplicating profile:', error);
            this.showToast('Fehler beim Duplizieren des Profils', 'error');
        }
    }

    // ========================================
    // BULK ACTIONS
    // ========================================

    async handleBulkAction(action) {
        const selectedIds = Array.from(this.selectedProfiles);
        if (selectedIds.length === 0) return;

        try {
            const response = await fetch('/api/profiles/bulk', {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    profileIds: selectedIds
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                switch (action) {
                    case 'delete':
                        this.profiles = this.profiles.filter(p => !selectedIds.includes(p._id));
                        this.selectedProfiles.clear();
                        break;
                    case 'archive':
                        selectedIds.forEach(id => {
                            const profile = this.profiles.find(p => p._id === id);
                            if (profile) profile.status = 'archived';
                        });
                        break;
                    case 'activate':
                        selectedIds.forEach(id => {
                            const profile = this.profiles.find(p => p._id === id);
                            if (profile) profile.status = 'active';
                        });
                        break;
                }

                this.filterAndRenderProfiles();
                this.showToast(data.message || 'Bulk-Aktion erfolgreich ausgeführt', 'success');
            } else {
                throw new Error('Bulk action failed');
            }
        } catch (error) {
            console.error('Error performing bulk action:', error);
            this.showToast('Fehler bei der Bulk-Aktion', 'error');
        }
    }

    toggleSelectAllProfiles() {
        const visibleProfiles = this.filteredProfiles;
        const allSelected = visibleProfiles.every(p => this.selectedProfiles.has(p._id));

        if (allSelected) {
            // Deselect all
            visibleProfiles.forEach(p => this.selectedProfiles.delete(p._id));
        } else {
            // Select all
            visibleProfiles.forEach(p => this.selectedProfiles.add(p._id));
        }

        this.renderProfilesList();
        this.updateProfilesHeader();
    }

    // ========================================
    // CALENDAR SECTION
    // ========================================

    initializeCalendarSection() {
        // Calendar section initialization
    }

    async loadCalendarContent() {
        try {
            // Load calendar data
            const container = document.getElementById('calendarContainer');
            if (container) {
                container.innerHTML = `
                    <div class="coming-soon">
                        <div class="coming-soon-icon">📅</div>
                        <h3>Kalender-Integration</h3>
                        <p>Die Kalender-Funktion wird bald verfügbar sein.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading calendar content:', error);
        }
    }

    // ========================================
    // EMAIL SECTION
    // ========================================

    initializeEmailSection() {
        // Email section initialization
    }

    async loadEmailContent() {
        try {
            // Load email data
            const container = document.getElementById('emailContainer');
            if (container) {
                container.innerHTML = `
                    <div class="coming-soon">
                        <div class="coming-soon-icon">📧</div>
                        <h3>E-Mail-Integration</h3>
                        <p>Die E-Mail-Funktion wird bald verfügbar sein.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading email content:', error);
        }
    }

    // ========================================
    // USER MANAGEMENT
    // ========================================

    async loadUserData() {
        // Load user-specific data
        await this.loadProfiles();
    }

    handleLogout() {
        // Clear local storage
        localStorage.removeItem('allKiLoggedIn');
        localStorage.removeItem('allKiUserEmail');
        localStorage.removeItem('allKiUserName');
        localStorage.removeItem('allKiAuthToken');
        localStorage.removeItem('allKiRememberMe');
        localStorage.removeItem('allKiNewsletter');

        this.showToast('Erfolgreich abgemeldet!', 'success');

        // Redirect to login
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    handleAuthenticationError() {
        this.showToast('Sitzung abgelaufen. Bitte melden Sie sich erneut an.', 'error');
        
        setTimeout(() => {
            this.handleLogout();
        }, 2000);
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    updateProfilesHeader() {
        const selectedCount = this.selectedProfiles.size;
        const totalCount = this.filteredProfiles.length;
        
        const counterElement = document.getElementById('profilesCounter');
        if (counterElement) {
            if (selectedCount > 0) {
                counterElement.textContent = `${selectedCount} von ${totalCount} ausgewählt`;
            } else {
                counterElement.textContent = `${totalCount} Profile${totalCount !== 1 ? '' : ''}`;
            }
        }

        // Show/hide bulk actions
        const bulkActions = document.getElementById('bulkActionsContainer');
        if (bulkActions) {
            bulkActions.style.display = selectedCount > 0 ? 'flex' : 'none';
        }
    }

    updateProfileCardSelection(profileId, selected) {
        const card = document.querySelector(`[data-profile-id="${profileId}"]`);
        if (card) {
            card.classList.toggle('selected', selected);
        }
    }

    renderEmptyProfilesState() {
        const hasSearch = this.searchQuery || this.currentFilter !== 'all';
        
        if (hasSearch) {
            return `
                <div class="profiles-empty">
                    <div class="empty-icon">🔍</div>
                    <h3>Keine Profile gefunden</h3>
                    <p>Ihre Suche ergab keine Treffer. Versuchen Sie andere Suchbegriffe oder Filter.</p>
                    <button class="btn btn-secondary" onclick="dashboardManager.clearFilters()">
                        Filter zurücksetzen
                    </button>
                </div>
            `;
        }

        return `
            <div class="profiles-empty">
                <div class="empty-icon">👤</div>
                <h3>Noch keine Profile erstellt</h3>
                <p>Erstellen Sie Ihr erstes AI-Profil, um personalisierte Unterhaltungen zu führen.</p>
                <button class="btn btn-primary create-first-btn" onclick="dashboardManager.showCreateProfileModal()">
                    Erstes Profil erstellen
                </button>
            </div>
        `;
    }

    clearFilters() {
        document.getElementById('profileSearch').value = '';
        document.getElementById('profileFilter').value = 'all';
        this.searchQuery = '';
        this.currentFilter = 'all';
        this.filterAndRenderProfiles();
    }

    calculateWeeklyUsage() {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        return this.profiles.filter(profile => 
            profile.lastUsed && new Date(profile.lastUsed) > oneWeekAgo
        ).length;
    }

    async updateProfileLastUsed(profileId) {
        try {
            await fetch(`/api/profiles/${profileId}/used`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });
            
            // Update local data
            const profile = this.profiles.find(p => p._id === profileId);
            if (profile) {
                profile.lastUsed = new Date().toISOString();
            }
        } catch (error) {
            console.error('Error updating profile last used:', error);
        }
    }

    saveCurrentState() {
        const state = {
            currentSection: this.currentSection,
            searchQuery: this.searchQuery,
            currentSort: this.currentSort,
            currentFilter: this.currentFilter
        };
        
        localStorage.setItem('allKiDashboardState', JSON.stringify(state));
    }

    loadPreviousState() {
        try {
            const savedState = localStorage.getItem('allKiDashboardState');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.searchQuery = state.searchQuery || '';
                this.currentSort = state.currentSort || 'lastUsed';
                this.currentFilter = state.currentFilter || 'all';
                
                // Apply saved state to UI elements
                const searchInput = document.getElementById('profileSearch');
                if (searchInput) searchInput.value = this.searchQuery;
                
                const sortSelect = document.getElementById('profileSort');
                if (sortSelect) sortSelect.value = this.currentSort;
                
                const filterSelect = document.getElementById('profileFilter');
                if (filterSelect) filterSelect.value = this.currentFilter;
            }
        } catch (error) {
            console.error('Error loading previous state:', error);
        }
    }

    getAuthHeaders() {
        const token = localStorage.getItem('allKiAuthToken');
        const email = localStorage.getItem('allKiUserEmail');
        
        return {
            'Authorization': `Bearer ${token}`,
            'X-User-Email': email
        };
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        container.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
    }

    // Placeholder methods for modal functionality
    showCreateProfileModal() {
        // TODO: Implement create profile modal
        this.showToast('Create Profile Modal - Coming Soon', 'info');
    }

    showEditProfileModal(profile) {
        // TODO: Implement edit profile modal
        this.showToast('Edit Profile Modal - Coming Soon', 'info');
    }

    openProfileChatModal(profile) {
        // TODO: Implement profile chat modal
        this.showToast(`Chat with ${profile.name} - Coming Soon`, 'info');
    }

    showProfileContextMenu(x, y, profileId) {
        // TODO: Implement profile context menu
        console.log('Profile context menu for:', profileId);
    }

    viewProfile(profileId) {
        // TODO: Implement profile detail view
        console.log('View profile:', profileId);
    }

    renderRecentProfilesList(profiles) {
        // TODO: Implement recent profiles rendering
        return '<p>Recent profiles coming soon...</p>';
    }

    renderQuickStats(stats) {
        // TODO: Implement quick stats rendering
        return '<p>Quick stats coming soon...</p>';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});