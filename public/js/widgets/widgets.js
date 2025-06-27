/**
 * 🧩 WIDGETS MAIN INITIALIZATION
 * Hauptdatei für Widget-System Initialisierung
 * 
 * SEPARATION OF CONCERNS:
 * - Page Initialization
 * - Auth Check
 * - Widget Manager Setup
 * - Global Event Handlers
 * - Page State Management
 */

class WidgetsApp {
    constructor() {
        this.isInitialized = false;
        this.authChecked = false;
        this.currentUser = null;
        
        this.initializeApp();
    }

    // ========================================
    // APP INITIALIZATION
    // ========================================

    async initializeApp() {
        try {
            console.log('🧩 Initializing Widgets App...');
            
            // Check authentication first
            await this.checkAuthentication();
            
            // Initialize page elements
            this.initializePageElements();
            
            // Initialize global event listeners
            this.initializeGlobalEvents();
            
            // Initialize widgets manager (already done via script tag)
            this.initializeWidgetsManager();
            
            // Load user preferences
            await this.loadUserPreferences();
            
            // Set up auto-save
            this.setupAutoSave();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ Widgets App initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Widgets App:', error);
            this.handleInitializationError(error);
        }
    }

    async checkAuthentication() {
        const token = localStorage.getItem('allKiAuthToken');
        const email = localStorage.getItem('allKiUserEmail');
        
        if (!token || !email) {
            this.redirectToLogin();
            return;
        }

        try {
            // Verify token with server (optional - continue with stored data if fails)
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-User-Email': email
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData.user;
            } else {
                // Use stored data as fallback
                this.currentUser = {
                    email: email,
                    name: localStorage.getItem('allKiUserName') || 'Benutzer'
                };
            }
            
            this.authChecked = true;
            
        } catch (error) {
            console.log('Auth verification failed, using stored data');
            this.currentUser = {
                email: email,
                name: localStorage.getItem('allKiUserName') || 'Benutzer'
            };
            this.authChecked = true;
        }
    }

    initializePageElements() {
        // Update user info in header if available
        if (this.currentUser) {
            this.updateUserInfo();
        }
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Initialize keyboard shortcuts
        this.initializeKeyboardShortcuts();
        
        // Set up theme
        this.initializeTheme();
    }

    initializeGlobalEvents() {
        // Window events
        window.addEventListener('beforeunload', () => {
            this.saveAppState();
        });

        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });

        // Logout handling
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Navigation to dashboard
        document.querySelector('a[href="dashboard.html"]')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToDashboard();
        });

        // Global error handling
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleGlobalError(e.error);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleGlobalError(e.reason);
        });
    }

    initializeWidgetsManager() {
        // WidgetsManager is initialized via script tag
        // Just verify it's available
        if (typeof window.widgetsManager === 'undefined') {
            console.error('WidgetsManager not available');
            this.showErrorMessage('Widget-System konnte nicht geladen werden');
            return;
        }

        // Set up communication between app and widgets manager
        this.setupWidgetsManagerIntegration();
    }

    setupWidgetsManagerIntegration() {
        // Listen for widget events
        document.addEventListener('widgetCreated', (e) => {
            this.handleWidgetCreated(e.detail);
        });

        document.addEventListener('widgetDeleted', (e) => {
            this.handleWidgetDeleted(e.detail);
        });

        document.addEventListener('widgetError', (e) => {
            this.handleWidgetError(e.detail);
        });
    }

    // ========================================
    // USER PREFERENCES & SETTINGS
    // ========================================

    async loadUserPreferences() {
        try {
            // Load from localStorage first
            const localPrefs = this.loadLocalPreferences();
            
            // Try to load from server
            const serverPrefs = await this.loadServerPreferences();
            
            // Merge preferences (server takes precedence)
            this.userPreferences = { ...localPrefs, ...serverPrefs };
            
            // Apply preferences
            this.applyUserPreferences();
            
        } catch (error) {
            console.error('Error loading user preferences:', error);
            // Use defaults
            this.userPreferences = this.getDefaultPreferences();
            this.applyUserPreferences();
        }
    }

    loadLocalPreferences() {
        try {
            const saved = localStorage.getItem('allKiWidgetsPreferences');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('Error loading local preferences:', error);
            return {};
        }
    }

    async loadServerPreferences() {
        try {
            const response = await fetch('/api/user/preferences', {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.preferences || {};
            }
            
            return {};
        } catch (error) {
            console.error('Error loading server preferences:', error);
            return {};
        }
    }

    getDefaultPreferences() {
        return {
            theme: 'dark',
            autoSave: true,
            notifications: true,
            autoRefresh: true,
            refreshInterval: 300000, // 5 minutes
            gridLayout: 'auto',
            compactMode: false,
            animationsEnabled: true
        };
    }

    applyUserPreferences() {
        const prefs = this.userPreferences;
        
        // Apply theme
        if (prefs.theme) {
            document.body.setAttribute('data-theme', prefs.theme);
        }
        
        // Apply compact mode
        if (prefs.compactMode) {
            document.body.classList.add('compact-mode');
        }
        
        // Apply animations setting
        if (!prefs.animationsEnabled) {
            document.body.classList.add('no-animations');
        }
        
        // Set up auto-refresh if enabled
        if (prefs.autoRefresh && prefs.refreshInterval) {
            this.setupAutoRefresh(prefs.refreshInterval);
        }
    }

    async saveUserPreferences() {
        try {
            // Save locally immediately
            localStorage.setItem('allKiWidgetsPreferences', JSON.stringify(this.userPreferences));
            
            // Save to server
            await fetch('/api/user/preferences', {
                method: 'PUT',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ preferences: this.userPreferences })
            });
            
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    }

    // ========================================
    // AUTO-SAVE & PERSISTENCE
    // ========================================

    setupAutoSave() {
        if (!this.userPreferences.autoSave) return;

        // Auto-save every 30 seconds
        setInterval(() => {
            this.saveAppState();
        }, 30000);
    }

    saveAppState() {
        try {
            const state = {
                timestamp: new Date().toISOString(),
                preferences: this.userPreferences,
                // Add other app state as needed
            };

            localStorage.setItem('allKiWidgetsAppState', JSON.stringify(state));
        } catch (error) {
            console.error('Error saving app state:', error);
        }
    }

    loadAppState() {
        try {
            const saved = localStorage.getItem('allKiWidgetsAppState');
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Error loading app state:', error);
            return null;
        }
    }

    // ========================================
    // AUTO-REFRESH SYSTEM
    // ========================================

    setupAutoRefresh(interval) {
        // Clear existing interval
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }

        // Set up new interval
        this.autoRefreshInterval = setInterval(() => {
            if (window.widgetsManager && typeof window.widgetsManager.refreshAllWidgets === 'function') {
                window.widgetsManager.refreshAllWidgets();
            }
        }, interval);
    }

    // ========================================
    // EVENT HANDLERS
    // ========================================

    handleWidgetCreated(widgetData) {
        console.log('Widget created:', widgetData);
        
        // Update preferences if needed
        this.saveUserPreferences();
        
        // Show success message
        this.showToast('Widget erfolgreich hinzugefügt', 'success');
    }

    handleWidgetDeleted(widgetData) {
        console.log('Widget deleted:', widgetData);
        
        // Update preferences if needed
        this.saveUserPreferences();
    }

    handleWidgetError(errorData) {
        console.error('Widget error:', errorData);
        
        // Show error message
        this.showToast(`Widget-Fehler: ${errorData.message}`, 'error');
    }

    handleWindowResize() {
        // Debounce resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Trigger widget layout recalculation if needed
            if (window.widgetsManager && typeof window.widgetsManager.handleResize === 'function') {
                window.widgetsManager.handleResize();
            }
        }, 250);
    }

    handleLogout() {
        // Clear all local data
        this.clearLocalData();
        
        // Show logout message
        this.showToast('Erfolgreich abgemeldet!', 'success');

        // Redirect to login after short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    navigateToDashboard() {
        // Save current state before navigating
        this.saveAppState();
        
        // Navigate to dashboard
        window.location.href = 'dashboard.html';
    }

    handleGlobalError(error) {
        // Don't show UI errors for network issues in development
        if (error && error.message && error.message.includes('Loading CSS chunk')) {
            return;
        }

        // Show user-friendly error message
        this.showToast('Ein unerwarteter Fehler ist aufgetreten', 'error');
    }

    handleInitializationError(error) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'initialization-error';
        errorContainer.innerHTML = `
            <div class="error-content">
                <div class="error-icon">⚠️</div>
                <h3>Initialisierung fehlgeschlagen</h3>
                <p>Die Widgets-Seite konnte nicht geladen werden.</p>
                <div class="error-actions">
                    <button onclick="location.reload()" class="btn btn-primary">
                        Neu laden
                    </button>
                    <button onclick="location.href='dashboard.html'" class="btn btn-secondary">
                        Zum Dashboard
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(errorContainer);
    }

    // ========================================
    // UI HELPERS
    // ========================================

    updateUserInfo() {
        // Update any user info displays
        const userNameElements = document.querySelectorAll('.user-name');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser.name;
        });

        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = this.currentUser.email;
        });
    }

    initializeTooltips() {
        // Simple tooltip implementation
        const tooltipElements = document.querySelectorAll('[title]');
        tooltipElements.forEach(el => {
            el.addEventListener('mouseenter', this.showTooltip.bind(this));
            el.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    showTooltip(e) {
        const title = e.target.getAttribute('title');
        if (!title) return;

        // Remove title to prevent browser tooltip
        e.target.setAttribute('data-original-title', title);
        e.target.removeAttribute('title');

        // Create custom tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = title;
        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = e.target.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
    }

    hideTooltip(e) {
        // Restore original title
        const originalTitle = e.target.getAttribute('data-original-title');
        if (originalTitle) {
            e.target.setAttribute('title', originalTitle);
            e.target.removeAttribute('data-original-title');
        }

        // Remove custom tooltip
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Skip if user is typing
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        if (window.widgetsManager) {
                            window.widgetsManager.showWidgetSelectionModal();
                        }
                        break;
                    case 'r':
                        e.preventDefault();
                        if (window.widgetsManager) {
                            window.widgetsManager.refreshAllWidgets();
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveAppState();
                        this.showToast('Status gespeichert', 'success');
                        break;
                }
            }
        });
    }

    initializeTheme() {
        // Apply saved theme or default
        const theme = this.userPreferences.theme || 'dark';
        document.body.setAttribute('data-theme', theme);
        
        // Add theme toggle functionality if button exists
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }

    toggleTheme() {
        const currentTheme = document.body.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.body.setAttribute('data-theme', newTheme);
        this.userPreferences.theme = newTheme;
        this.saveUserPreferences();
        
        this.showToast(`${newTheme === 'dark' ? 'Dunkles' : 'Helles'} Theme aktiviert`, 'info');
    }

    showToast(message, type = 'info') {
        // Use widgets manager toast if available
        if (window.widgetsManager && typeof window.widgetsManager.showToast === 'function') {
            window.widgetsManager.showToast(message, type);
            return;
        }

        // Fallback toast implementation
        this.showFallbackToast(message, type);
    }

    showFallbackToast(message, type) {
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

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    showErrorMessage(message) {
        const main = document.querySelector('.main-content');
        if (main) {
            main.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Fehler</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn btn-primary">
                        Neu laden
                    </button>
                </div>
            `;
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

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

    clearLocalData() {
        // Clear authentication data
        localStorage.removeItem('allKiLoggedIn');
        localStorage.removeItem('allKiUserEmail');
        localStorage.removeItem('allKiUserName');
        localStorage.removeItem('allKiAuthToken');
        localStorage.removeItem('allKiRememberMe');
        localStorage.removeItem('allKiNewsletter');
        
        // Clear app-specific data
        localStorage.removeItem('allKiWidgetsPreferences');
        localStorage.removeItem('allKiWidgetsAppState');
        localStorage.removeItem('allKiChatHistory');
    }

    redirectToLogin() {
        this.showToast('Sitzung abgelaufen. Weiterleitung zur Anmeldung...', 'warning');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    // Public API methods
    isReady() {
        return this.isInitialized && this.authChecked;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getPreferences() {
        return { ...this.userPreferences };
    }

    updatePreference(key, value) {
        this.userPreferences[key] = value;
        this.saveUserPreferences();
        this.applyUserPreferences();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.widgetsApp = new WidgetsApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WidgetsApp;
}