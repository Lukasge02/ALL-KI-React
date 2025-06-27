/**
 * 🔧 BASE WIDGET CLASS
 * Grundlage für alle Widget-Implementierungen
 * 
 * SEPARATION OF CONCERNS:
 * - Widget Lifecycle Management
 * - Common Widget Functionality
 * - Event Handling & Communication
 * - Data Management & Persistence
 * - Error Handling & Recovery
 */

class BaseWidget {
    constructor(widgetId, config = {}) {
        this.widgetId = widgetId;
        this.config = { ...this.getDefaultConfig(), ...config };
        this.container = null;
        this.isInitialized = false;
        this.isLoading = false;
        this.hasError = false;
        this.data = {};
        this.intervals = new Map();
        this.timeouts = new Map();
        this.eventListeners = new Map();
        
        this.initialize();
    }

    // ========================================
    // WIDGET LIFECYCLE
    // ========================================

    async initialize() {
        try {
            console.log(`Initializing widget: ${this.getWidgetType()}-${this.widgetId}`);
            
            // Find container element
            this.container = document.getElementById(`widget-content-${this.widgetId}`);
            if (!this.container) {
                throw new Error(`Widget container not found: widget-content-${this.widgetId}`);
            }

            // Set up error boundary
            this.setupErrorBoundary();
            
            // Initialize widget-specific functionality
            await this.onInitialize();
            
            // Render initial content
            await this.render();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start auto-refresh if enabled
            this.setupAutoRefresh();
            
            // Load initial data
            await this.loadData();
            
            this.isInitialized = true;
            this.emitEvent('initialized', { widgetId: this.widgetId });
            
            console.log(`✅ Widget initialized: ${this.getWidgetType()}-${this.widgetId}`);
            
        } catch (error) {
            console.error(`❌ Widget initialization failed: ${this.getWidgetType()}-${this.widgetId}`, error);
            this.handleError(error);
        }
    }

    async destroy() {
        try {
            console.log(`Destroying widget: ${this.getWidgetType()}-${this.widgetId}`);
            
            // Clean up intervals and timeouts
            this.cleanup();
            
            // Remove event listeners
            this.removeEventListeners();
            
            // Widget-specific cleanup
            await this.onDestroy();
            
            // Clear container
            if (this.container) {
                this.container.innerHTML = '';
            }
            
            this.emitEvent('destroyed', { widgetId: this.widgetId });
            
        } catch (error) {
            console.error(`Error destroying widget: ${this.getWidgetType()}-${this.widgetId}`, error);
        }
    }

    async refresh() {
        if (this.isLoading) {
            console.log(`Widget already loading: ${this.getWidgetType()}-${this.widgetId}`);
            return;
        }

        try {
            console.log(`Refreshing widget: ${this.getWidgetType()}-${this.widgetId}`);
            
            this.setLoading(true);
            
            // Widget-specific refresh logic
            await this.onRefresh();
            
            // Reload data
            await this.loadData();
            
            // Re-render if needed
            await this.render();
            
            this.emitEvent('refreshed', { widgetId: this.widgetId });
            
        } catch (error) {
            console.error(`Error refreshing widget: ${this.getWidgetType()}-${this.widgetId}`, error);
            this.handleError(error);
        } finally {
            this.setLoading(false);
        }
    }

    // ========================================
    // ABSTRACT METHODS (TO BE IMPLEMENTED)
    // ========================================

    getWidgetType() {
        throw new Error('getWidgetType() must be implemented by subclass');
    }

    getDefaultConfig() {
        return {
            autoRefresh: true,
            refreshInterval: 300000, // 5 minutes
            retryAttempts: 3,
            retryDelay: 2000,
            animationsEnabled: true,
            persistData: true
        };
    }

    async onInitialize() {
        // Override in subclass for widget-specific initialization
    }

    async onDestroy() {
        // Override in subclass for widget-specific cleanup
    }

    async onRefresh() {
        // Override in subclass for widget-specific refresh logic
    }

    async loadData() {
        // Override in subclass to load widget data
    }

    async render() {
        // Override in subclass to render widget content
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="widget-placeholder">
                <div class="placeholder-icon">${this.getWidgetIcon()}</div>
                <p>Base Widget - Override render() method</p>
            </div>
        `;
    }

    getWidgetIcon() {
        return '🧩';
    }

    // ========================================
    // CONFIGURATION MANAGEMENT
    // ========================================

    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Handle config changes
        this.onConfigChanged(oldConfig, this.config);
        
        // Save config if persistence is enabled
        if (this.config.persistData) {
            this.saveConfig();
        }
        
        this.emitEvent('configChanged', { 
            widgetId: this.widgetId, 
            oldConfig, 
            newConfig: this.config 
        });
    }

    onConfigChanged(oldConfig, newConfig) {
        // Override in subclass to handle config changes
        
        // Handle auto-refresh changes
        if (oldConfig.autoRefresh !== newConfig.autoRefresh || 
            oldConfig.refreshInterval !== newConfig.refreshInterval) {
            this.setupAutoRefresh();
        }
    }

    saveConfig() {
        try {
            const key = `widget_config_${this.widgetId}`;
            localStorage.setItem(key, JSON.stringify(this.config));
        } catch (error) {
            console.error('Error saving widget config:', error);
        }
    }

    loadConfig() {
        try {
            const key = `widget_config_${this.widgetId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading widget config:', error);
        }
        return {};
    }

