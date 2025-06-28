/**
 * 🧩 WIDGETS ROUTES - DATABASE VERSION
 * ERSETZE KOMPLETT: src/routes/widgets.js
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Widget = require('../models/Widget');
const { getUserFromToken } = require('../middleware/auth');

const router = express.Router();

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

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ========================================
// ROUTES - ECHTE DATABASE CALLS
// ========================================

// Get All User Widgets
router.get('/', getUserFromToken, asyncHandler(async (req, res) => {
    try {
        const widgets = await Widget.findActiveByUser(req.user._id);

        res.json({
            success: true,
            widgets: widgets,
            count: widgets.length
        });

    } catch (error) {
        console.error('Get User Widgets Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Laden der Widgets'
        });
    }
}));

// Create New Widget
router.post('/', getUserFromToken, [
    body('type')
        .optional()
        .isIn(['custom', 'weather', 'news', 'calendar', 'tasks', 'notes', 'ai_chat'])
        .withMessage('Ungültiger Widget-Typ'),
    body('title')
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Titel ist erforderlich (max 100 Zeichen)'),
    body('question')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Frage zu lang (max 500 Zeichen)')
], handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { type, title, question, position, size, settings } = req.body;

        // OpenAI Response generieren wenn Frage vorhanden
        let response = null;
        if (question && question.trim()) {
            try {
                const openaiService = require('../services/openai');
                response = await openaiService.quickChat(question.trim());
            } catch (aiError) {
                console.warn('OpenAI failed, using fallback:', aiError.message);
                response = "KI-Service temporär nicht verfügbar. Bitte versuchen Sie es später erneut.";
            }
        }

        const widget = new Widget({
            userId: req.user._id,
            type: type || 'custom',
            title: title,
            question: question || null,
            response: response,
            position: position || { x: 0, y: 0 },
            size: size || { width: 4, height: 3 },
            settings: settings || {}
        });

        await widget.save();

        console.log('Widget created successfully:', widget._id);

        res.status(201).json({
            success: true,
            message: 'Widget erfolgreich erstellt',
            widget: widget
        });

    } catch (error) {
        console.error('Create Widget Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Erstellen des Widgets'
        });
    }
}));

// Update Widget
router.put('/:id', getUserFromToken, [
    param('id').isMongoId().withMessage('Ungültige Widget-ID'),
    body('title').optional().isLength({ max: 100 }).withMessage('Titel zu lang'),
    body('question').optional().isLength({ max: 500 }).withMessage('Frage zu lang')
], handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Neue AI Response generieren wenn Frage geändert wurde
        if (updates.question && updates.question.trim()) {
            try {
                const openaiService = require('../services/openai');
                updates.response = await openaiService.quickChat(updates.question.trim());
            } catch (aiError) {
                console.warn('OpenAI failed during update:', aiError.message);
                updates.response = "KI-Service temporär nicht verfügbar.";
            }
        }

        const widget = await Widget.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget nicht gefunden'
            });
        }

        console.log('Widget updated successfully:', widget._id);

        res.json({
            success: true,
            message: 'Widget erfolgreich aktualisiert',
            widget: widget
        });

    } catch (error) {
        console.error('Update Widget Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Aktualisieren des Widgets'
        });
    }
}));

// Delete Widget (Soft Delete)
router.delete('/:id', getUserFromToken, [
    param('id').isMongoId().withMessage('Ungültige Widget-ID')
], handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const widget = await Widget.findOneAndUpdate(
            { _id: id, userId: req.user._id },
            { $set: { isActive: false } },
            { new: true }
        );

        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget nicht gefunden'
            });
        }

        console.log('Widget deleted successfully:', widget._id);

        res.json({
            success: true,
            message: 'Widget erfolgreich gelöscht'
        });

    } catch (error) {
        console.error('Delete Widget Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Löschen des Widgets'
        });
    }
}));

// Get Widget by ID
router.get('/:id', getUserFromToken, [
    param('id').isMongoId().withMessage('Ungültige Widget-ID')
], handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const widget = await Widget.findOne({
            _id: id,
            userId: req.user._id,
            isActive: true
        });

        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget nicht gefunden'
            });
        }

        res.json({
            success: true,
            widget: widget
        });

    } catch (error) {
        console.error('Get Widget Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Laden des Widgets'
        });
    }
}));

// Refresh Widget (Re-generate AI response)
router.post('/:id/refresh', getUserFromToken, [
    param('id').isMongoId().withMessage('Ungültige Widget-ID')
], handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        const widget = await Widget.findOne({
            _id: id,
            userId: req.user._id,
            isActive: true
        });

        if (!widget) {
            return res.status(404).json({
                success: false,
                error: 'Widget nicht gefunden'
            });
        }

        if (!widget.question) {
            return res.status(400).json({
                success: false,
                error: 'Widget hat keine Frage zum Aktualisieren'
            });
        }

        // Neue AI Response generieren
        try {
            const openaiService = require('../services/openai');
            const newResponse = await openaiService.quickChat(widget.question);
            
            await widget.updateResponse(newResponse);

            res.json({
                success: true,
                message: 'Widget erfolgreich aktualisiert',
                widget: widget
            });

        } catch (aiError) {
            console.warn('OpenAI failed during refresh:', aiError.message);
            
            res.json({
                success: false,
                error: 'KI-Service temporär nicht verfügbar',
                fallback: true
            });
        }

    } catch (error) {
        console.error('Refresh Widget Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Aktualisieren des Widgets'
        });
    }
}));

// Bulk Update Widget Positions (für Drag & Drop)
router.put('/positions/bulk', getUserFromToken, [
    body('widgets').isArray().withMessage('Widgets-Array erforderlich'),
    body('widgets.*.id').isMongoId().withMessage('Ungültige Widget-ID'),
    body('widgets.*.position.x').isNumeric().withMessage('X-Position muss numerisch sein'),
    body('widgets.*.position.y').isNumeric().withMessage('Y-Position muss numerisch sein')
], handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const { widgets } = req.body;
        
        const updates = widgets.map(async (widgetUpdate) => {
            return Widget.findOneAndUpdate(
                { 
                    _id: widgetUpdate.id, 
                    userId: req.user._id 
                },
                { 
                    $set: { 
                        'position.x': widgetUpdate.position.x,
                        'position.y': widgetUpdate.position.y
                    }
                },
                { new: true }
            );
        });

        const updatedWidgets = await Promise.all(updates);

        res.json({
            success: true,
            message: 'Widget-Positionen erfolgreich aktualisiert',
            widgets: updatedWidgets.filter(widget => widget !== null)
        });

    } catch (error) {
        console.error('Bulk Update Widget Positions Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Aktualisieren der Widget-Positionen'
        });
    }
}));

// Get Widget Templates/Categories  
router.get('/templates/available', getUserFromToken, asyncHandler(async (req, res) => {
    try {
        const templates = [
            {
                id: 'weather',
                name: 'Wetter',
                icon: '🌤️',
                description: 'Aktuelle Wetterinformationen',
                defaultQuestion: 'Wie ist das Wetter heute in Berlin?'
            },
            {
                id: 'news',
                name: 'Nachrichten',
                icon: '📰',
                description: 'Aktuelle Nachrichten und Updates',
                defaultQuestion: 'Was sind die wichtigsten Nachrichten heute?'
            },
            {
                id: 'tasks',
                name: 'Aufgaben',
                icon: '✅',
                description: 'To-Do Liste und Aufgaben',
                defaultQuestion: 'Erstelle mir eine To-Do Liste für heute.'
            },
            {
                id: 'calendar',
                name: 'Kalender',
                icon: '📅',
                description: 'Termine und Events',
                defaultQuestion: 'Was steht heute in meinem Kalender?'
            },
            {
                id: 'ai_chat',
                name: 'KI Chat',
                icon: '🤖',
                description: 'Freie KI-Unterhaltung',
                defaultQuestion: 'Hallo! Wie kann ich dir heute helfen?'
            }
        ];

        res.json({
            success: true,
            templates: templates
        });

    } catch (error) {
        console.error('Get Widget Templates Error:', error);
        res.status(500).json({
            success: false,
            error: 'Fehler beim Laden der Widget-Vorlagen'
        });
    }
}));

module.exports = router;