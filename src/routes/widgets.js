/**
 * 🧩 ALL-KI WIDGET ROUTES - MODERN VERSION 2.0
 * Dynamic widget system with real-time data and customization
 * 
 * EINFÜGEN IN: src/routes/widgets.js
 */

const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { requireAuth, requireFeature } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { log } = require('../middleware/logger');

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createWidgetValidation = [
    body('type')
        .isIn(['weather', 'news', 'calendar', 'tasks', 'quotes', 'crypto', 'stocks', 'traffic', 'sports', 'custom'])
        .withMessage('Ungültiger Widget-Typ'),
    
    body('title')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Titel muss zwischen 1 und 100 Zeichen lang sein'),
    
    body('position.x')
        .isInt({ min: 0 })
        .withMessage('X-Position muss eine positive Zahl sein'),
    
    body('position.y')
        .isInt({ min: 0 })
        .withMessage('Y-Position muss eine positive Zahl sein'),
    
    body('size.width')
        .isInt({ min: 1, max: 12 })
        .withMessage('Breite muss zwischen 1 und 12 sein'),
    
    body('size.height')
        .isInt({ min: 1, max: 12 })
        .withMessage('Höhe muss zwischen 1 und 12 sein'),
    
    body('settings')
        .optional()
        .isObject()
        .withMessage('Einstellungen müssen ein Objekt sein')
];

// ========================================
// WIDGET DATA PROVIDERS
// ========================================

class WeatherProvider {
    static async getData(settings = {}) {
        const { city = 'Berlin', units = 'metric' } = settings;
        
        // Mock weather data (replace with real API)
        return {
            location: city,
            temperature: Math.round(Math.random() * 30 + 5),
            condition: ['sunny', 'cloudy', 'rainy', 'stormy'][Math.floor(Math.random() * 4)],
            humidity: Math.round(Math.random() * 100),
            windSpeed: Math.round(Math.random() * 20),
            forecast: Array.from({ length: 5 }, (_, i) => ({
                day: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('de-DE', { weekday: 'short' }),
                high: Math.round(Math.random() * 30 + 5),
                low: Math.round(Math.random() * 20 + 0),
                condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
            })),
            lastUpdated: new Date().toISOString()
        };
    }
}

class NewsProvider {
    static async getData(settings = {}) {
        const { category = 'general', country = 'de', limit = 5 } = settings;
        
        // Mock news data (replace with real API)
        const headlines = [
            'KI-Revolution: Neue Durchbrüche in der Technologie',
            'Nachhaltigkeit: Grüne Energie auf dem Vormarsch',
            'Wirtschaft: Märkte zeigen positive Entwicklung',
            'Wissenschaft: Bahnbrechende Entdeckung angekündigt',
            'Innovation: Startups präsentieren neue Lösungen'
        ];
        
        return {
            articles: Array.from({ length: limit }, (_, i) => ({
                id: i + 1,
                title: headlines[i % headlines.length],
                summary: 'Kurze Zusammenfassung des Artikels mit den wichtigsten Informationen...',
                url: `https://example.com/article-${i + 1}`,
                publishedAt: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
                source: ['TechNews', 'Wirtschaftswoche', 'Spiegel', 'Zeit'][Math.floor(Math.random() * 4)]
            })),
            category,
            lastUpdated: new Date().toISOString()
        };
    }
}

class CryptoProvider {
    static async getData(settings = {}) {
        const { symbols = ['BTC', 'ETH', 'ADA'], currency = 'EUR' } = settings;
        
        // Mock crypto data (replace with real API)
        return {
            currencies: symbols.map(symbol => ({
                symbol,
                name: { BTC: 'Bitcoin', ETH: 'Ethereum', ADA: 'Cardano' }[symbol] || symbol,
                price: Math.round(Math.random() * 50000 + 1000),
                change24h: (Math.random() - 0.5) * 20,
                changePercent24h: (Math.random() - 0.5) * 10,
                volume24h: Math.round(Math.random() * 1000000000),
                marketCap: Math.round(Math.random() * 1000000000000)
            })),
            currency,
            lastUpdated: new Date().toISOString()
        };
    }
}

