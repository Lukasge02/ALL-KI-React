const express = require('express');
const router = express.Router();

console.log('✅ Chat routes: Basic setup complete');

// Import dependencies
try {
    const openaiService = require('../services/openai');
    console.log('✅ Chat routes: OpenAI service imported');
} catch (error) {
    console.error('❌ Chat routes: Error importing OpenAI service:', error.message);
}

// Quick Chat Route (for general questions without profile context)
router.post('/quick', async (req, res) => {
    try {
        const { message, userContext } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Nachricht ist erforderlich'
            });
        }

        console.log('Quick Chat Request:', { 
            message: message.substring(0, 50) + '...', 
            user: userContext?.name || 'Anonymous'
        });

        try {
            const openaiService = require('../services/openai');
            const response = await openaiService.quickChat(message, userContext || {});

            res.json({
                success: true,
                response: response,
                timestamp: new Date().toISOString()
            });
        } catch (openaiError) {
            console.error('OpenAI Quick Chat Error:', openaiError);
            
            // Fallback response when OpenAI fails
            const fallbackResponse = "Entschuldigung, ich habe gerade technische Probleme mit der KI. Können Sie Ihre Frage nochmal stellen oder es später versuchen?";
            
            res.json({
                success: true,
                response: fallbackResponse,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Quick Chat Error:', error);
        res.status(500).json({
            error: 'Fehler beim Verarbeiten der Nachricht',
            timestamp: new Date().toISOString()
        });
    }
});

