/**
 * ⚡ ALL-KI DASHBOARD - MODERN VERSION 2.0
 * Performance-optimized JavaScript with modern features
 * 
 * EINFÜGEN IN: public/js/dashboard.js
 * 
 * FEATURES:
 * ✅ Modern ES6+ Syntax
 * ✅ Performance Optimized
 * ✅ Error Handling
 * ✅ Accessibility Ready
 * ✅ Mobile-First
 * ✅ Progressive Web App Ready
 */

class ModernDashboard {
    constructor() {
        this.state = {
            currentUser: null,
            profiles: [],
            filteredProfiles: [],
            selectedProfiles: new Set(),
            currentSection: 'home',
            theme: localStorage.getItem('theme') || 'dark',
            sidebarMini: localStorage.getItem('sidebarMini') === 'true',
            loading: false,
            online: navigator.onLine
        };
        
        this.cache = new Map();
        this.debounceTimers = new Map();
        this.observers = new Map();
        
        this.init();
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    
    async init() {
        try {
            this.showLoading();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize theme
            this.initializeTheme();
            
            // Initialize sidebar
            this.initializeSidebar();
            
            // Load user data
            await this.loadUserData();
            
            // Initialize sections
            this.initializeSections();
            
            // Setup PWA features
            this.initializePWA();
            
            // Setup performance monitoring
            this.initializePerformanceMonitoring();
            
            this.hideLoading();
            this.showSuccessToast('Dashboard erfolgreich geladen! 🚀');
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.hideLoading();
            this.showErrorToast('Fehler beim Laden des Dashboards');
        }
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    
    setupEventListeners() {
        // Window events
        window.addEventListener('resize', this.debounce(() => this.handleResize(), 250));
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        window.addEventListener('beforeunload', () => this.saveState());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Sidebar toggle
        const sidebarToggle = document.querySelector('.sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });
        
        // Search
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => this.handleSearch(e), 300));
        }
        
        // User menu
        const userAvatar = document.querySelector('.user-avatar');
        if (userAvatar) {
            userAvatar.addEventListener('click', () => this.toggleUserMenu());
        }
        
        // Click outside to close menus
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    // ========================================
    // THEME MANAGEMENT
    // ========================================
    
    initializeTheme() {
        document.documentElement.setAttribute('data-theme', this.state.theme);
        this.updateThemeIcon();
    }
    
    toggleTheme() {
        this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', this.state.theme);
        localStorage.setItem('theme', this.state.theme);
        this.updateThemeIcon();
        
        // Animate theme change
        document.body.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 300);
        
        this.showToast(`${this.state.theme === 'dark' ? 'Dark' : 'Light'} Theme aktiviert`, 'info');
    }
    