class QuotesProvider {
    static async getData(settings = {}) {
        const { category = 'motivation', language = 'de' } = settings;
        
        const quotes = {
            de: [
                { text: 'Der Weg ist das Ziel.', author: 'Konfuzius' },
                { text: 'Innovation unterscheidet zwischen einem Führer und einem Nachfolger.', author: 'Steve Jobs' },
                { text: 'Das Leben ist wie Fahrradfahren. Um die Balance zu halten, musst du in Bewegung bleiben.', author: 'Albert Einstein' },
                { text: 'Die Zukunft gehört denen, die an die Schönheit ihrer Träume glauben.', author: 'Eleanor Roosevelt' },
                { text: 'Erfolg ist nicht final, Misserfolg ist nicht fatal: Es ist der Mut weiterzumachen, der zählt.', author: 'Winston Churchill' }
            ],
            en: [
                { text: 'The journey is the destination.', author: 'Confucius' },
                { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
                { text: 'Life is like riding a bicycle. To keep your balance, you must keep moving.', author: 'Albert Einstein' },
                { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
                { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' }
            ]
        };
        
        const availableQuotes = quotes[language] || quotes.de;
        const randomQuote = availableQuotes[Math.floor(Math.random() * availableQuotes.length)];
        
        return {
            quote: randomQuote,
            category,
            language,
            lastUpdated: new Date().toISOString()
        };
    }
}

class TasksProvider {
    static async getData(settings = {}, userId) {
        // Mock tasks data (integrate with real task management)
        return {
            tasks: [
                {
                    id: 1,
                    title: 'Dashboard optimieren',
                    completed: false,
                    priority: 'high',
                    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 2,
                    title: 'Meeting vorbereiten',
                    completed: false,
                    priority: 'medium',
                    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
                },
                {
                    id: 3,
                    title: 'E-Mails beantworten',
                    completed: true,
                    priority: 'low',
                    dueDate: new Date().toISOString()
                }
            ],
            totalTasks: 3,
            completedTasks: 1,
            pendingTasks: 2,
            lastUpdated: new Date().toISOString()
        };
    }
}

// ========================================
// WIDGET FACTORY
// ========================================

class WidgetFactory {
    static async getWidgetData(type, settings, userId) {
        const providers = {
            weather: WeatherProvider,
            news: NewsProvider,
            crypto: CryptoProvider,
            quotes: QuotesProvider,
            tasks: TasksProvider
        };
        
        const provider = providers[type];
        if (!provider) {
            throw new Error(`Unknown widget type: ${type}`);
        }
        
        try {
            return await provider.getData(settings, userId);
        } catch (error) {
            log.error(`Widget data provider error for type ${type}`, error);
            throw new Error('Failed to fetch widget data');
        }
    }
    
    static getWidgetTemplate(type) {
        const templates = {
            weather: {
                title: 'Wetter',
                description: 'Aktuelle Wetterbedingungen und Vorhersage',
                defaultSettings: {
                    city: 'Berlin',
                    units: 'metric',
                    showForecast: true
                },
                size: { width: 4, height: 3 },
                refreshInterval: 300000 // 5 minutes
            },
            news: {
                title: 'Nachrichten',
                description: 'Aktuelle Nachrichten und Headlines',
                defaultSettings: {
                    category: 'general',
                    country: 'de',
                    limit: 5
                },
                size: { width: 6, height: 4 },
                refreshInterval: 600000 // 10 minutes
            },
            crypto: {
                title: 'Kryptowährungen',
                description: 'Aktuelle Kurse und Marktdaten',
                defaultSettings: {
                    symbols: ['BTC', 'ETH', 'ADA'],
                    currency: 'EUR'
                },
                size: { width: 4, height: 3 },
                refreshInterval: 60000 // 1 minute
            },
            quotes: {
                title: 'Zitat des Tages',
                description: 'Inspirierende Zitate und Weisheiten',
                defaultSettings: {
                    category: 'motivation',
                    language: 'de'
                },
                size: { width: 4, height: 2 },
                refreshInterval: 3600000 // 1 hour
            },
            tasks: {
                title: 'Aufgaben',
                description: 'Ihre aktuellen Aufgaben und To-dos',
                defaultSettings: {
                    showCompleted: false,
                    sortBy: 'dueDate'
                },
                size: { width: 4, height: 4 },
                refreshInterval: 300000 // 5 minutes
            }
        };
        
        return templates[type] || null;
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validierungsfehler',
            details: errors.array()
        });
    }
    next();
};

// ========================================
// ROUTES
// ========================================

// Get All User Widgets
router.get('/', asyncHandler(async (req, res) => {
    try {
        // Mock user widgets (replace with database)
        const widgets = [
            {
                id: '1',
                type: 'weather',
                title: 'Wetter Berlin',
                position: { x: 0, y: 0 },
                size: { width: 4, height: 3 },
                settings: { city: 'Berlin', units: 'metric' },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '2',
                type: 'news',
                title: 'Aktuelle Nachrichten',
                position: { x: 4, y: 0 },
                size: { width: 6, height: 4 },
                settings: { category: 'technology', limit: 5 },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: '3',
                type: 'crypto',
                title: 'Krypto-Kurse',
                position: { x: 0, y: 3 },
                size: { width: 4, height: 3 },
                settings: { symbols: ['BTC', 'ETH', 'ADA'] },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        
        res.json({
            success: true,
            widgets,
            total: widgets.length
        });
        
    } catch (error) {
        log.error('Get widgets error', error, { userId: req.user.id });
        throw error;
    }
}));

// Get Widget Data
router.get('/:id/data', param('id').notEmpty(), asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock widget lookup (replace with database)
        const widget = {
            id,
            type: 'weather',
            settings: { city: 'Berlin', units: 'metric' }
        };
        
        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget nicht gefunden'
            });
        }
        