    // ========================================
    // DATA MANAGEMENT
    // ========================================

    updateData(newData) {
        const oldData = { ...this.data };
        this.data = { ...this.data, ...newData };
        
        // Handle data changes
        this.onDataChanged(oldData, this.data);
        
        // Save data if persistence is enabled
        if (this.config.persistData) {
            this.saveData();
        }
        
        this.emitEvent('dataChanged', { 
            widgetId: this.widgetId, 
            oldData, 
            newData: this.data 
        });
    }

    onDataChanged(oldData, newData) {
        // Override in subclass to handle data changes
        // Re-render by default
        this.render();
    }

    saveData() {
        try {
            const key = `widget_data_${this.widgetId}`;
            localStorage.setItem(key, JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving widget data:', error);
        }
    }

    loadSavedData() {
        try {
            const key = `widget_data_${this.widgetId}`;
            const saved = localStorage.getItem(key);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading widget data:', error);
        }
        return {};
    }

    clearSavedData() {
        try {
            const configKey = `widget_config_${this.widgetId}`;
            const dataKey = `widget_data_${this.widgetId}`;
            localStorage.removeItem(configKey);
            localStorage.removeItem(dataKey);
        } catch (error) {
            console.error('Error clearing widget data:', error);
        }
    }

    // ========================================
    // UI STATE MANAGEMENT
    // ========================================

    setLoading(loading) {
        this.isLoading = loading;
        
        if (!this.container) return;
        
        if (loading) {
            this.container.classList.add('loading');
            this.showLoadingState();
        } else {
            this.container.classList.remove('loading');
            this.hideLoadingState();
        }
    }

    showLoadingState() {
        if (!this.container) return;
        
        const existingLoader = this.container.querySelector('.widget-loader');
        if (existingLoader) return;
        
        const loader = document.createElement('div');
        loader.className = 'widget-loader';
        loader.innerHTML = `
            <div class="loader-spinner"></div>
            <p class="loader-text">Laden...</p>
        `;
        
        this.container.appendChild(loader);
    }

    hideLoadingState() {
        if (!this.container) return;
        
        const loader = this.container.querySelector('.widget-loader');
        if (loader) {
            loader.remove();
        }
    }

    showError(error) {
        this.hasError = true;
        
        if (!this.container) return;
        
        const errorMessage = error?.message || 'Ein unbekannter Fehler ist aufgetreten';
        
        this.container.innerHTML = `
            <div class="widget-error">
                <div class="error-icon">⚠️</div>
                <h4>Widget-Fehler</h4>
                <p class="error-message">${errorMessage}</p>
                <div class="error-actions">
                    <button class="btn btn-sm btn-secondary retry-btn">
                        🔄 Erneut versuchen
                    </button>
                    <button class="btn btn-sm btn-outline reset-btn">
                        🔧 Zurücksetzen
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners for error actions
        this.container.querySelector('.retry-btn')?.addEventListener('click', () => {
            this.retry();
        });
        
        this.container.querySelector('.reset-btn')?.addEventListener('click', () => {
            this.reset();
        });
    }

    clearError() {
        this.hasError = false;
        
        if (this.container) {
            this.container.classList.remove('error');
        }
    }

    // ========================================
    // ERROR HANDLING
    // ========================================

    setupErrorBoundary() {
        // Catch errors within the widget container
        if (this.container) {
            this.container.addEventListener('error', (e) => {
                this.handleError(new Error(`Widget runtime error: ${e.message}`));
            }, true);
        }
    }

    handleError(error) {
        console.error(`Widget error [${this.getWidgetType()}-${this.widgetId}]:`, error);
        
        this.setLoading(false);
        this.showError(error);
        
        this.emitEvent('error', { 
            widgetId: this.widgetId, 
            error: error.message,
            widgetType: this.getWidgetType()
        });
        
        // Auto-retry if configured
        if (this.config.retryAttempts > 0) {
            this.scheduleRetry();
        }
    }

    scheduleRetry() {
        if (this.retryCount >= this.config.retryAttempts) {
            console.log(`Max retry attempts reached for widget: ${this.widgetId}`);
            return;
        }
        
        this.retryCount = (this.retryCount || 0) + 1;
        
        const delay = this.config.retryDelay * this.retryCount; // Exponential backoff
        
        console.log(`Scheduling retry ${this.retryCount}/${this.config.retryAttempts} in ${delay}ms`);
        
        this.setTimeout('retry', () => {
            this.retry();
        }, delay);
    }

    async retry() {
        console.log(`Retrying widget: ${this.getWidgetType()}-${this.widgetId}`);
        
        this.clearError();
        this.clearTimeout('retry');
        
        try {
            await this.refresh();
            this.retryCount = 0; // Reset on success
        } catch (error) {
            this.handleError(error);
        }
    }

    async reset() {
        console.log(`Resetting widget: ${this.getWidgetType()}-${this.widgetId}`);
        
        try {
            // Clear saved data
            this.clearSavedData();
            
            // Reset to default config
            this.config = this.getDefaultConfig();
            
            // Clear error state
            this.clearError();
            this.retryCount = 0;
            
            // Re-initialize
            await this.initialize();
            
        } catch (error) {
            this.handleError(error);
        }
    }

    // ========================================
    // EVENT SYSTEM
    // ========================================

    setupEventListeners() {
        // Override in subclass to add widget-specific event listeners
    }

    removeEventListeners() {
        this.eventListeners.forEach((listener, element) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener(listener.event, listener.handler);
            }
        });
        this.eventListeners.clear();
    }

    addEventListener(element, event, handler) {
        if (element && typeof element.addEventListener === 'function') {
            element.addEventListener(event, handler);
            this.eventListeners.set(element, { event, handler });
        }
    }

    emitEvent(eventType, data) {
        const event = new CustomEvent(`widget_${eventType}`, {
            detail: { ...data, widgetType: this.getWidgetType() }
        });
        
        document.dispatchEvent(event);
    }

    // ========================================
    // AUTO-REFRESH SYSTEM
    // ========================================

    setupAutoRefresh() {
        // Clear existing interval
        this.clearInterval('autoRefresh');
        
        if (!this.config.autoRefresh || !this.config.refreshInterval) {
            return;
        }
        
        console.log(`Setting up auto-refresh for widget ${this.widgetId} (${this.config.refreshInterval}ms)`);
        
        this.setInterval('autoRefresh', () => {
            if (!this.isLoading && !this.hasError) {
                this.refresh();
            }
        }, this.config.refreshInterval);
    }

    // ========================================
    // TIMER MANAGEMENT
    // ========================================

    setTimeout(key, callback, delay) {
        this.clearTimeout(key);
        
        const timeoutId = setTimeout(() => {
            callback();
            this.timeouts.delete(key);
        }, delay);
        
        this.timeouts.set(key, timeoutId);
        return timeoutId;
    }

    clearTimeout(key) {
        const timeoutId = this.timeouts.get(key);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeouts.delete(key);
        }
    }

    setInterval(key, callback, interval) {
        this.clearInterval(key);
        
        const intervalId = setInterval(callback, interval);
        this.intervals.set(key, intervalId);
        return intervalId;
    }

    clearInterval(key) {
        const intervalId = this.intervals.get(key);
        if (intervalId) {
            clearInterval(intervalId);
            this.intervals.delete(key);
        }
    }

    cleanup() {
        // Clear all timers
        this.intervals.forEach((intervalId) => {
            clearInterval(intervalId);
        });
        this.intervals.clear();
        
        this.timeouts.forEach((timeoutId) => {
            clearTimeout(timeoutId);
        });
        this.timeouts.clear();
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    createElement(tag, className = '', innerHTML = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }

    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        return new Date(date).toLocaleString('de-DE', { ...defaultOptions, ...options });
    }

    formatNumber(number, options = {}) {
        return new Number(number).toLocaleString('de-DE', options);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
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

    // ========================================
    // API HELPERS
    // ========================================

    async apiRequest(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders()
            }
        };

        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(endpoint, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`API request failed [${endpoint}]:`, error);
            throw error;
        }
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
    // PUBLIC API
    // ========================================

    getInfo() {
        return {
            widgetId: this.widgetId,
            widgetType: this.getWidgetType(),
            isInitialized: this.isInitialized,
            isLoading: this.isLoading,
            hasError: this.hasError,
            config: { ...this.config },
            data: { ...this.data }
        };
    }

    getContainer() {
        return this.container;
    }

    getConfig(key = null) {
        return key ? this.config[key] : { ...this.config };
    }

    getData(key = null) {
        return key ? this.data[key] : { ...this.data };
    }

    isReady() {
        return this.isInitialized && !this.isLoading && !this.hasError;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BaseWidget = BaseWidget;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BaseWidget;
}