// Profile Interview Route
router.post('/interview', async (req, res) => {
    try {
        const { message, conversationHistory, profileData } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({
                error: 'Nachricht ist erforderlich'
            });
        }

        console.log('Interview Request:', { 
            message: message.substring(0, 50) + '...', 
            historyLength: conversationHistory?.length || 0,
            profileData: profileData ? Object.keys(profileData) : []
        });

        try {
            const openaiService = require('../services/openai');
            const response = await openaiService.profileInterview(
                message,
                conversationHistory || [],
                profileData || {}
            );

            res.json({
                success: true,
                response: response,
                timestamp: new Date().toISOString()
            });
        } catch (openaiError) {
            console.error('OpenAI Interview Error:', openaiError);
            
            // Intelligent fallback based on conversation stage
            let fallbackResponse;
            const historyLength = conversationHistory?.length || 0;
            
            if (historyLength === 0) {
                fallbackResponse = `Perfekt! Ich erstelle ein "${message}" Profil für dich. Erzählen Sie mir mehr darüber. Was sind Ihre Hauptziele in diesem Bereich?`;
            } else if (historyLength < 3) {
                fallbackResponse = "Das ist interessant! Können Sie mir mehr Details dazu geben? Was ist dabei besonders wichtig für Sie?";
            } else {
                fallbackResponse = "Vielen Dank für diese Informationen! Haben Sie noch weitere Aspekte, die wichtig für Ihr Profil sind?";
            }
            
            res.json({
                success: true,
                response: fallbackResponse,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Interview Error:', error);
        res.status(500).json({
            error: 'Fehler beim Interview-Prozess',
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

        console.log('Extract Profile Request:', { 
            historyLength: conversationHistory.length,
            firstMessage: conversationHistory[0]?.content?.substring(0, 30) + '...'
        });

        try {
            const openaiService = require('../services/openai');
            const profileData = await openaiService.extractProfileData(conversationHistory);

            res.json({
                success: true,
                profileData: profileData,
                timestamp: new Date().toISOString()
            });
        } catch (openaiError) {
            console.error('OpenAI Extract Profile Error:', openaiError);
            
            // Fallback profile data extraction
            const firstUserMessage = conversationHistory.find(msg => msg.role === 'user');
            const profileName = firstUserMessage ? firstUserMessage.content.substring(0, 50) : 'Neues Profil';
            
            const fallbackProfile = {
                name: profileName,
                category: "general",
                goals: ["Unterstützung erhalten"],
                preferences: ["Personalisierte Hilfe"],
                challenges: [],
                frequency: "woechentlich",
                experience: "anfaenger",
                notes: "Automatisch erstellt - KI-Extraktion fehlgeschlagen"
            };
            
            res.json({
                success: true,
                profileData: fallbackProfile,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Extract Profile Error:', error);
        res.status(500).json({
            error: 'Fehler beim Extrahieren der Profildaten',
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

        try {
            const openaiService = require('../services/openai');
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
        } catch (openaiError) {
            console.error('OpenAI Contextual Chat Error:', openaiError);
            
            // Contextual fallback based on profile
            let fallbackResponse;
            if (profileData?.category === 'sport') {
                fallbackResponse = "Ich verstehe Ihre Frage zum Thema Sport. Leider habe ich gerade technische Probleme, aber ich bin hier um Ihnen bei Ihren Fitnesszielen zu helfen. Können Sie es nochmal versuchen?";
            } else if (profileData?.category === 'kochen') {
                fallbackResponse = "Ihre Kochfrage ist interessant! Leider habe ich gerade technische Probleme. Ich helfe gerne bei Rezepten und Kochtipps - versuchen Sie es nochmal.";
            } else {
                fallbackResponse = "Ich verstehe Ihre Frage. Leider habe ich gerade technische Probleme mit der KI-Verbindung. Können Sie es nochmal versuchen?";
            }
            
            res.json({
                success: true,
                response: fallbackResponse,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Contextual Chat Error:', error);
        res.status(500).json({
            error: 'Fehler beim kontextuellen Chat',
            timestamp: new Date().toISOString()
        });
    }
});

// Generate Suggestions Route
router.post('/suggestions', async (req, res) => {
    try {
        const { profileData, context } = req.body;

        if (!profileData || typeof profileData !== 'object') {
            return res.status(400).json({
                error: 'Profildaten sind erforderlich'
            });
        }

        console.log('Suggestions Request:', { 
            profile: profileData.name || 'Unbekannt',
            category: profileData.category || 'general',
            context: context || 'general'
        });

        try {
            const openaiService = require('../services/openai');
            const suggestions = await openaiService.generateSuggestions(
                profileData,
                context || 'general'
            );

            res.json({
                success: true,
                suggestions: suggestions,
                timestamp: new Date().toISOString()
            });
        } catch (openaiError) {
            console.error('OpenAI Suggestions Error:', openaiError);
            
            // Fallback suggestions based on category
            const fallbackSuggestions = this.getFallbackSuggestionsByCategory(profileData.category);
            
            res.json({
                success: true,
                suggestions: fallbackSuggestions,
                fallback: true,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error('Suggestions Error:', error);
        res.status(500).json({
            error: 'Fehler beim Generieren von Vorschlägen',
            timestamp: new Date().toISOString()
        });
    }
});

// Test OpenAI Connection
router.get('/test', async (req, res) => {
    try {
        const openaiService = require('../services/openai');
        const result = await openaiService.testConnection();
        
        res.json({
            success: result.success,
            message: result.success ? 'OpenAI Verbindung erfolgreich!' : 'OpenAI Verbindung fehlgeschlagen',
            details: result.success ? result.response : result.error,
            apiStatus: openaiService.getStatus(),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test Connection Error:', error);
        res.status(500).json({
            success: false,
            message: 'Verbindungstest fehlgeschlagen',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Health check route
router.get('/health', (req, res) => {
    try {
        const openaiService = require('../services/openai');
        const status = openaiService.getStatus();
        
        res.json({
            success: true,
            message: 'Chat API läuft',
            openai: status,
            environment: {
                nodeEnv: process.env.NODE_ENV || 'development',
                hasOpenAiKey: !!process.env.OPENAI_API_KEY
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health Check Error:', error);
        res.status(500).json({
            success: false,
            message: 'Chat API Health Check fehlgeschlagen',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Service status route
router.get('/status', async (req, res) => {
    try {
        const openaiService = require('../services/openai');
        const serviceStatus = openaiService.getStatus();
        
        // Test connection if configured
        let connectionTest = { success: false, error: 'Not configured' };
        if (serviceStatus.configured) {
            connectionTest = await openaiService.testConnection();
        }
        
        res.json({
            service: {
                name: 'OpenAI Chat Service',
                version: '1.0.0',
                status: serviceStatus.configured ? 'configured' : 'not_configured'
            },
            configuration: {
                apiKeyPresent: serviceStatus.apiKeyPresent,
                configured: serviceStatus.configured
            },
            connection: connectionTest,
            capabilities: {
                quickChat: true,
                profileInterview: true,
                contextualChat: true,
                profileExtraction: true,
                suggestions: true
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Status Check Error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function for fallback suggestions
function getFallbackSuggestionsByCategory(category) {
    const suggestions = {
        sport: [
            {
                title: "Trainingsplan erstellen",
                description: "Entwickle einen personalisierten Trainingsplan basierend auf deinen Zielen",
                action: "Erzähle mir von deinen Fitnesszielen",
                priority: "high"
            },
            {
                title: "Fortschritt tracken",
                description: "Verfolge deine sportlichen Erfolge und Verbesserungen",
                action: "Teile deine aktuellen Leistungen mit mir",
                priority: "medium"
            }
        ],
        kochen: [
            {
                title: "Neues Rezept ausprobieren",
                description: "Entdecke ein Rezept, das zu deinen Vorlieben und Fähigkeiten passt",
                action: "Sage mir, was du gerne isst und kochst",
                priority: "high"
            },
            {
                title: "Kochtechniken lernen",
                description: "Verbessere deine Kochfähigkeiten mit neuen Techniken",
                action: "Frage mich nach spezifischen Kochtechniken",
                priority: "medium"
            }
        ],
        arbeit: [
            {
                title: "Produktivität steigern",
                description: "Optimiere deine Arbeitsabläufe und Zeit-Management",
                action: "Erzähle mir von deinen aktuellen Herausforderungen",
                priority: "high"
            },
            {
                title: "Fähigkeiten entwickeln",
                description: "Identifiziere Bereiche für berufliche Weiterentwicklung",
                action: "Teile deine Karriereziele mit mir",
                priority: "medium"
            }
        ],
        lernen: [
            {
                title: "Lernplan erstellen",
                description: "Entwickle eine strukturierte Herangehensweise für dein Lernziel",
                action: "Beschreibe, was du lernen möchtest",
                priority: "high"
            },
            {
                title: "Lernmethoden optimieren",
                description: "Finde die beste Lernstrategie für deinen Lerntyp",
                action: "Erzähle mir, wie du am besten lernst",
                priority: "medium"
            }
        ],
        general: [
            {
                title: "Profil vervollständigen",
                description: "Teile mehr Informationen, um bessere personalisierte Empfehlungen zu erhalten",
                action: "Erzähle mir mehr über deine Ziele und Interessen",
                priority: "medium"
            },
            {
                title: "Neue Gespräche starten",
                description: "Beginne ein Gespräch über ein Thema, das dich interessiert",
                action: "Stelle mir eine Frage zu einem beliebigen Thema",
                priority: "low"
            }
        ]
    };

    return suggestions[category] || suggestions.general;
}

module.exports = router;