        const data = await WidgetFactory.getWidgetData(widget.type, widget.settings, req.user.id);
        
        res.json({
            success: true,
            widget: {
                id: widget.id,
                type: widget.type,
                data,
                lastUpdated: new Date().toISOString()
            }
        });
        
    } catch (error) {
        log.error('Get widget data error', error, { 
            userId: req.user.id, 
            widgetId: req.params.id 
        });
        
        res.status(500).json({
            success: false,
            error: 'Fehler beim Laden der Widget-Daten'
        });
    }
}));

// Create New Widget
router.post('/', requireFeature('widgets'), createWidgetValidation, handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { type, title, position, size, settings } = req.body;
        
        // Get widget template
        const template = WidgetFactory.getWidgetTemplate(type);
        if (!template) {
            return res.status(400).json({
                success: false,
                error: 'Unbekannter Widget-Typ'
            });
        }
        
        // Create widget (mock - replace with database)
        const widget = {
            id: Date.now().toString(),
            type,
            title: title || template.title,
            position,
            size: size || template.size,
            settings: { ...template.defaultSettings, ...settings },
            isActive: true,
            refreshInterval: template.refreshInterval,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: req.user.id
        };
        
        log.info('Widget created', {
            userId: req.user.id,
            widgetId: widget.id,
            widgetType: type
        });
        
        res.status(201).json({
            success: true,
            message: 'Widget erfolgreich erstellt',
            widget
        });
        
    } catch (error) {
        log.error('Create widget error', error, { userId: req.user.id });
        throw error;
    }
}));

// Update Widget
router.put('/:id', param('id').notEmpty(), asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { title, position, size, settings, isActive } = req.body;
        
        // Mock widget update (replace with database)
        const widget = {
            id,
            type: 'weather',
            title: title || 'Wetter Berlin',
            position: position || { x: 0, y: 0 },
            size: size || { width: 4, height: 3 },
            settings: settings || { city: 'Berlin' },
            isActive: isActive !== undefined ? isActive : true,
            updatedAt: new Date()
        };
        
        log.info('Widget updated', {
            userId: req.user.id,
            widgetId: id
        });
        
        res.json({
            success: true,
            message: 'Widget erfolgreich aktualisiert',
            widget
        });
        
    } catch (error) {
        log.error('Update widget error', error, { 
            userId: req.user.id, 
            widgetId: req.params.id 
        });
        throw error;
    }
}));

// Delete Widget
router.delete('/:id', param('id').notEmpty(), asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock widget deletion (replace with database)
        log.info('Widget deleted', {
            userId: req.user.id,
            widgetId: id
        });
        
        res.json({
            success: true,
            message: 'Widget erfolgreich gelöscht'
        });
        
    } catch (error) {
        log.error('Delete widget error', error, { 
            userId: req.user.id, 
            widgetId: req.params.id 
        });
        throw error;
    }
}));

