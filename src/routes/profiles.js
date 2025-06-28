/**
 * 👤 PROFILE ROUTES VEREINFACHT (OHNE MULTER)
 * ERSETZEN IN: src/routes/profiles.js
 */

const express = require('express');
const router = express.Router();

console.log('✅ Profile routes: Basic setup complete');

// Models importieren
console.log('✅ Profile routes: mongoose imported');
const mongoose = require('mongoose');

let Profile, User, Chat, openaiService;

try {
    Profile = require('../models/Profile');
    console.log('✅ Profile routes: Profile model imported');
    
    User = require('../models/User');
    console.log('✅ Profile routes: User model imported');
    
    openaiService = require('../services/openai');
    console.log('✅ Profile routes: OpenAI service imported');
    
    Chat = require('../models/Chat');
    console.log('✅ Profile routes: Chat model imported');
    
} catch (error) {
    console.error('❌ Profile routes: Error importing dependencies:', error.message);
}

// ========================================
// SIMPLE VALIDATION
// ========================================

const validateObjectId = (id) => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ========================================
// ROUTES
// ========================================

// GET /api/profiles - Alle Profile eines Users
router.get('/', async (req, res) => {
    try {
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        if (!Profile) {
            return res.status(500).json({ error: 'Profile model nicht verfügbar' });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }

        const profiles = await Profile.find({ userId: user._id, isActive: true })
            .select('name category description personality.tone settings')
            .sort({ createdAt: -1 });

        console.log(`📊 Found ${profiles.length} profiles for user ${userEmail}`);
        
        res.json({
            success: true,
            profiles: profiles,
            total: profiles.length
        });

    } catch (error) {
        console.error('Get Profiles Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/profiles/:id - Einzelnes Profile
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        if (!validateObjectId(id)) {
            return res.status(400).json({ error: 'Ungültige Profile-ID' });
        }
        
        if (!Profile) {
            return res.status(500).json({ error: 'Profile model nicht verfügbar' });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }

        const profile = await Profile.findOne({ 
            _id: id, 
            userId: user._id, 
            isActive: true 
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profile nicht gefunden' });
        }

        res.json({
            success: true,
            profile: profile
        });

    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/profiles - Neues Profile erstellen
router.post('/', async (req, res) => {
    try {
        const { name, category, description } = req.body;
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        // Simple Validation
        if (!name || !category) {
            return res.status(400).json({ error: 'Name und Kategorie sind erforderlich' });
        }

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'Name muss zwischen 2-100 Zeichen haben' });
        }

        const validCategories = [
            'sport', 'fitness', 'gesundheit', 'beruf', 'bildung', 
            'lifestyle', 'persoenlichkeit', 'hobby', 'reisen', 
            'essen', 'technologie', 'familie', 'freunde', 
            'finanzen', 'kreativ', 'allgemein'
        ];

        if (!validCategories.includes(category.toLowerCase())) {
            return res.status(400).json({ error: 'Ungültige Kategorie' });
        }
        
        if (!Profile) {
            return res.status(500).json({ error: 'Profile model nicht verfügbar' });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }

        const newProfile = new Profile({
            userId: user._id,
            name: name.trim(),
            category: category.toLowerCase(),
            description: description || '',
            personality: {
                tone: 'freundlich',
                style: 'detailliert'
            },
            settings: {
                maxTokens: 2000,
                temperature: 0.7,
                includeEmojis: true
            }
        });

        await newProfile.save();

        console.log(`✅ Profile created: ${name} (${category}) for user ${userEmail}`);

        res.status(201).json({
            success: true,
            message: 'Profile erfolgreich erstellt',
            profile: newProfile
        });

    } catch (error) {
        console.error('Create Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/profiles/interview - Profile Interview
router.post('/interview', async (req, res) => {
    try {
        const { message, historyLength = 0 } = req.body;
        const userEmail = req.headers['x-user-email'] || 'test@test.de';

        console.log('Profile Interview Request:', { 
            message: message?.substring(0, 10) + '...', 
            historyLength 
        });

        if (!message) {
            return res.status(400).json({ error: 'Nachricht ist erforderlich' });
        }

        if (!openaiService) {
            // Fallback ohne OpenAI
            const responses = [
                "Das ist interessant! Erzählen Sie mir mehr über Ihre Präferenzen.",
                "Vielen Dank für diese Information. Was ist Ihnen dabei besonders wichtig?",
                "Das hilft mir, Sie besser zu verstehen. Haben Sie weitere Wünsche?",
                "Perfekt! Basierend auf Ihren Antworten erstelle ich ein passendes Profile.",
                "Ausgezeichnet! Ihr personalisiertes Profile ist fast fertig.",
                "Vielen Dank! Ihr Profile wurde erfolgreich erstellt."
            ];
            
            const response = responses[historyLength] || responses[responses.length - 1];
            
            return res.json({
                success: true,
                response: response,
                completed: historyLength >= 5
            });
        }

        // Mit OpenAI
        const response = await openaiService.generateResponse(
            `Du hilfst beim Erstellen eines KI-Profils. Frage: ${message}`,
            { maxTokens: 1000 }
        );

        res.json({
            success: true,
            response: response,
            completed: historyLength >= 6
        });

    } catch (error) {
        console.error('Profile Interview Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/profiles/quick-chat - Schneller Chat
router.post('/quick-chat', async (req, res) => {
    try {
        const { message } = req.body;

        console.log('Quick Chat Request:', { 
            message: message?.substring(0, 10) + '...' 
        });

        if (!message) {
            return res.status(400).json({ error: 'Nachricht ist erforderlich' });
        }

        if (!openaiService) {
            // Fallback ohne OpenAI
            return res.json({
                success: true,
                response: "Vielen Dank für Ihre Nachricht! Das OpenAI Service ist momentan nicht verfügbar, aber ich helfe Ihnen gerne weiter."
            });
        }

        const response = await openaiService.generateResponse(message, {
            maxTokens: 1500,
            temperature: 0.7
        });

        res.json({
            success: true,
            response: response
        });

    } catch (error) {
        console.error('Quick Chat Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/profiles/:id - Profile aktualisieren
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description } = req.body;
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        if (!validateObjectId(id)) {
            return res.status(400).json({ error: 'Ungültige Profile-ID' });
        }
        
        if (!Profile) {
            return res.status(500).json({ error: 'Profile model nicht verfügbar' });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (category) updateData.category = category.toLowerCase();
        if (description !== undefined) updateData.description = description;

        const updatedProfile = await Profile.findOneAndUpdate(
            { _id: id, userId: user._id },
            updateData,
            { new: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({ error: 'Profile nicht gefunden' });
        }

        res.json({
            success: true,
            message: 'Profile aktualisiert',
            profile: updatedProfile
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/profiles/:id - Profile löschen
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.headers['x-user-email'] || 'test@test.de';
        
        if (!validateObjectId(id)) {
            return res.status(400).json({ error: 'Ungültige Profile-ID' });
        }
        
        if (!Profile) {
            return res.status(500).json({ error: 'Profile model nicht verfügbar' });
        }

        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(404).json({ error: 'User nicht gefunden' });
        }

        // Soft delete: isActive auf false setzen
        const updatedProfile = await Profile.findOneAndUpdate(
            { _id: id, userId: user._id },
            { isActive: false },
            { new: true }
        );

        if (!updatedProfile) {
            return res.status(404).json({ error: 'Profile nicht gefunden' });
        }

        res.json({
            success: true,
            message: 'Profile gelöscht'
        });

    } catch (error) {
        console.error('Delete Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ Profile routes: All routes and functions defined');

module.exports = router;