// WidgetManager - Zentrales Widget-Verwaltungssystem für All-KI

class WidgetManager {
    constructor() {
        this.widgets = new Map(); // Aktive Widget-Instanzen
        this.widgetTypes = new Map(); // Registrierte Widget-Typen
        this.currentLayout = 'grid'; // grid, masonry, list
        this.isLayoutMode = false; // Layout-Bearbeitungsmodus
        this.draggedWidget = null; // Aktuell gezogenes Widget
        this.contextMenuWidget = null; // Widget für Kontextmenü
        this.currentFilter = 'all'; // Aktueller Filter
        this.refreshInterval = null; // Auto-Refresh Timer
        
        this.init();
    }

    init() {
        console.log('🧩 Widget Manager wird initialisiert...');
        this.checkAuth();
        this.registerWidgetTypes();
        this.bindEvents();
        this.loadUserWidgets();
        this.setupAutoRefresh();
        console.log('✅ Widget Manager erfolgreich initialisiert');
    }

    checkAuth() {
        const isLoggedIn = localStorage.getItem('allKiLoggedIn');
        if (isLoggedIn !== 'true') {
            window.location.href = '/login.html';
            return;
        }
    }

    // ========================================
    // WIDGET-TYPEN REGISTRIERUNG
    // ========================================

