const express = require('express');
const router = express.Router();
const openaiService = require('../services/openai');

// Quick Chat Route
router.post('/quick', async (req, res) => {
    try {
        const { message, userContext } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Nachricht ist erforderlich'
            });
        }

        console.log('Quick Chat Request:', { message: message.substring(0, 100) + '...' });

        const response = await openaiService.quickChat(message, userContext || {});

        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Quick Chat Error:', error);
        
        // Fallback response if OpenAI fails
        const fallbackResponses = [
            "Entschuldigung, ich habe gerade technische Schwierigkeiten. Können Sie Ihre Frage später nochmal stellen?",
            "Es tut mir leid, aber ich kann momentan nicht antworten. Bitte versuchen Sie es in einem Moment erneut.",
            "Ich habe Probleme beim Verarbeiten Ihrer Anfrage. Bitte haben Sie einen Moment Geduld."
        ];
        
        const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        
        res.json({
            success: true,
            response: fallbackResponse,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Profile Interview Route
router.post('/profile-interview', async (req, res) => {
    try {
        const { message, conversationHistory, profileData } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Nachricht ist erforderlich'
            });
        }

        console.log('Profile Interview Request:', { 
            message: message.substring(0, 50) + '...', 
            historyLength: conversationHistory?.length || 0 
        });

        const response = await openaiService.profileInterview(
            message, 
            conversationHistory || [], 
            profileData || {}
        );

        // Check if interview is complete (simple heuristic)
        const isComplete = response.toLowerCase().includes('genug informationen') || 
                          response.toLowerCase().includes('interview abgeschlossen') ||
                          (conversationHistory?.length || 0) >= 8;

        res.json({
            success: true,
            response: response,
            isComplete: isComplete,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Profile Interview Error:', error);
        
        const fallbackResponse = "Das ist interessant! Erzählen Sie mir mehr darüber. Was sind Ihre Hauptziele in diesem Bereich?";
        
        res.json({
            success: true,
            response: fallbackResponse,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Extract Profile Data Route
router.post('/extract-profile', async (req, res) => {
    try {
        const { conversationHistory } = req.body;

        if (!conversationHistory || !Array.isArray(conversationHistory) || conversationHistory.length === 0) {
            return res.status(400).json({
                error: 'Gesprächsverlauf ist erforderlich'
            });
        }

        console.log('Extract Profile Request:', { historyLength: conversationHistory.length });

        const profileData = await openaiService.extractProfileData(conversationHistory);

        res.json({
            success: true,
            profileData: profileData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Extract Profile Error:', error);
        
        // Fallback profile data
        const fallbackProfile = {
            name: "Neues Profil",
            category: "Allgemein",
            goals: ["Unterstützung erhalten"],
            preferences: ["Personalisierte Hilfe"],
            challenges: [],
            frequency: "Regelmäßig",
            experience: "Anfänger",
            notes: "Automatisch erstellt"
        };
        
        res.json({
            success: true,
            profileData: fallbackProfile,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Contextual Chat Route (for profile-specific chats)
router.post('/contextual', async (req, res) => {
    try {
        const { message, profileData, conversationHistory } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Nachricht ist erforderlich'
            });
        }

        console.log('Contextual Chat Request:', { 
            message: message.substring(0, 50) + '...', 
            profile: profileData?.name || 'Unbekannt',
            historyLength: conversationHistory?.length || 0
        });

        const response = await openaiService.contextualChat(
            message, 
            profileData || {}, 
            conversationHistory || []
        );

        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Contextual Chat Error:', error);
        
        const fallbackResponse = "Ich verstehe Ihre Frage. Leider habe ich gerade technische Probleme. Können Sie es nochmal versuchen?";
        
        res.json({
            success: true,
            response: fallbackResponse,
            fallback: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Test OpenAI Connection
router.get('/test', async (req, res) => {
    try {
        const result = await openaiService.testConnection();
        
        res.json({
            success: result.success,
            message: result.success ? 'OpenAI Verbindung erfolgreich!' : 'OpenAI Verbindung fehlgeschlagen',
            details: result.success ? result.response : result.error,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test Connection Error:', error);
        res.status(500).json({
            success: false,
            message: 'Verbindungstest fehlgeschlagen',
            error: error.message
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Chat API läuft',
        openai: !!process.env.OPENAI_API_KEY,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;