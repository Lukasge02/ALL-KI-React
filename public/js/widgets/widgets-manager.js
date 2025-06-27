/**
 * 🧩 WIDGETS MANAGER
 * Zentraler Manager für alle Widget-Operationen
 * 
 * SEPARATION OF CONCERNS:
 * - Widgets Container Management
 * - Widget Lifecycle (Create, Update, Delete)
 * - Drag & Drop Functionality
 * - Widget Configuration
 * - API Communication
 */

class WidgetsManager {
    constructor() {
        this.widgets = new Map();
        this.widgetTypes = new Map();
        this.draggedWidget = null;
        this.currentUser = null;
        
        this.initializeWidgetTypes();
        this.initializeEventListeners();
        this.loadUserWidgets();
    }

    // ========================================
    // INITIALIZATION
    // ========================================

    initializeWidgetTypes() {
        // Registriere alle verfügbaren Widget-Typen
        this.widgetTypes.set('pomodoro', {
            name: 'Pomodoro Timer',
            icon: '⏱️',
            category: 'Produktivität',
            description: 'Zeitmanagement mit der Pomodoro-Technik',
            defaultConfig: {
                workTime: 25,
                breakTime: 5,
                longBreakTime: 15,
                sessionsUntilLongBreak: 4,
                autoStartBreaks: false,
                notifications: true
            },
            configFields: [
                { key: 'workTime', label: 'Arbeitszeit (Minuten)', type: 'number', min: 1, max: 60 },
                { key: 'breakTime', label: 'Kurze Pause (Minuten)', type: 'number', min: 1, max: 30 },
                { key: 'longBreakTime', label: 'Lange Pause (Minuten)', type: 'number', min: 5, max: 60 },
                { key: 'sessionsUntilLongBreak', label: 'Sessions bis lange Pause', type: 'number', min: 2, max: 10 },
                { key: 'autoStartBreaks', label: 'Pausen automatisch starten', type: 'boolean' },
                { key: 'notifications', label: 'Benachrichtigungen aktivieren', type: 'boolean' }
            ]
        });

        this.widgetTypes.set('todo', {
            name: 'Aufgabenliste',
            icon: '✅',
            category: 'Produktivität',
            description: 'Verwalte deine täglichen Aufgaben',
            defaultConfig: {
                maxTasks: 10,
                showCompleted: true,
                autoArchive: false,
                categories: ['Arbeit', 'Privat', 'Einkaufen']
            },
            configFields: [
                { key: 'maxTasks', label: 'Maximale Anzahl Aufgaben', type: 'number', min: 5, max: 50 },
                { key: 'showCompleted', label: 'Erledigte Aufgaben anzeigen', type: 'boolean' },
                { key: 'autoArchive', label: 'Automatisch archivieren', type: 'boolean' }
            ]
        });

        this.widgetTypes.set('notes', {
            name: 'Schnellnotizen',
            icon: '📝',
            category: 'Produktivität',
            description: 'Halte wichtige Notizen fest',
            defaultConfig: {
                maxNotes: 5,
                autoSave: true,
                fontSize: 'medium'
            },
            configFields: [
                { key: 'maxNotes', label: 'Maximale Anzahl Notizen', type: 'number', min: 1, max: 20 },
                { key: 'autoSave', label: 'Automatisch speichern', type: 'boolean' },
                { key: 'fontSize', label: 'Schriftgröße', type: 'select', options: ['small', 'medium', 'large'] }
            ]
        });

        this.widgetTypes.set('weather', {
            name: 'Wetter',
            icon: '🌤️',
            category: 'Informationen',
            description: 'Aktuelle Wetterinformationen',
            defaultConfig: {
                location: 'Detmold',
                units: 'metric',
                showForecast: true,
                updateInterval: 30
            },
            configFields: [
                { key: 'location', label: 'Standort', type: 'text' },
                { key: 'units', label: 'Einheiten', type: 'select', options: ['metric', 'imperial'] },
                { key: 'showForecast', label: 'Vorhersage anzeigen', type: 'boolean' },
                { key: 'updateInterval', label: 'Update-Intervall (Minuten)', type: 'number', min: 5, max: 120 }
            ]
        });

        this.widgetTypes.set('quickchat', {
            name: 'Quick Chat',
            icon: '💬',
            category: 'KI & Chat',
            description: 'Schneller AI-Assistant',
            defaultConfig: {
                maxMessages: 20,
                autoScroll: true,
                showTimestamps: true
            },
            configFields: [
                { key: 'maxMessages', label: 'Maximale Nachrichten', type: 'number', min: 5, max: 100 },
                { key: 'autoScroll', label: 'Automatisch scrollen', type: 'boolean' },
                { key: 'showTimestamps', label: 'Zeitstempel anzeigen', type: 'boolean' }
            ]
        });
    }