    registerWidgetTypes() {
        console.log('📝 Registriere Widget-Typen...');

        // Produktivitäts-Widgets
        this.registerWidget('pomodoro', {
            name: 'Pomodoro Timer',
            category: 'productivity',
            icon: '⏰',
            description: 'Fokussiertes Arbeiten mit der Pomodoro-Technik',
            defaultSize: { width: 2, height: 2 },
            component: PomodoroWidget,
            config: {
                workDuration: { type: 'number', default: 25, label: 'Arbeitszeit (Minuten)' },
                breakDuration: { type: 'number', default: 5, label: 'Pausenzeit (Minuten)' },
                longBreakDuration: { type: 'number', default: 15, label: 'Lange Pause (Minuten)' },
                sessionsUntilLongBreak: { type: 'number', default: 4, label: 'Sessions bis lange Pause' },
                enableNotifications: { type: 'boolean', default: true, label: 'Benachrichtigungen aktivieren' },
                enableSounds: { type: 'boolean', default: false, label: 'Sounds aktivieren' }
            }
        });

        this.registerWidget('habit-tracker', {
            name: 'Habit Tracker',
            category: 'productivity',
            icon: '✅',
            description: 'Verfolge deine täglichen Gewohnheiten und Ziele',
            defaultSize: { width: 3, height: 2 },
            component: HabitTrackerWidget,
            config: {
                maxHabits: { type: 'number', default: 5, label: 'Maximale Anzahl Gewohnheiten' },
                showProgress: { type: 'boolean', default: true, label: 'Fortschritt anzeigen' },
                weekStartsOn: { type: 'select', default: 'monday', options: ['monday', 'sunday'], label: 'Woche beginnt am' }
            }
        });

        this.registerWidget('quick-notes', {
            name: 'Quick Notes',
            category: 'productivity',
            icon: '📝',
            description: 'Schnelle Notizen und Gedanken festhalten',
            defaultSize: { width: 2, height: 3 },
            component: QuickNotesWidget,
            config: {
                maxNotes: { type: 'number', default: 10, label: 'Maximale Anzahl Notizen' },
                enableTags: { type: 'boolean', default: true, label: 'Tags aktivieren' },
                autoSave: { type: 'boolean', default: true, label: 'Automatisch speichern' }
            }
        });

        // Gesundheits-Widgets
        this.registerWidget('water-tracker', {
            name: 'Water Tracker',
            category: 'health',
            icon: '💧',
            description: 'Verfolge deine tägliche Wasseraufnahme',
            defaultSize: { width: 2, height: 1 },
            component: WaterTrackerWidget,
            config: {
                dailyGoal: { type: 'number', default: 2000, label: 'Tägliches Ziel (ml)' },
                reminderInterval: { type: 'number', default: 60, label: 'Erinnerungsinterval (Minuten)' },
                cupSize: { type: 'number', default: 250, label: 'Standard Tassengröße (ml)' }
            }
        });

        this.registerWidget('mood-tracker', {
            name: 'Mood Tracker',
            category: 'health',
            icon: '😊',
            description: 'Verfolge deine Stimmung und Emotionen',
            defaultSize: { width: 2, height: 2 },
            component: MoodTrackerWidget,
            config: {
                enableNotes: { type: 'boolean', default: true, label: 'Notizen aktivieren' },
                moodScale: { type: 'select', default: '5-point', options: ['3-point', '5-point', '10-point'], label: 'Stimmungsskala' },
                showTrends: { type: 'boolean', default: true, label: 'Trends anzeigen' }
            }
        });

        // Finanz-Widgets
        this.registerWidget('expense-tracker', {
            name: 'Expense Tracker',
            category: 'finance',
            icon: '💰',
            description: 'Verfolge deine Ausgaben und Budget',
            defaultSize: { width: 3, height: 2 },
            component: ExpenseTrackerWidget,
            config: {
                currency: { type: 'select', default: 'EUR', options: ['EUR', 'USD', 'GBP'], label: 'Währung' },
                monthlyBudget: { type: 'number', default: 1000, label: 'Monatliches Budget' },
                enableCategories: { type: 'boolean', default: true, label: 'Kategorien aktivieren' }
            }
        });

        this.registerWidget('crypto-portfolio', {
            name: 'Crypto Portfolio',
            category: 'finance',
            icon: '₿',
            description: 'Überwache dein Krypto-Portfolio',
            defaultSize: { width: 3, height: 2 },
            component: CryptoPortfolioWidget,
            config: {
                currencies: { type: 'text', default: 'BTC,ETH,ADA', label: 'Kryptowährungen (kommagetrennt)' },
                refreshInterval: { type: 'number', default: 300, label: 'Aktualisierung (Sekunden)' },
                showPercentage: { type: 'boolean', default: true, label: 'Prozentuale Änderung anzeigen' }
            }
        });

        // Lern-Widgets
        this.registerWidget('flashcards', {
            name: 'Flashcards',
            category: 'learning',
            icon: '🎴',
            description: 'Digitale Karteikarten zum Lernen',
            defaultSize: { width: 2, height: 2 },
            component: FlashcardsWidget,
            config: {
                autoFlip: { type: 'boolean', default: false, label: 'Automatisch umdrehen' },
                shuffleCards: { type: 'boolean', default: true, label: 'Karten mischen' },
                showProgress: { type: 'boolean', default: true, label: 'Fortschritt anzeigen' }
            }
        });

        // Social Widgets
        this.registerWidget('contact-reminder', {
            name: 'Contact Reminder',
            category: 'social',
            icon: '👥',
            description: 'Erinnerungen für Kontakte mit Freunden und Familie',
            defaultSize: { width: 2, height: 2 },
            component: ContactReminderWidget,
            config: {
                defaultInterval: { type: 'number', default: 30, label: 'Standard Erinnerungsinterval (Tage)' },
                enableNotifications: { type: 'boolean', default: true, label: 'Benachrichtigungen aktivieren' }
            }
        });

        // Smart Home Widgets
        this.registerWidget('device-control', {
            name: 'Device Control',
            category: 'smart-home',
            icon: '🏠',
            description: 'Steuerung für Smart Home Geräte',
            defaultSize: { width: 3, height: 2 },
            component: DeviceControlWidget,
            config: {
                hubType: { type: 'select', default: 'philips-hue', options: ['philips-hue', 'homekit', 'alexa'], label: 'Hub-Typ' },
                showStatus: { type: 'boolean', default: true, label: 'Gerätestatus anzeigen' }
            }
        });

        console.log(`✅ ${this.widgetTypes.size} Widget-Typen registriert`);
    }

    registerWidget(type, config) {
        this.widgetTypes.set(type, {
            type,
            ...config,
            apiEndpoint: `/api/widgets/${config.category}/${type}`
        });
    }

    // ========================================
    // EVENT-HANDLING
    // ========================================