    updateThemeIcon() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.style.transform = 'scale(0.8)';
            setTimeout(() => {
                toggle.style.transform = 'scale(1)';
            }, 150);
        }
    }

    // ========================================
    // SIDEBAR MANAGEMENT
    // ========================================
    
    initializeSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('mini', this.state.sidebarMini);
            this.updateMainContentMargin();
        }
    }
    
    toggleSidebar() {
        this.state.sidebarMini = !this.state.sidebarMini;
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebar) {
            sidebar.classList.toggle('mini', this.state.sidebarMini);
            this.updateMainContentMargin();
            
            // Animate toggle button
            const toggle = document.querySelector('.sidebar-toggle');
            if (toggle) {
                toggle.style.transform = 'translateY(-50%) scale(0.8)';
                setTimeout(() => {
                    toggle.style.transform = 'translateY(-50%) scale(1)';
                }, 150);
            }
        }
        
        localStorage.setItem('sidebarMini', this.state.sidebarMini.toString());
    }
    
    updateMainContentMargin() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent && window.innerWidth > 1024) {
            const margin = this.state.sidebarMini ? '80px' : '320px';
            mainContent.style.marginLeft = margin;
        }
    }

    // ========================================
    // NAVIGATION
    // ========================================
    
    handleNavigation(e) {
        e.preventDefault();
        const target = e.currentTarget;
        const section = target.dataset.section;
        
        if (section && section !== this.state.currentSection) {
            this.navigateToSection(section);
        }
    }
    
    async navigateToSection(section) {
        try {
            this.state.currentSection = section;
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            
            const activeLink = document.querySelector(`[data-section="${section}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
            // Update page title
            this.updatePageTitle(section);
            
            // Load section content
            await this.loadSectionContent(section);
            
            // Update URL without page reload
            history.pushState({ section }, '', `#${section}`);
            
        } catch (error) {
            console.error('Navigation error:', error);
            this.showErrorToast('Fehler beim Laden des Bereichs');
        }
    }
    
    updatePageTitle(section) {
        const titles = {
            home: 'Dashboard',
            profiles: 'Profile',
            chat: 'Chat',
            widgets: 'Widgets',
            settings: 'Einstellungen'
        };
        
        const titleElement = document.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = titles[section] || 'Dashboard';
            titleElement.classList.add('fade-in');
            setTimeout(() => titleElement.classList.remove('fade-in'), 600);
        }
    }

    // ========================================
    // CONTENT LOADING
    // ========================================
    
    async loadSectionContent(section) {
        const contentArea = document.querySelector('.content-area');
        if (!contentArea) return;
        
        // Check cache first
        if (this.cache.has(section)) {
            contentArea.innerHTML = this.cache.get(section);
            this.initializeSectionEvents(section);
            return;
        }
        
        this.showSectionLoading(contentArea);
        
        try {
            let content = '';
            
            switch (section) {
                case 'home':
                    content = await this.loadHomeContent();
                    break;
                case 'profiles':
                    content = await this.loadProfilesContent();
                    break;
                case 'chat':
                    content = await this.loadChatContent();
                    break;
                case 'widgets':
                    content = await this.loadWidgetsContent();
                    break;
                case 'settings':
                    content = await this.loadSettingsContent();
                    break;
                default:
                    content = this.getNotFoundContent();
            }
            
            // Cache content
            this.cache.set(section, content);
            
            // Animate content change
            contentArea.style.opacity = '0';
            setTimeout(() => {
                contentArea.innerHTML = content;
                contentArea.style.opacity = '1';
                this.initializeSectionEvents(section);
            }, 150);
            
        } catch (error) {
            console.error(`Error loading ${section} content:`, error);
            contentArea.innerHTML = this.getErrorContent(error.message);
        }
    }
    
    // ========================================
    // SECTION CONTENT GENERATORS
    // ========================================
    
    async loadHomeContent() {
        const stats = await this.getQuickStats();
        const recentProfiles = this.getRecentProfiles();
        
        return `
            <div class="home-content">
                <div class="welcome-section card fade-in">
                    <h2>Willkommen zurück! 👋</h2>
                    <p>Bereit für einen produktiven Tag mit deinem KI-Assistenten?</p>
                    <div class="quick-actions">
                        <button class="btn btn-primary" onclick="dashboard.createNewProfile()">
                            <span>➕</span> Neues Profil
                        </button>
                        <button class="btn btn-secondary" onclick="dashboard.navigateToSection('chat')">
                            <span>💬</span> Chat starten
                        </button>
                    </div>
                </div>
                
                <div class="stats-grid">
                    <div class="stat-card card slide-in-left">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <h3>${stats.totalProfiles}</h3>
                            <p>Profile</p>
                        </div>
                    </div>
                    <div class="stat-card card slide-in-left" style="animation-delay: 0.1s">
                        <div class="stat-icon">💬</div>
                        <div class="stat-content">
                            <h3>${stats.totalChats}</h3>
                            <p>Chats</p>
                        </div>
                    </div>
                    <div class="stat-card card slide-in-left" style="animation-delay: 0.2s">
                        <div class="stat-icon">⚡</div>
                        <div class="stat-content">
                            <h3>${stats.activeProfiles}</h3>
                            <p>Aktiv</p>
                        </div>
                    </div>
                    <div class="stat-card card slide-in-left" style="animation-delay: 0.3s">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <h3>${stats.weeklyUsage}%</h3>
                            <p>Diese Woche</p>
                        </div>
                    </div>
                </div>
                
                <div class="recent-section card bounce-in">
                    <h3>Zuletzt verwendet</h3>
                    <div class="recent-profiles">
                        ${this.renderRecentProfiles(recentProfiles)}
                    </div>
                </div>
            </div>
        `;
    }
    
    async loadProfilesContent() {
        await this.loadProfiles();
        
        return `
            <div class="profiles-content">
                <div class="profiles-header card">
                    <div class="profiles-header-left">
                        <h2>Meine Profile</h2>
                        <span class="profile-count">${this.state.profiles.length} Profile</span>
                    </div>
                    <div class="profiles-header-right">
                        <button class="btn btn-primary" onclick="dashboard.createNewProfile()">
                            <span>➕</span> Neues Profil
                        </button>
                    </div>
                </div>
                
                <div class="profiles-filters card">
                    <input type="text" 
                           class="filter-input" 
                           placeholder="Profile durchsuchen..." 
                           oninput="dashboard.filterProfiles(this.value)">
                    <div class="filter-tags">
                        <button class="filter-tag active" data-filter="all">Alle</button>
                        <button class="filter-tag" data-filter="fitness">Fitness</button>
                        <button class="filter-tag" data-filter="work">Arbeit</button>
                        <button class="filter-tag" data-filter="cooking">Kochen</button>
                        <button class="filter-tag" data-filter="study">Lernen</button>
                    </div>
                </div>
                
                <div class="profiles-grid">
                    ${this.renderProfilesGrid()}
                </div>
            </div>
        `;
    }

    // ========================================
    // PERFORMANCE OPTIMIZATIONS
    // ========================================
    
    debounce(func, wait) {
        const key = func.toString();
        return (...args) => {
            clearTimeout(this.debounceTimers.get(key));
            this.debounceTimers.set(key, setTimeout(() => func.apply(this, args), wait));
        };
    }
    
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    lazy(selector, callback) {
        if (this.observers.has(selector)) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });
        
        document.querySelectorAll(selector).forEach(el => observer.observe(el));
        this.observers.set(selector, observer);
    }

    // ========================================
    // PWA FEATURES
    // ========================================
    
    initializePWA() {
        // Service Worker registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
        
        // Install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.showInstallPrompt(e);
        });
    }
    
    showInstallPrompt(e) {
        const installBanner = document.createElement('div');
        installBanner.className = 'install-banner card';
        installBanner.innerHTML = `
            <div class="install-content">
                <h4>📱 All-KI installieren</h4>
                <p>Installiere All-KI für eine bessere App-Erfahrung!</p>
                <div class="install-actions">
                    <button class="btn btn-primary" onclick="dashboard.installApp()">Installieren</button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">Später</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(installBanner);
        this.installPromptEvent = e;
    }
    
    async installApp() {
        if (this.installPromptEvent) {
            this.installPromptEvent.prompt();
            const result = await this.installPromptEvent.userChoice;
            
            if (result.outcome === 'accepted') {
                this.showSuccessToast('App erfolgreich installiert! 🎉');
            }
            
            this.installPromptEvent = null;
        }
    }

    // ========================================
    // TOAST NOTIFICATIONS
    // ========================================
    
    showToast(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">${this.getToastIcon(type)}</div>
                <div class="toast-message">${message}</div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        // Add to container
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        
        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
        
        // Auto remove
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
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
    
    showSuccessToast(message) {
        this.showToast(message, 'success');
    }
    
    showErrorToast(message) {
        this.showToast(message, 'error', 6000);
    }

    // ========================================
    // LOADING STATES
    // ========================================
    
    showLoading() {
        this.state.loading = true;
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'global-loader';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-text">All-KI wird geladen...</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
    
    hideLoading() {
        this.state.loading = false;
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
    }
    
    showSectionLoading(container) {
        container.innerHTML = `
            <div class="section-loader">
                <div class="loader-spinner"></div>
                <p>Inhalt wird geladen...</p>
            </div>
        `;
    }

    // ========================================
    // UTILITY METHODS
    // ========================================
    
    handleResize() {
        this.updateMainContentMargin();
    }
    
    handleOnlineStatus(online) {
        this.state.online = online;
        const message = online ? 'Verbindung wiederhergestellt' : 'Offline-Modus';
        const type = online ? 'success' : 'warning';
        this.showToast(message, type);
    }
    
    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k':
                    e.preventDefault();
                    document.querySelector('.search-input')?.focus();
                    break;
                case 'n':
                    e.preventDefault();
                    this.createNewProfile();
                    break;
                case '/':
                    e.preventDefault();
                    this.toggleSidebar();
                    break;
            }
        }
    }
    
    saveState() {
        localStorage.setItem('dashboardState', JSON.stringify({
            currentSection: this.state.currentSection,
            theme: this.state.theme,
            sidebarMini: this.state.sidebarMini
        }));
    }

    // ========================================
    // PLACEHOLDER METHODS
    // ========================================
    
    async loadUserData() {
        // TODO: Implement user data loading
        this.state.currentUser = { name: 'Benutzer', email: 'user@example.com' };
    }
    
    async loadProfiles() {
        // TODO: Implement profiles loading
        this.state.profiles = [
            { id: 1, name: 'Fitness Coach', category: 'fitness', lastUsed: new Date(), status: 'active' },
            { id: 2, name: 'Koch Assistant', category: 'cooking', lastUsed: new Date(), status: 'active' }
        ];
    }
    
    getQuickStats() {
        return {
            totalProfiles: this.state.profiles.length,
            activeProfiles: this.state.profiles.filter(p => p.status === 'active').length,
            totalChats: 42,
            weeklyUsage: 85
        };
    }
    
    getRecentProfiles() {
        return this.state.profiles.slice(0, 3);
    }
    
    renderRecentProfiles(profiles) {
        return profiles.map(profile => `
            <div class="recent-profile-item">
                <div class="profile-icon">${this.getProfileIcon(profile.category)}</div>
                <div class="profile-info">
                    <h4>${profile.name}</h4>
                    <p>Zuletzt verwendet: ${this.formatDate(profile.lastUsed)}</p>
                </div>
            </div>
        `).join('');
    }
    
    renderProfilesGrid() {
        return this.state.profiles.map(profile => `
            <div class="profile-card card">
                <div class="profile-card-header">
                    <div class="profile-icon">${this.getProfileIcon(profile.category)}</div>
                    <button class="profile-menu-btn">⋮</button>
                </div>
                <div class="profile-card-content">
                    <h3>${profile.name}</h3>
                    <p class="profile-category">${profile.category}</p>
                    <p class="profile-last-used">Zuletzt: ${this.formatDate(profile.lastUsed)}</p>
                </div>
                <div class="profile-card-actions">
                    <button class="btn btn-primary" onclick="dashboard.openProfileChat(${profile.id})">
                        Chat öffnen
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    getProfileIcon(category) {
        const icons = {
            fitness: '💪',
            cooking: '👨‍🍳',
            work: '💼',
            study: '📚'
        };
        return icons[category] || '🤖';
    }
    
    formatDate(date) {
        return new Intl.RelativeTimeFormat('de').format(
            Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24)), 'day'
        );
    }
    
    // Placeholder methods for future implementation
    createNewProfile() { this.showToast('Neues Profil - Coming Soon!', 'info'); }
    openProfileChat(id) { this.showToast(`Chat mit Profil ${id} - Coming Soon!`, 'info'); }
    filterProfiles(query) { console.log('Filter profiles:', query); }
    initializeSectionEvents(section) { console.log('Initialize section events:', section); }
    loadChatContent() { return '<p>Chat Content - Coming Soon!</p>'; }
    loadWidgetsContent() { return '<p>Widgets Content - Coming Soon!</p>'; }
    loadSettingsContent() { return '<p>Settings Content - Coming Soon!</p>'; }
    getNotFoundContent() { return '<p>Bereich nicht gefunden</p>'; }
    getErrorContent(message) { return `<p>Fehler: ${message}</p>`; }
    handleSearch(e) { console.log('Search:', e.target.value); }
    toggleUserMenu() { console.log('Toggle user menu'); }
    handleOutsideClick(e) { /* Handle outside clicks */ }
    initializePerformanceMonitoring() { /* Setup performance monitoring */ }
}

