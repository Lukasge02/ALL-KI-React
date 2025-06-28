/**
 * 🧩 WIDGET ROUTES VEREINFACHT (OHNE EXPRESS-VALIDATOR)
 * ERSETZEN IN: src/routes/widgets.js
 */

const express = require('express');
const router = express.Router();

console.log('✅ Widget routes: Setting up routes...');

// Mock Data für Widgets
const widgets = [
    {
        id: 1,
        name: 'Wetter Widget',
        type: 'weather',
        description: 'Zeigt aktuelle Wetterinformationen an',
        isActive: true,
        position: { x: 0, y: 0 },
        size: { width: 2, height: 2 }
    },
    {
        id: 2,
        name: 'Todo Widget',
        type: 'todo',
        description: 'Verwaltet Ihre Aufgaben',
        isActive: true,
        position: { x: 2, y: 0 },
        size: { width: 2, height: 3 }
    },
    {
        id: 3,
        name: 'Kalender Widget',
        type: 'calendar',
        description: 'Zeigt kommende Termine an',
        isActive: true,
        position: { x: 0, y: 2 },
        size: { width: 3, height: 2 }
    }
];

// ========================================
// WIDGET ROUTES
// ========================================

// GET /api/widgets - Alle Widgets abrufen
router.get('/', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        console.log(`📊 Getting widgets for user: ${userEmail}`);
        
        // Hier würden normalerweise benutzer-spezifische Widgets aus der DB geholt
        const activeWidgets = widgets.filter(w => w.isActive);
        
        res.json({
            success: true,
            widgets: activeWidgets,
            total: activeWidgets.length,
            user: userEmail
        });
    } catch (error) {
        console.error('Get Widgets Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/widgets/:id - Einzelnes Widget abrufen
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const widgetId = parseInt(id);
        
        if (isNaN(widgetId)) {
            return res.status(400).json({ error: 'Ungültige Widget-ID' });
        }
        
        const widget = widgets.find(w => w.id === widgetId && w.isActive);
        
        if (!widget) {
            return res.status(404).json({ error: 'Widget nicht gefunden' });
        }
        
        res.json({
            success: true,
            widget: widget
        });
    } catch (error) {
        console.error('Get Widget Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/widgets - Neues Widget erstellen
router.post('/', async (req, res) => {
    try {
        const { name, type, description, position, size } = req.body;
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        // Simple Validation
        if (!name || !type) {
            return res.status(400).json({ error: 'Name und Typ sind erforderlich' });
        }
        
        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'Name muss zwischen 2-100 Zeichen haben' });
        }
        
        const validTypes = ['weather', 'todo', 'calendar', 'news', 'notes', 'chat', 'profile'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Ungültiger Widget-Typ' });
        }
        
        // Neues Widget erstellen
        const newWidget = {
            id: Math.max(...widgets.map(w => w.id)) + 1,
            name: name.trim(),
            type: type,
            description: description || '',
            isActive: true,
            position: position || { x: 0, y: 0 },
            size: size || { width: 2, height: 2 },
            createdAt: new Date(),
            user: userEmail
        };
        
        // Widget zum Array hinzufügen (in echter App: zur DB)
        widgets.push(newWidget);
        
        console.log(`✅ Widget created: ${name} (${type}) for user ${userEmail}`);
        
        res.status(201).json({
            success: true,
            message: 'Widget erfolgreich erstellt',
            widget: newWidget
        });
        
    } catch (error) {
        console.error('Create Widget Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/widgets/:id - Widget aktualisieren
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, position, size, isActive } = req.body;
        const widgetId = parseInt(id);
        
        if (isNaN(widgetId)) {
            return res.status(400).json({ error: 'Ungültige Widget-ID' });
        }
        
        const widgetIndex = widgets.findIndex(w => w.id === widgetId);
        
        if (widgetIndex === -1) {
            return res.status(404).json({ error: 'Widget nicht gefunden' });
        }
        
        // Widget aktualisieren
        const widget = widgets[widgetIndex];
        
        if (name) widget.name = name.trim();
        if (description !== undefined) widget.description = description;
        if (position) widget.position = position;
        if (size) widget.size = size;
        if (isActive !== undefined) widget.isActive = isActive;
        
        widget.updatedAt = new Date();
        
        res.json({
            success: true,
            message: 'Widget aktualisiert',
            widget: widget
        });
        
    } catch (error) {
        console.error('Update Widget Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/widgets/:id - Widget löschen
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const widgetId = parseInt(id);
        
        if (isNaN(widgetId)) {
            return res.status(400).json({ error: 'Ungültige Widget-ID' });
        }
        
        const widgetIndex = widgets.findIndex(w => w.id === widgetId);
        
        if (widgetIndex === -1) {
            return res.status(404).json({ error: 'Widget nicht gefunden' });
        }
        
        // Soft delete: isActive auf false setzen
        widgets[widgetIndex].isActive = false;
        widgets[widgetIndex].deletedAt = new Date();
        
        res.json({
            success: true,
            message: 'Widget gelöscht'
        });
        
    } catch (error) {
        console.error('Delete Widget Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/widgets/types - Verfügbare Widget-Typen
router.get('/meta/types', (req, res) => {
    const widgetTypes = [
        { type: 'weather', name: 'Wetter', description: 'Aktuelle Wetterinformationen' },
        { type: 'todo', name: 'Aufgaben', description: 'Todo-Liste verwalten' },
        { type: 'calendar', name: 'Kalender', description: 'Termine und Events' },
        { type: 'news', name: 'Nachrichten', description: 'Aktuelle Nachrichten' },
        { type: 'notes', name: 'Notizen', description: 'Schnelle Notizen' },
        { type: 'chat', name: 'Chat', description: 'KI-Chat Interface' },
        { type: 'profile', name: 'Profile', description: 'KI-Profile verwalten' }
    ];
    
    res.json({
        success: true,
        types: widgetTypes
    });
});

console.log('✅ Widget routes: All routes configured');

module.exports = router;