    initializeEventListeners() {
        // Widget hinzufügen
        document.getElementById('addWidgetBtn')?.addEventListener('click', () => {
            this.showWidgetSelectionModal();
        });

        document.getElementById('addFirstWidgetBtn')?.addEventListener('click', () => {
            this.showWidgetSelectionModal();
        });

        // Alle Widgets aktualisieren
        document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
            this.refreshAllWidgets();
        });

        // Modal Event Listeners
        this.initializeModalEvents();

        // Context Menu Events
        this.initializeContextMenuEvents();

        // Drag & Drop Events
        this.initializeDragAndDrop();
    }

    initializeModalEvents() {
        // Widget Selection Modal
        const widgetModal = document.getElementById('widgetSelectionModal');
        const closeWidgetModal = document.getElementById('closeWidgetModal');
        
        closeWidgetModal?.addEventListener('click', () => {
            this.hideWidgetSelectionModal();
        });

        // Widget Options Click
        document.addEventListener('click', (e) => {
            const widgetOption = e.target.closest('.widget-option');
            if (widgetOption) {
                const widgetType = widgetOption.dataset.type;
                this.selectWidgetType(widgetType);
            }
        });

        // Configuration Modal
        const configModal = document.getElementById('widgetConfigModal');
        const closeConfigModal = document.getElementById('closeConfigModal');
        const cancelConfigBtn = document.getElementById('cancelConfigBtn');
        const saveConfigBtn = document.getElementById('saveConfigBtn');

        closeConfigModal?.addEventListener('click', () => {
            this.hideConfigModal();
        });

        cancelConfigBtn?.addEventListener('click', () => {
            this.hideConfigModal();
        });

        saveConfigBtn?.addEventListener('click', () => {
            this.saveWidgetConfig();
        });

        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
    }

    initializeContextMenuEvents() {
        const contextMenu = document.getElementById('widgetContextMenu');
        
        // Right-click auf Widgets
        document.addEventListener('contextmenu', (e) => {
            const widget = e.target.closest('.widget');
            if (widget) {
                e.preventDefault();
                this.showContextMenu(e.clientX, e.clientY, widget.dataset.widgetId);
            }
        });

        // Context Menu Actions
        contextMenu?.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (item) {
                const action = item.dataset.action;
                const widgetId = contextMenu.dataset.widgetId;
                this.handleContextMenuAction(action, widgetId);
                this.hideContextMenu();
            }
        });

        // Hide context menu on outside click
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    initializeDragAndDrop() {
        const container = document.getElementById('widgetsContainer');
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(container, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (afterElement == null) {
                container.appendChild(dragging);
            } else {
                container.insertBefore(dragging, afterElement);
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            this.saveDragOrder();
        });
    }

    // ========================================
    // WIDGET LIFECYCLE
    // ========================================

    async loadUserWidgets() {
        try {
            const response = await fetch('/api/widgets', {
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                this.renderWidgets(data.widgets || []);
            } else {
                this.checkEmptyState();
            }
        } catch (error) {
            console.error('Error loading widgets:', error);
            this.checkEmptyState();
        }
    }

    async createWidget(type, config = {}) {
        const widgetType = this.widgetTypes.get(type);
        if (!widgetType) {
            this.showToast('Unbekannter Widget-Typ', 'error');
            return;
        }

        const widgetData = {
            type: type,
            title: config.title || widgetType.name,
            config: { ...widgetType.defaultConfig, ...config },
            position: this.getNextPosition()
        };

        try {
            const response = await fetch('/api/widgets', {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(widgetData)
            });

            if (response.ok) {
                const data = await response.json();
                this.addWidgetToDOM(data.widget);
                this.showToast('Widget erfolgreich hinzugefügt', 'success');
                this.checkEmptyState();
            } else {
                throw new Error('Failed to create widget');
            }
        } catch (error) {
            console.error('Error creating widget:', error);
            this.showToast('Fehler beim Erstellen des Widgets', 'error');
        }
    }

    renderWidgets(widgetsData) {
        const container = document.getElementById('widgetsContainer');
        const emptyState = document.getElementById('widgetsEmpty');
        
        // Clear existing widgets
        container.querySelectorAll('.widget').forEach(widget => widget.remove());

        if (widgetsData.length === 0) {
            emptyState.style.display = 'flex';
            return;
        }

        emptyState.style.display = 'none';

        // Sort by position and add to DOM
        widgetsData
            .sort((a, b) => a.position - b.position)
            .forEach(widgetData => {
                this.addWidgetToDOM(widgetData);
            });
    }

    addWidgetToDOM(widgetData) {
        const container = document.getElementById('widgetsContainer');
        const widgetElement = this.createWidgetElement(widgetData);
        
        container.appendChild(widgetElement);
        
        // Initialize widget instance
        this.initializeWidget(widgetData);
        
        // Add drag functionality
        this.makeDraggable(widgetElement);
    }

    createWidgetElement(widgetData) {
        const widgetType = this.widgetTypes.get(widgetData.type);
        const element = document.createElement('div');
        
        element.className = 'widget';
        element.dataset.widgetId = widgetData._id;
        element.dataset.widgetType = widgetData.type;
        element.draggable = true;
        
        element.innerHTML = `
            <div class="widget-header">
                <div class="widget-title">
                    <span class="widget-icon">${widgetType.icon}</span>
                    <span class="widget-name">${widgetData.title}</span>
                </div>
                <div class="widget-actions">
                    <button class="widget-action-btn" data-action="refresh" title="Aktualisieren">
                        🔄
                    </button>
                    <button class="widget-action-btn" data-action="configure" title="Konfigurieren">
                        ⚙️
                    </button>
                    <button class="widget-action-btn widget-menu-btn" data-action="menu" title="Mehr">
                        ⋮
                    </button>
                </div>
            </div>
            <div class="widget-content" id="widget-content-${widgetData._id}">
                <div class="widget-loading">
                    <div class="loading-spinner"></div>
                    <p>Widget wird geladen...</p>
                </div>
            </div>
        `;

        // Widget Action Events
        element.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.widget-action-btn');
            if (actionBtn) {
                e.stopPropagation();
                const action = actionBtn.dataset.action;
                this.handleWidgetAction(action, widgetData._id);
            }
        });

        return element;
    }

    initializeWidget(widgetData) {
        try {
            let widgetInstance;
            
            switch (widgetData.type) {
                case 'pomodoro':
                    widgetInstance = new PomodoroWidget(widgetData._id, widgetData.config);
                    break;
                case 'todo':
                    widgetInstance = new TodoWidget(widgetData._id, widgetData.config);
                    break;
                case 'notes':
                    widgetInstance = new NotesWidget(widgetData._id, widgetData.config);
                    break;
                case 'weather':
                    widgetInstance = new WeatherWidget(widgetData._id, widgetData.config);
                    break;
                case 'calendar':
                    widgetInstance = new CalendarWidget(widgetData._id, widgetData.config);
                    break;
                case 'news':
                    widgetInstance = new NewsWidget(widgetData._id, widgetData.config);
                    break;
                case 'quickchat':
                    widgetInstance = new QuickChatWidget(widgetData._id, widgetData.config);
                    break;
                case 'profiles':
                    widgetInstance = new ProfilesWidget(widgetData._id, widgetData.config);
                    break;
                default:
                    throw new Error(`Unknown widget type: ${widgetData.type}`);
            }
            
            this.widgets.set(widgetData._id, widgetInstance);
            
        } catch (error) {
            console.error('Error initializing widget:', error);
            this.showWidgetError(widgetData._id, 'Widget konnte nicht geladen werden');
        }
    }

    // ========================================
    // WIDGET ACTIONS
    // ========================================

    handleWidgetAction(action, widgetId) {
        switch (action) {
            case 'refresh':
                this.refreshWidget(widgetId);
                break;
            case 'configure':
                this.configureWidget(widgetId);
                break;
            case 'menu':
                // Context menu über Button
                const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
                const menuBtn = widget.querySelector('[data-action="menu"]');
                const rect = menuBtn.getBoundingClientRect();
                this.showContextMenu(rect.right - 10, rect.bottom + 5, widgetId);
                break;
        }
    }

    async refreshWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        const element = document.getElementById(`widget-${widgetId}`);
        
        if (element) {
            element.classList.add('loading');
        }

        try {
            if (widget && typeof widget.refresh === 'function') {
                await widget.refresh();
            }
            
            // API-Call für Widget-Daten
            const response = await fetch(`/api/widgets/${widgetId}/refresh`, {
                method: 'POST',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (widget && typeof widget.updateData === 'function') {
                    widget.updateData(data.data);
                }
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Widgets:', error);
            this.showToast('Fehler beim Aktualisieren des Widgets', 'error');
        } finally {
            if (element) {
                element.classList.remove('loading');
            }
        }
    }

    async refreshAllWidgets() {
        const widgetIds = Array.from(this.widgets.keys());
        this.showToast(`${widgetIds.length} Widgets werden aktualisiert...`, 'info');
        
        const promises = widgetIds.map(id => this.refreshWidget(id));
        
        try {
            await Promise.all(promises);
            this.showToast('Alle Widgets aktualisiert', 'success');
        } catch (error) {
            this.showToast('Einige Widgets konnten nicht aktualisiert werden', 'warning');
        }
    }

    configureWidget(widgetId) {
        const widgetData = this.getWidgetData(widgetId);
        const widgetType = this.widgetTypes.get(widgetData?.type);
        
        if (!widgetData || !widgetType) {
            this.showToast('Widget-Konfiguration nicht verfügbar', 'error');
            return;
        }

        this.openConfigModal(widgetId, widgetData, widgetType);
    }

    async deleteWidget(widgetId) {
        if (!confirm('Widget wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            return;
        }

        try {
            const response = await fetch(`/api/widgets/${widgetId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const element = document.querySelector(`[data-widget-id="${widgetId}"]`);
                if (element) {
                    element.style.animation = 'widgetSlideOut 0.3s ease-in forwards';
                    setTimeout(() => {
                        element.remove();
                        this.checkEmptyState();
                    }, 300);
                }
                
                this.widgets.delete(widgetId);
                this.showToast('Widget erfolgreich gelöscht', 'success');
            } else {
                throw new Error('Fehler beim Löschen des Widgets');
            }
        } catch (error) {
            console.error('Error deleting widget:', error);
            this.showToast('Fehler beim Löschen des Widgets', 'error');
        }
    }

    async duplicateWidget(widgetId) {
        const widgetData = this.getWidgetData(widgetId);
        if (!widgetData) return;

        try {
            const newConfig = {
                ...widgetData.config,
                title: `${widgetData.title} (Kopie)`
            };
            
            await this.createWidget(widgetData.type, newConfig);
        } catch (error) {
            this.showToast('Fehler beim Duplizieren des Widgets', 'error');
        }
    }

    // ========================================
    // MODAL MANAGEMENT
    // ========================================

    showWidgetSelectionModal() {
        const modal = document.getElementById('widgetSelectionModal');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hideWidgetSelectionModal() {
        const modal = document.getElementById('widgetSelectionModal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    openConfigModal(widgetId, widgetData, widgetType) {
        const modal = document.getElementById('widgetConfigModal');
        const modalBody = document.getElementById('configModalBody');
        
        // Store current widget ID for saving
        modal.dataset.widgetId = widgetId;
        
        // Generate configuration form
        modalBody.innerHTML = this.generateConfigForm(widgetType, widgetData.config);
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    hideConfigModal() {
        const modal = document.getElementById('widgetConfigModal');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        delete modal.dataset.widgetId;
    }

    hideAllModals() {
        this.hideWidgetSelectionModal();
        this.hideConfigModal();
    }

    // ========================================
    // CONTEXT MENU
    // ========================================

    showContextMenu(x, y, widgetId) {
        const contextMenu = document.getElementById('widgetContextMenu');
        contextMenu.dataset.widgetId = widgetId;
        contextMenu.style.display = 'block';
        
        // Position menu
        const rect = contextMenu.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        
        contextMenu.style.left = Math.min(x, maxX) + 'px';
        contextMenu.style.top = Math.min(y, maxY) + 'px';
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('widgetContextMenu');
        contextMenu.style.display = 'none';
        delete contextMenu.dataset.widgetId;
    }

    handleContextMenuAction(action, widgetId) {
        switch (action) {
            case 'refresh':
                this.refreshWidget(widgetId);
                break;
            case 'configure':
                this.configureWidget(widgetId);
                break;
            case 'duplicate':
                this.duplicateWidget(widgetId);
                break;
            case 'delete':
                this.deleteWidget(widgetId);
                break;
        }
    }

    // ========================================
    // UTILITY METHODS
    // ========================================

    selectWidgetType(type) {
        this.hideWidgetSelectionModal();
        
        const widgetType = this.widgetTypes.get(type);
        if (widgetType.configFields.length > 0) {
            // Show configuration modal first
            this.openConfigModal('new', { type, config: widgetType.defaultConfig }, widgetType);
        } else {
            // Create widget directly
            this.createWidget(type);
        }
    }

    generateConfigForm(widgetType, currentConfig) {
        let html = `<h4>${widgetType.name} konfigurieren</h4>`;
        
        widgetType.configFields.forEach(field => {
            const value = currentConfig[field.key] ?? field.default ?? '';
            
            html += `<div class="config-field">`;
            html += `<label class="config-label">${field.label}</label>`;
            
            switch (field.type) {
                case 'text':
                    html += `<input type="text" class="config-input" data-key="${field.key}" value="${value}">`;
                    break;
                case 'number':
                    html += `<input type="number" class="config-input" data-key="${field.key}" 
                            value="${value}" min="${field.min || 0}" max="${field.max || 100}">`;
                    break;
                case 'boolean':
                    html += `<div class="config-toggle">
                        <div class="toggle-switch ${value ? 'active' : ''}" data-key="${field.key}">
                            <div class="toggle-slider"></div>
                        </div>
                        <span>${value ? 'Ein' : 'Aus'}</span>
                    </div>`;
                    break;
                case 'select':
                    html += `<select class="config-input" data-key="${field.key}">`;
                    field.options.forEach(option => {
                        const selected = option === value ? 'selected' : '';
                        html += `<option value="${option}" ${selected}>${option}</option>`;
                    });
                    html += `</select>`;
                    break;
            }
            
            html += `</div>`;
        });

        // Add event listeners for toggle switches
        setTimeout(() => {
            document.querySelectorAll('.toggle-switch').forEach(toggle => {
                toggle.addEventListener('click', () => {
                    toggle.classList.toggle('active');
                    const span = toggle.nextElementSibling;
                    span.textContent = toggle.classList.contains('active') ? 'Ein' : 'Aus';
                });
            });
        }, 0);

        return html;
    }

    async saveWidgetConfig() {
        const modal = document.getElementById('widgetConfigModal');
        const widgetId = modal.dataset.widgetId;
        
        // Collect configuration data
        const config = {};
        
        modal.querySelectorAll('.config-input').forEach(input => {
            const key = input.dataset.key;
            let value = input.value;
            
            if (input.type === 'number') {
                value = parseInt(value);
            }
            
            config[key] = value;
        });

        modal.querySelectorAll('.toggle-switch').forEach(toggle => {
            const key = toggle.dataset.key;
            config[key] = toggle.classList.contains('active');
        });

        try {
            if (widgetId === 'new') {
                // Create new widget
                const type = modal.dataset.widgetType || 'pomodoro';
                await this.createWidget(type, config);
            } else {
                // Update existing widget
                const response = await fetch(`/api/widgets/${widgetId}`, {
                    method: 'PUT',
                    headers: {
                        ...this.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ config })
                });

                if (response.ok) {
                    // Update widget instance
                    const widget = this.widgets.get(widgetId);
                    if (widget && typeof widget.updateConfig === 'function') {
                        widget.updateConfig(config);
                    }
                    this.showToast('Widget-Konfiguration gespeichert', 'success');
                } else {
                    throw new Error('Failed to update widget');
                }
            }
            
            this.hideConfigModal();
        } catch (error) {
            console.error('Error saving widget config:', error);
            this.showToast('Fehler beim Speichern der Konfiguration', 'error');
        }
    }

    getWidgetData(widgetId) {
        const element = document.querySelector(`[data-widget-id="${widgetId}"]`);
        if (!element) return null;
        
        return {
            _id: widgetId,
            type: element.dataset.widgetType,
            title: element.querySelector('.widget-name').textContent,
            config: this.widgets.get(widgetId)?.config || {}
        };
    }

    getNextPosition() {
        const widgets = document.querySelectorAll('.widget');
        return widgets.length;
    }

    checkEmptyState() {
        const widgets = document.querySelectorAll('.widget');
        const emptyState = document.getElementById('widgetsEmpty');
        
        if (widgets.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
    }

    // ========================================
    // DRAG & DROP
    // ========================================

    makeDraggable(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedWidget = element;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.outerHTML);
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.draggedWidget = null;
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.widget:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    async saveDragOrder() {
        const widgets = document.querySelectorAll('.widget');
        const order = Array.from(widgets).map((widget, index) => ({
            id: widget.dataset.widgetId,
            position: index
        }));

        try {
            await fetch('/api/widgets/order', {
                method: 'PUT',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order })
            });
        } catch (error) {
            console.error('Error saving widget order:', error);
        }
    }

    // ========================================
    // UTILITY & HELPERS
    // ========================================

    getAuthHeaders() {
        const token = localStorage.getItem('allKiAuthToken');
        const email = localStorage.getItem('allKiUserEmail');
        
        return {
            'Authorization': `Bearer ${token}`,
            'X-User-Email': email
        };
    }

    showWidgetError(widgetId, message) {
        const content = document.getElementById(`widget-content-${widgetId}`);
        if (content) {
            content.innerHTML = `
                <div class="widget-error">
                    <div class="error-icon">⚠️</div>
                    <p>${message}</p>
                    <button class="btn btn-sm btn-secondary" onclick="widgetsManager.refreshWidget('${widgetId}')">
                        Erneut versuchen
                    </button>
                </div>
            `;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

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
    }
}

// Global instance
window.widgetsManager = new WidgetsManager();