// ========================================
// CSS FOR COMPONENTS
// ========================================

const additionalCSS = `
<style>
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-backdrop);
    border: 1px solid var(--glass-border);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-lg);
    min-width: 300px;
    opacity: 0;
    transform: translateX(100%);
    transition: all var(--transition-normal);
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
}

.toast-icon {
    font-size: 20px;
}

.toast-message {
    flex: 1;
    color: var(--text-primary);
    font-weight: 500;
}

.toast-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 18px;
    padding: 4px;
    border-radius: 50%;
    transition: all var(--transition-fast);
}

.toast-close:hover {
    background: var(--glass-bg);
    color: var(--text-primary);
}

.global-loader {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
}

.loader-content {
    text-align: center;
    color: white;
}

.loader-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 20px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin: 20px 0;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 20px;
}

.stat-icon {
    font-size: 2rem;
}

.stat-content h3 {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
    color: var(--text-primary);
}

.stat-content p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.9rem;
}

.profiles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.profile-card {
    padding: 20px;
}

.profile-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}

.profile-icon {
    font-size: 2rem;
}

.profile-menu-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: all var(--transition-fast);
}

.profile-menu-btn:hover {
    background: var(--glass-bg);
    color: var(--text-primary);
}
</style>
`;

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add additional CSS
    document.head.insertAdjacentHTML('beforeend', additionalCSS);
    
    // Create global dashboard instance
    window.dashboard = new ModernDashboard();
    
    console.log('🚀 All-KI Dashboard 2.0 initialized!');
});