    bindEvents() {
        // Widget hinzufügen
        document.getElementById('addWidgetBtn')?.addEventListener('click', () => {
            this.openWidgetSelector();
        });

        document.getElementById('addWidgetPlaceholder')?.addEventListener('click', () => {
            this.openWidgetSelector();
        });

        // Layout-Modus
        document.getElementById('layoutModeBtn')?.addEventListener('click', () => {
            this.toggleLayoutMode();
        });

        // Filter-Tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.setFilter(tab.dataset.category);
            });
        });

        // Sortierung
        document.getElementById('sortWidgets')?.addEventListener('change', (e) => {
            this.sortWidgets(e.target.value);
        });

        // Alle aktualisieren
        document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
            this.refreshAllWidgets();
        });

        // Logout
        document.getElementById('logout-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Kontextmenü
        document.addEventListener('contextmenu', (e) => {
            const widget = e.target.closest('.widget-container');
            if (widget) {
                e.preventDefault();
                this.showContextMenu(e, widget.id.replace('widget-', ''));
            }
        });

        // Klick außerhalb Kontextmenü
        document.addEventListener('click', () => {
            this.hideContextMenu();
        });

        // Drag & Drop
        this.setupDragAndDrop();

        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    setupDragAndDrop() {
        const widgetsGrid = document.getElementById('widgetsGrid');
        if (!widgetsGrid) return;

        // Drag über Grid
        widgetsGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        // Drop auf Grid
        widgetsGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            if (this.draggedWidget) {
                this.handleWidgetDrop(e);
            }
        });
    }

    // ========================================
    // WIDGET-VERWALTUNG
    // ========================================

    async loadUserWidgets() {
        try {
            this.showLoading('Widgets werden geladen...');
            
            const response = await fetch('/api/widgets', {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                const widgets = data.widgets || [];
                
                console.log(`📦 ${widgets.length} Widgets geladen`);
                
                if (widgets.length === 0) {
                    this.showEmptyState();
                } else {
                    this.hideEmptyState();
                    widgets.forEach(widget => this.addWidgetToDOM(widget));
                }
            } else {
                console.error('Fehler beim Laden der Widgets:', response.statusText);
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Fehler beim Laden der Widgets:', error);
            this.showToast('Fehler beim Laden der Widgets', 'error');
            this.showEmptyState();
        } finally {
            this.hideLoading();
        }
    }

    async createWidget(type, config = {}) {
        try {
            const widgetType = this.widgetTypes.get(type);
            if (!widgetType) {
                throw new Error(`Widget-Typ ${type} nicht gefunden`);
            }

            this.showLoading('Widget wird erstellt...');

            // Freie Position finden
            const position = this.findFreePosition(widgetType.defaultSize);

            const response = await fetch('/api/widgets', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    type,
                    title: config.title || widgetType.name,
                    config: { ...widgetType.config, ...config },
                    position
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.hideEmptyState();
                    const widget = this.addWidgetToDOM(data.widget);
                    this.showToast(`${widgetType.name} erfolgreich erstellt!`, 'success');
                    return widget;
                }
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Fehler beim Erstellen des Widgets');
            }
        } catch (error) {
            console.error('Error creating widget:', error);
            this.showToast(error.message, 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    addWidgetToDOM(widgetData) {
        const widgetType = this.widgetTypes.get(widgetData.type);
        if (!widgetType) {
            console.error(`Unbekannter Widget-Typ: ${widgetData.type}`);
            return null;
        }

        const container = document.getElementById('widgetsGrid');
        
        const widgetElement = document.createElement('div');
        widgetElement.className = 'widget-container new';
        widgetElement.id = `widget-${widgetData._id}`;
        widgetElement.dataset.widgetId = widgetData._id;
        widgetElement.dataset.widgetType = widgetData.type;
        widgetElement.dataset.category = widgetType.category;
        widgetElement.draggable = true;

        // Widget-Header erstellen
        const header = this.createWidgetHeader(widgetData, widgetType);
        
        // Widget-Content erstellen
        const content = document.createElement('div');
        content.className = 'widget-content';
        content.id = `widget-content-${widgetData._id}`;

        widgetElement.appendChild(header);
        widgetElement.appendChild(content);

        // Drag Events
        this.setupWidgetDragEvents(widgetElement);

        // Widget zu DOM hinzufügen
        const placeholder = document.getElementById('addWidgetPlaceholder');
        if (placeholder) {
            container.insertBefore(widgetElement, placeholder);
        } else {
            container.appendChild(widgetElement);
        }

        // Widget-Komponente initialisieren
        try {
            const WidgetComponent = widgetType.component;
            if (WidgetComponent) {
                const widget = new WidgetComponent(content, widgetData, this);
                this.widgets.set(widgetData._id, widget);
                
                // Animation entfernen nach Abschluss
                setTimeout(() => {
                    widgetElement.classList.remove('new');
                }, 500);
                
                return widget;
            } else {
                console.warn(`Widget-Komponente für ${widgetData.type} nicht gefunden`);
                this.createFallbackWidget(content, widgetData);
            }
        } catch (error) {
            console.error(`Fehler beim Initialisieren des Widgets ${widgetData.type}:`, error);
            this.createFallbackWidget(content, widgetData);
        }

        return null;
    }

    createWidgetHeader(widgetData, widgetType) {
        const header = document.createElement('div');
        header.className = 'widget-header';
        
        header.innerHTML = `
            <div class="widget-title">
                <span class="widget-icon">${widgetType.icon}</span>
                <span class="widget-name">${widgetData.title}</span>
            </div>
            <div class="widget-controls">
                <button class="widget-btn refresh-btn" 
                        onclick="widgetManager.refreshWidget('${widgetData._id}')" 
                        title="Aktualisieren">🔄</button>
                <button class="widget-btn config-btn" 
                        onclick="widgetManager.configureWidget('${widgetData._id}')" 
                        title="Konfigurieren">⚙️</button>
                <button class="widget-btn delete-btn" 
                        onclick="widgetManager.deleteWidget('${widgetData._id}')" 
                        title="Löschen">🗑️</button>
            </div>
        `;

        return header;
    }

    createFallbackWidget(container, widgetData) {
        container.innerHTML = `
            <div class="widget-fallback">
                <div class="fallback-icon">⚠️</div>
                <h4>Widget nicht verfügbar</h4>
                <p>Das Widget "${widgetData.type}" konnte nicht geladen werden.</p>
                <button class="btn-secondary" onclick="widgetManager.deleteWidget('${widgetData._id}')">
                    Widget entfernen
                </button>
            </div>
        `;
    }

    setupWidgetDragEvents(element) {
        element.addEventListener('dragstart', (e) => {
            this.draggedWidget = element.dataset.widgetId;
            element.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.outerHTML);
        });

        element.addEventListener('dragend', () => {
            element.classList.remove('dragging');
            this.draggedWidget = null;
        });
    }

    // ========================================
    // WIDGET-AKTIONEN
    // ========================================

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
                const element = document.getElementById(`widget-${widgetId}`);
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
    // WIDGET-AUSWAHL & KONFIGURATION
    // ========================================

    openWidgetSelector() {
        const modal = document.getElementById('widgetSelectionModal');
        const grid = document.getElementById('widgetCategoriesGrid');
        
        if (!modal || !grid) return;

        // Kategorien gruppieren
        const categories = this.groupWidgetsByCategory();
        
        grid.innerHTML = '';
        
        categories.forEach((widgets, category) => {
            const categoryElement = this.createCategoryElement(category, widgets);
            grid.appendChild(categoryElement);
        });

        this.showModal('widgetSelectionModal');
    }

    groupWidgetsByCategory() {
        const categories = new Map();
        
        this.widgetTypes.forEach((widget, type) => {
            if (!categories.has(widget.category)) {
                categories.set(widget.category, []);
            }
            categories.get(widget.category).push({ type, ...widget });
        });

        return categories;
    }

    createCategoryElement(category, widgets) {
        const categoryInfo = this.getCategoryInfo(category);
        
        const element = document.createElement('div');
        element.className = 'widget-category';
        
        const widgetList = widgets.map(widget => `
            <div class="widget-option" onclick="widgetManager.selectWidget('${widget.type}')">
                <div class="widget-option-icon">${widget.icon}</div>
                <div class="widget-option-info">
                    <div class="widget-option-name">${widget.name}</div>
                    <div class="widget-option-desc">${widget.description}</div>
                </div>
                <div class="widget-option-size">${widget.defaultSize.width}×${widget.defaultSize.height}</div>
            </div>
        `).join('');

        element.innerHTML = `
            <div class="category-header">
                <div class="category-icon">${categoryInfo.icon}</div>
                <div class="category-info">
                    <h4>${categoryInfo.name}</h4>
                    <p>${categoryInfo.description}</p>
                </div>
            </div>
            <div class="widget-list">
                ${widgetList}
            </div>
        `;

        return element;
    }

    getCategoryInfo(category) {
        const categoryMap = {
            'productivity': {
                name: 'Produktivität',
                description: 'Tools für effizientes Arbeiten',
                icon: '⚡'
            },
            'health': {
                name: 'Gesundheit',
                description: 'Gesundheits- und Fitness-Tracking',
                icon: '🏥'
            },
            'finance': {
                name: 'Finanzen',
                description: 'Budget und Investitionen verwalten',
                icon: '💰'
            },
            'learning': {
                name: 'Lernen',
                description: 'Bildung und Wissenserwerb',
                icon: '📚'
            },
            'social': {
                name: 'Sozial',
                description: 'Kontakte und Beziehungen pflegen',
                icon: '👥'
            },
            'smart-home': {
                name: 'Smart Home',
                description: 'Hausautomation und IoT-Geräte',
                icon: '🏠'
            }
        };

        return categoryMap[category] || {
            name: category,
            description: 'Verschiedene Tools',
            icon: '🧩'
        };
    }

    async selectWidget(type) {
        this.closeWidgetSelector();
        
        try {
            await this.createWidget(type);
        } catch (error) {
            // Fehler wird bereits in createWidget behandelt
        }
    }

    // ========================================
    // KONFIGURATION & MODALS
    // ========================================

    openConfigModal(widgetId, widgetData, widgetType) {
        const modal = document.getElementById('widgetConfigModal');
        const title = document.getElementById('configModalTitle');
        const content = document.getElementById('widgetConfigContent');
        
        if (!modal || !title || !content) return;

        title.textContent = `${widgetType.name} konfigurieren`;
        
        // Konfigurationsformular erstellen
        content.innerHTML = this.createConfigForm(widgetData, widgetType);
        
        // Widget-ID für speichern merken
        modal.dataset.widgetId = widgetId;
        
        this.showModal('widgetConfigModal');
    }

    createConfigForm(widgetData, widgetType) {
        const config = widgetType.config || {};
        const currentConfig = widgetData.config || {};
        
        const sections = Object.entries(config).map(([key, field]) => {
            const currentValue = currentConfig[key] ?? field.default;
            
            let inputHtml = '';
            
            switch (field.type) {
                case 'boolean':
                    inputHtml = `
                        <div class="config-toggle">
                            <div class="toggle-switch ${currentValue ? 'active' : ''}" 
                                 onclick="this.classList.toggle('active')" 
                                 data-key="${key}">
                                <div class="toggle-slider"></div>
                            </div>
                            <span>${currentValue ? 'Aktiviert' : 'Deaktiviert'}</span>
                        </div>
                    `;
                    break;
                    
                case 'select':
                    const options = field.options.map(option => 
                        `<option value="${option}" ${option === currentValue ? 'selected' : ''}>${option}</option>`
                    ).join('');
                    inputHtml = `<select class="config-input" data-key="${key}">${options}</select>`;
                    break;
                    
                case 'number':
                    inputHtml = `<input type="number" class="config-input" data-key="${key}" value="${currentValue}">`;
                    break;
                    
                default:
                    inputHtml = `<input type="text" class="config-input" data-key="${key}" value="${currentValue}">`;
            }
            
            return `
                <div class="config-row">
                    <div class="config-label">
                        ${field.label}
                        ${field.description ? `<div class="config-label-desc">${field.description}</div>` : ''}
                    </div>
                    <div class="config-control">
                        ${inputHtml}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="config-section">
                <h4>⚙️ Widget-Einstellungen</h4>
                ${sections}
            </div>
        `;
    }

    async saveWidgetConfig() {
        const modal = document.getElementById('widgetConfigModal');
        const widgetId = modal?.dataset.widgetId;
        
        if (!widgetId) return;

        try {
            const config = this.collectConfigData();
            
            const response = await fetch(`/api/widgets/${widgetId}/config`, {
                method: 'PATCH',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ config })
            });

            if (response.ok) {
                const widget = this.widgets.get(widgetId);
                if (widget && typeof widget.updateConfig === 'function') {
                    widget.updateConfig(config);
                }
                
                this.closeConfigModal();
                this.showToast('Konfiguration gespeichert', 'success');
            } else {
                throw new Error('Fehler beim Speichern der Konfiguration');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            this.showToast('Fehler beim Speichern der Konfiguration', 'error');
        }
    }

    collectConfigData() {
        const config = {};
        
        // Text/Number Inputs
        document.querySelectorAll('.config-input').forEach(input => {
            const key = input.dataset.key;
            config[key] = input.type === 'number' ? parseFloat(input.value) : input.value;
        });
        
        // Toggle Switches
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            const key = toggle.dataset.key;
            config[key] = toggle.classList.contains('active');
        });

        return config;
    }

    // ========================================
    // FILTER & SORTIERUNG
    // ========================================

    setFilter(category) {
        this.currentFilter = category;
        
        // Tab-Status aktualisieren
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === category);
        });
        
        // Widgets filtern
        document.querySelectorAll('.widget-container').forEach(widget => {
            const widgetCategory = widget.dataset.category;
            const shouldShow = category === 'all' || widgetCategory === category;
            
            widget.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    sortWidgets(sortBy) {
        const grid = document.getElementById('widgetsGrid');
        const widgets = Array.from(grid.querySelectorAll('.widget-container:not(#addWidgetPlaceholder)'));
        
        widgets.sort((a, b) => {
            switch (sortBy) {
                case 'alphabetical':
                    const nameA = a.querySelector('.widget-name')?.textContent || '';
                    const nameB = b.querySelector('.widget-name')?.textContent || '';
                    return nameA.localeCompare(nameB);
                    
                case 'category':
                    const catA = a.dataset.category || '';
                    const catB = b.dataset.category || '';
                    return catA.localeCompare(catB);
                    
                case 'size':
                    // Größe basierend auf Element-Dimensionen
                    const sizeA = a.offsetWidth * a.offsetHeight;
                    const sizeB = b.offsetWidth * b.offsetHeight;
                    return sizeB - sizeA;
                    
                default: // recent
                    // Basierend auf DOM-Reihenfolge (neueste zuerst)
                    return 0;
            }
        });
        
        // Widgets neu anordnen
        widgets.forEach(widget => grid.appendChild(widget));
        
        // Placeholder am Ende
        const placeholder = document.getElementById('addWidgetPlaceholder');
        if (placeholder) {
            grid.appendChild(placeholder);
        }
    }

    // ========================================
    // LAYOUT & DRAG/DROP
    // ========================================

    toggleLayoutMode() {
        this.isLayoutMode = !this.isLayoutMode;
        const grid = document.getElementById('widgetsGrid');
        const btn = document.getElementById('layoutModeBtn');
        
        if (this.isLayoutMode) {
            grid.classList.add('layout-mode');
            btn.innerHTML = '<span class="icon">✅</span><span>Layout speichern</span>';
            this.showToast('Layout-Bearbeitungsmodus aktiviert', 'info');
        } else {
            grid.classList.remove('layout-mode');
            btn.innerHTML = '<span class="icon">📐</span><span>Layout bearbeiten</span>';
            this.saveLayout();
            this.showToast('Layout gespeichert', 'success');
        }
    }

    findFreePosition(size) {
        // Vereinfachte Positionsfindung - könnte erweitert werden
        return {
            x: 0,
            y: 0,
            width: size.width,
            height: size.height
        };
    }

    handleWidgetDrop(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Neue Position berechnen und Widget verschieben
        // Implementation abhängig von gewähltem Layout-System
        console.log(`Widget dropped at ${x}, ${y}`);
    }

    async saveLayout() {
        const layout = this.getCurrentLayout();
        
        try {
            const response = await fetch('/api/widgets/layout', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ layout })
            });

            if (!response.ok) {
                throw new Error('Fehler beim Speichern des Layouts');
            }
        } catch (error) {
            console.error('Error saving layout:', error);
            this.showToast('Fehler beim Speichern des Layouts', 'error');
        }
    }

    getCurrentLayout() {
        const widgets = [];
        
        document.querySelectorAll('.widget-container[data-widget-id]').forEach((element, index) => {
            widgets.push({
                widgetId: element.dataset.widgetId,
                position: {
                    order: index,
                    x: element.offsetLeft,
                    y: element.offsetTop,
                    width: element.offsetWidth,
                    height: element.offsetHeight
                }
            });
        });

        return widgets;
    }

    // ========================================
    // KONTEXTMENÜ
    // ========================================

    showContextMenu(e, widgetId) {
        const menu = document.getElementById('widgetContextMenu');
        if (!menu) return;

        this.contextMenuWidget = widgetId;
        
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.remove('hidden');
        
        // Position anpassen falls außerhalb des Viewports
        const rect = menu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            menu.style.left = `${e.pageX - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            menu.style.top = `${e.pageY - rect.height}px`;
        }
    }

    hideContextMenu() {
        const menu = document.getElementById('widgetContextMenu');
        if (menu) {
            menu.classList.add('hidden');
        }
        this.contextMenuWidget = null;
    }

    // Kontextmenü-Aktionen (werden von HTML onClick aufgerufen)
    refreshWidget() {
        if (this.contextMenuWidget) {
            this.refreshWidget(this.contextMenuWidget);
        }
        this.hideContextMenu();
    }

    configureWidget() {
        if (this.contextMenuWidget) {
            this.configureWidget(this.contextMenuWidget);
        }
        this.hideContextMenu();
    }

    resizeWidget() {
        if (this.contextMenuWidget) {
            // Widget-Resize-Modus aktivieren
            this.showToast('Resize-Funktion noch nicht implementiert', 'info');
        }
        this.hideContextMenu();
    }

    duplicateWidget() {
        if (this.contextMenuWidget) {
            this.duplicateWidget(this.contextMenuWidget);
        }
        this.hideContextMenu();
    }

    exportWidget() {
        if (this.contextMenuWidget) {
            this.exportWidgetData(this.contextMenuWidget);
        }
        this.hideContextMenu();
    }

    deleteWidget() {
        if (this.contextMenuWidget) {
            this.deleteWidget(this.contextMenuWidget);
        }
        this.hideContextMenu();
    }

    // ========================================
    // HILFSFUNKTIONEN
    // ========================================

    getAuthHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('allKiAuthToken')}`,
            'X-User-Email': localStorage.getItem('allKiUserEmail')
        };
    }

    getWidgetData(widgetId) {
        const element = document.getElementById(`widget-${widgetId}`);
        if (!element) return null;

        // Widget-Daten aus DOM oder Cache holen
        return {
            _id: widgetId,
            type: element.dataset.widgetType,
            title: element.querySelector('.widget-name')?.textContent,
            config: {} // Könnte aus Widget-Instanz geholt werden
        };
    }

    setupAutoRefresh() {
        // Auto-Refresh alle 5 Minuten
        this.refreshInterval = setInterval(() => {
            if (!document.hidden) { // Nur wenn Tab aktiv ist
                this.refreshAllWidgets();
            }
        }, 5 * 60 * 1000);
    }

    handleKeyboardShortcuts(e) {
        // Keyboard Shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'n':
                    e.preventDefault();
                    this.openWidgetSelector();
                    break;
                case 'r':
                    e.preventDefault();
                    this.refreshAllWidgets();
                    break;
                case 'e':
                    e.preventDefault();
                    this.toggleLayoutMode();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.closeAllModals();
        }
    }

    exportWidgetData(widgetId) {
        const widgetData = this.getWidgetData(widgetId);
        if (!widgetData) return;

        const exportData = {
            ...widgetData,
            exportedAt: new Date().toISOString(),
            exportedBy: localStorage.getItem('allKiUserEmail')
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `widget-${widgetData.type}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Widget exportiert', 'success');
    }

    // ========================================
    // UI STATE MANAGEMENT
    // ========================================

    showEmptyState() {
        const placeholder = document.getElementById('addWidgetPlaceholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    }

    hideEmptyState() {
        const placeholder = document.getElementById('addWidgetPlaceholder');
        if (placeholder && this.widgets.size > 0) {
            placeholder.style.display = 'none';
        }
    }

    checkEmptyState() {
        if (this.widgets.size === 0) {
            this.showEmptyState();
        }
    }

    showLoading(message = 'Laden...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('p').textContent = message;
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
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

    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.add('hidden');
        });
        document.body.style.overflow = 'auto';
    }

    // Modal-spezifische Methoden
    closeWidgetSelector() {
        this.closeModal('widgetSelectionModal');
    }

    closeConfigModal() {
        this.closeModal('widgetConfigModal');
    }

    closeDetailsModal() {
        this.closeModal('widgetDetailsModal');
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

    handleLogout() {
        localStorage.clear();
        this.showToast('Erfolgreich abgemeldet!', 'success');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }
}

// Widget Manager global verfügbar machen
let widgetManager;

// Initialisierung wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
    widgetManager = new WidgetManager();
    window.widgetManager = widgetManager; // Für Console-Debugging
});

// Cleanup beim Verlassen der Seite
window.addEventListener('beforeunload', () => {
    if (widgetManager.refreshInterval) {
        clearInterval(widgetManager.refreshInterval);
    }
});