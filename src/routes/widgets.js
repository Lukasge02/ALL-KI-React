/**
 * 🧩 WIDGET ROUTES
 * API Endpoints für Widget-Management
 * 
 * SEPARATION OF CONCERNS:
 * - Widget Configuration
 * - Widget Data Management
 * - Layout Management
 * - Widget Templates
 */

const express = require('express');
const router = express.Router();

// Simple middleware for user authentication
const getUserFromToken = (req, res, next) => {
    // TODO: Implement proper JWT token validation
    // For now, mock user for development
    req.user = {
        _id: 'mock-user-id',
        email: 'ravellukas@gmx.de',
        firstName: 'Lukas',
        lastName: 'Geck'
    };
    next();
};

console.log('✅ Widget routes: Setting up routes...');

// ========================================
// WIDGET CONFIGURATION ROUTES
// ========================================

// Get all user widgets
router.get('/', getUserFromToken, async (req, res) => {
    try {
        console.log('🧩 Get user widgets request');
        
        // Mock widgets for development
        const widgets = [
            {
                id: 'widget-1',
                type: 'weather',
                title: 'Wetter',
                position: { x: 0, y: 0, width: 2, height: 2 },
                config: {
                    location: 'Detmold',
                    units: 'metric',
                    autoRefresh: true,
                    refreshInterval: 600000 // 10 minutes
                },
                data: {
                    temperature: 22,
                    condition: 'Sonnig',
                    humidity: 65,
                    windSpeed: 12
                },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'widget-2',
                type: 'calendar',
                title: 'Termine',
                position: { x: 2, y: 0, width: 3, height: 2 },
                config: {
                    showWeekend: true,
                    defaultView: 'week',
                    autoRefresh: true,
                    refreshInterval: 300000 // 5 minutes
                },
                data: {
                    upcomingEvents: [
                        {
                            title: 'Team Meeting',
                            start: new Date(Date.now() + 2 * 60 * 60 * 1000), // in 2 hours
                            duration: 60
                        }
                    ]
                },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                id: 'widget-3',
                type: 'quick-chat',
                title: 'Quick Chat',
                position: { x: 0, y: 2, width: 5, height: 3 },
                config: {
                    maxMessages: 10,
                    showTyping: true,
                    autoSave: true
                },
                data: {
                    recentMessages: []
                },
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        res.json({
            success: true,
            widgets: widgets,
            total: widgets.length
        });

    } catch (error) {
        console.error('Get Widgets Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Widgets' });
    }
});

// Get specific widget
router.get('/:widgetId', getUserFromToken, async (req, res) => {
    try {
        console.log('🧩 Get widget request:', req.params.widgetId);
        
        // Mock widget data
        const widget = {
            id: req.params.widgetId,
            type: 'weather',
            title: 'Wetter Widget',
            position: { x: 0, y: 0, width: 2, height: 2 },
            config: {
                location: 'Detmold',
                units: 'metric',
                autoRefresh: true
            },
            data: {
                temperature: 22,
                condition: 'Sonnig'
            },
            isActive: true
        };

        res.json({
            success: true,
            widget: widget
        });

    } catch (error) {
        console.error('Get Widget Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Widgets' });
    }
});

// Create new widget
router.post('/', getUserFromToken, async (req, res) => {
    try {
        console.log('✨ Create widget request:', req.body);
        
        const { type, title, position, config } = req.body;
        
        if (!type || !title) {
            return res.status(400).json({ error: 'Type und Title sind erforderlich' });
        }

        // Mock widget creation
        const newWidget = {
            id: `widget-${Date.now()}`,
            type: type,
            title: title,
            position: position || { x: 0, y: 0, width: 2, height: 2 },
            config: config || {},
            data: {},
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        res.status(201).json({
            success: true,
            widget: newWidget,
            message: 'Widget erfolgreich erstellt'
        });

    } catch (error) {
        console.error('Create Widget Error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Widgets' });
    }
});

// Update widget
router.put('/:widgetId', getUserFromToken, async (req, res) => {
    try {
        console.log('💾 Update widget request:', req.params.widgetId, req.body);
        
        const { title, position, config, data } = req.body;
        
        // Mock widget update
        const updatedWidget = {
            id: req.params.widgetId,
            title: title || 'Updated Widget',
            position: position || { x: 0, y: 0, width: 2, height: 2 },
            config: config || {},
            data: data || {},
            updatedAt: new Date()
        };

        res.json({
            success: true,
            widget: updatedWidget,
            message: 'Widget erfolgreich aktualisiert'
        });

    } catch (error) {
        console.error('Update Widget Error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Widgets' });
    }
});