// Get Available Widget Types
router.get('/types', (req, res) => {
    const types = [
        {
            id: 'weather',
            name: 'Wetter',
            description: 'Aktuelle Wetterbedingungen und Vorhersage',
            icon: '🌤️',
            category: 'information',
            template: WidgetFactory.getWidgetTemplate('weather')
        },
        {
            id: 'news',
            name: 'Nachrichten',
            description: 'Aktuelle Nachrichten und Headlines',
            icon: '📰',
            category: 'information',
            template: WidgetFactory.getWidgetTemplate('news')
        },
        {
            id: 'crypto',
            name: 'Kryptowährungen',
            description: 'Aktuelle Kurse und Marktdaten',
            icon: '₿',
            category: 'finance',
            template: WidgetFactory.getWidgetTemplate('crypto')
        },
        {
            id: 'quotes',
            name: 'Zitate',
            description: 'Inspirierende Zitate und Weisheiten',
            icon: '💭',
            category: 'lifestyle',
            template: WidgetFactory.getWidgetTemplate('quotes')
        },
        {
            id: 'tasks',
            name: 'Aufgaben',
            description: 'Ihre aktuellen Aufgaben und To-dos',
            icon: '✅',
            category: 'productivity',
            template: WidgetFactory.getWidgetTemplate('tasks')
        },
        {
            id: 'calendar',
            name: 'Kalender',
            description: 'Anstehende Termine und Ereignisse',
            icon: '📅',
            category: 'productivity',
            template: {
                title: 'Kalender',
                size: { width: 6, height: 4 },
                refreshInterval: 300000
            }
        },
        {
            id: 'stocks',
            name: 'Aktien',
            description: 'Aktienkurse und Marktdaten',
            icon: '📈',
            category: 'finance',
            template: {
                title: 'Aktien',
                size: { width: 4, height: 3 },
                refreshInterval: 60000
            }
        },
        {
            id: 'traffic',
            name: 'Verkehr',
            description: 'Aktuelle Verkehrslage und Routen',
            icon: '🚗',
            category: 'information',
            template: {
                title: 'Verkehr',
                size: { width: 4, height: 3 },
                refreshInterval: 300000
            }
        }
    ];
    
    res.json({
        success: true,
        types,
        categories: [
            { id: 'information', name: 'Information', icon: 'ℹ️' },
            { id: 'productivity', name: 'Produktivität', icon: '⚡' },
            { id: 'finance', name: 'Finanzen', icon: '💰' },
            { id: 'lifestyle', name: 'Lifestyle', icon: '🌟' }
        ]
    });
});

// Update Widget Layout (Bulk Update)
router.put('/layout', body('widgets').isArray(), asyncHandler(async (req, res) => {
    try {
        const { widgets } = req.body;
        
        // Mock layout update (replace with database transaction)
        const updatedWidgets = widgets.map(widget => ({
            ...widget,
            updatedAt: new Date()
        }));
        
        log.info('Widget layout updated', {
            userId: req.user.id,
            widgetCount: widgets.length
        });
        
        res.json({
            success: true,
            message: 'Layout erfolgreich gespeichert',
            widgets: updatedWidgets
        });
        
    } catch (error) {
        log.error('Update widget layout error', error, { userId: req.user.id });
        throw error;
    }
}));

// Refresh Widget Data
router.post('/:id/refresh', param('id').notEmpty(), asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock widget lookup and refresh
        const widget = {
            id,
            type: 'weather',
            settings: { city: 'Berlin' }
        };
        
        const data = await WidgetFactory.getWidgetData(widget.type, widget.settings, req.user.id);
        
        res.json({
            success: true,
            message: 'Widget-Daten aktualisiert',
            data,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (error) {
        log.error('Refresh widget error', error, { 
            userId: req.user.id, 
            widgetId: req.params.id 
        });
        throw error;
    }
}));

// Export Widget Configuration
router.get('/export', asyncHandler(async (req, res) => {
    try {
        // Mock widget export (replace with database)
        const widgetConfig = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            widgets: [
                {
                    type: 'weather',
                    title: 'Wetter',
                    position: { x: 0, y: 0 },
                    size: { width: 4, height: 3 },
                    settings: { city: 'Berlin' }
                }
            ]
        };
        
        res.json({
            success: true,
            config: widgetConfig
        });
        
    } catch (error) {
        log.error('Export widgets error', error, { userId: req.user.id });
        throw error;
    }
}));

// Import Widget Configuration
router.post('/import', body('config').isObject(), asyncHandler(async (req, res) => {
    try {
        const { config } = req.body;
        
        if (!config.widgets || !Array.isArray(config.widgets)) {
            return res.status(400).json({
                success: false,
                error: 'Ungültige Widget-Konfiguration'
            });
        }
        
        // Mock widget import (replace with database)
        const importedWidgets = config.widgets.map((widget, index) => ({
            ...widget,
            id: (Date.now() + index).toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: req.user.id
        }));
        
        log.info('Widgets imported', {
            userId: req.user.id,
            widgetCount: importedWidgets.length
        });
        
        res.json({
            success: true,
            message: `${importedWidgets.length} Widgets erfolgreich importiert`,
            widgets: importedWidgets
        });
        
    } catch (error) {
        log.error('Import widgets error', error, { userId: req.user.id });
        throw error;
    }
}));

module.exports = router;