// Delete widget
router.delete('/:widgetId', getUserFromToken, async (req, res) => {
    try {
        console.log('🗑️ Delete widget request:', req.params.widgetId);
        
        // Mock widget deletion
        res.json({
            success: true,
            message: 'Widget erfolgreich gelöscht'
        });

    } catch (error) {
        console.error('Delete Widget Error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Widgets' });
    }
});

// ========================================
// WIDGET LAYOUT ROUTES
// ========================================

// Get dashboard layout
router.get('/layout/dashboard', getUserFromToken, async (req, res) => {
    try {
        console.log('📐 Get dashboard layout request');
        
        // Mock layout configuration
        const layout = {
            gridSize: { columns: 12, rows: 10 },
            widgets: [
                { id: 'widget-1', x: 0, y: 0, width: 3, height: 2 },
                { id: 'widget-2', x: 3, y: 0, width: 4, height: 2 },
                { id: 'widget-3', x: 0, y: 2, width: 7, height: 3 }
            ],
            theme: 'dark',
            compact: false,
            autoArrange: false
        };

        res.json({
            success: true,
            layout: layout
        });

    } catch (error) {
        console.error('Get Layout Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Layouts' });
    }
});

// Update dashboard layout
router.put('/layout/dashboard', getUserFromToken, async (req, res) => {
    try {
        console.log('💾 Update dashboard layout request:', req.body);
        
        const { widgets, gridSize, theme, compact } = req.body;
        
        // Mock layout update
        const updatedLayout = {
            gridSize: gridSize || { columns: 12, rows: 10 },
            widgets: widgets || [],
            theme: theme || 'dark',
            compact: compact || false,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            layout: updatedLayout,
            message: 'Layout erfolgreich gespeichert'
        });

    } catch (error) {
        console.error('Update Layout Error:', error);
        res.status(500).json({ error: 'Fehler beim Speichern des Layouts' });
    }
});

// ========================================
// WIDGET TEMPLATES ROUTES
// ========================================

// Get available widget templates
router.get('/templates', (req, res) => {
    try {
        console.log('📝 Get widget templates request');
        
        const templates = [
            {
                id: 'weather-template',
                name: 'Wetter Widget',
                type: 'weather',
                description: 'Zeigt aktuelle Wetterdaten an',
                icon: '🌤️',
                defaultSize: { width: 2, height: 2 },
                configOptions: [
                    { name: 'location', type: 'string', default: 'Detmold' },
                    { name: 'units', type: 'select', options: ['metric', 'imperial'], default: 'metric' }
                ]
            },
            {
                id: 'calendar-template',
                name: 'Kalender Widget',
                type: 'calendar',
                description: 'Zeigt anstehende Termine an',
                icon: '📅',
                defaultSize: { width: 3, height: 2 },
                configOptions: [
                    { name: 'showWeekend', type: 'boolean', default: true },
                    { name: 'defaultView', type: 'select', options: ['day', 'week', 'month'], default: 'week' }
                ]
            },
            {
                id: 'chat-template',
                name: 'Quick Chat Widget',
                type: 'quick-chat',
                description: 'Schneller Chat mit der KI',
                icon: '💬',
                defaultSize: { width: 4, height: 3 },
                configOptions: [
                    { name: 'maxMessages', type: 'number', default: 10 },
                    { name: 'showTyping', type: 'boolean', default: true }
                ]
            }
        ];

        res.json({
            success: true,
            templates: templates
        });

    } catch (error) {
        console.error('Get Templates Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Templates' });
    }
});

// ========================================
// WIDGET DATA ROUTES
// ========================================

// Refresh widget data
router.post('/:widgetId/refresh', getUserFromToken, async (req, res) => {
    try {
        console.log('🔄 Refresh widget data request:', req.params.widgetId);
        
        // Mock data refresh
        const refreshedData = {
            timestamp: new Date(),
            data: {
                temperature: Math.floor(Math.random() * 30) + 10,
                condition: ['Sonnig', 'Bewölkt', 'Regen'][Math.floor(Math.random() * 3)]
            }
        };

        res.json({
            success: true,
            data: refreshedData,
            message: 'Widget-Daten aktualisiert'
        });

    } catch (error) {
        console.error('Refresh Widget Data Error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Widget-Daten' });
    }
});

// ========================================
// DEVELOPMENT/DEBUG ROUTES
// ========================================

// Test route
router.get('/test/ping', (req, res) => {
    res.json({ 
        message: 'Widget routes are working!',
        timestamp: new Date(),
        routes: [
            'GET /api/widgets',
            'GET /api/widgets/:id',
            'POST /api/widgets',
            'PUT /api/widgets/:id',
            'DELETE /api/widgets/:id',
            'GET /api/widgets/layout/dashboard',
            'PUT /api/widgets/layout/dashboard',
            'GET /api/widgets/templates',
            'POST /api/widgets/:id/refresh'
        ]
    });
});

console.log('✅ Widget routes: All routes configured');

module.exports = router;