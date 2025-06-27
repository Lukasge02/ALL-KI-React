const express = require('express');
const router = express.Router();

// Alle Models nur einmal importieren
let Profile, User, Chat, openaiService;

try {
    Profile = require('../models/Profile');
    User = require('../models/User'); 
    Chat = require('../models/Chat');
    openaiService = require('../services/openai');
    console.log('✅ All models loaded successfully');
} catch (error) {
    console.error('❌ Model loading error:', error.message);
}

// Import dependencies
try {
    const mongoose = require('mongoose');
    console.log('✅ Profile routes: mongoose imported');
    
    const Profile = require('../models/Profile');
    console.log('✅ Profile routes: Profile model imported');
    
    const User = require('../models/User');
    console.log('✅ Profile routes: User model imported');
    
    const openaiService = require('../services/openai');
    console.log('✅ Profile routes: OpenAI service imported');
    
    const Chat = require('../models/Chat');
    console.log('✅ Profile routes: Chat model imported');
    
} catch (error) {
    console.error('❌ Profile routes: Error importing dependencies:', error.message);
    console.error('❌ Full error:', error);
}

// Middleware to extract user from token
const getUserFromToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Kein Token bereitgestellt' });
        }

        const userEmail = req.headers['x-user-email'];
        
        if (!userEmail) {
            return res.status(401).json({ error: 'Benutzer nicht identifizierbar' });
        }

        const User = require('../models/User');
        const user = await User.findOne({ email: userEmail });
        if (!user) {
            return res.status(401).json({ error: 'Benutzer nicht gefunden' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ error: 'Ungültiger Token' });
    }
};

console.log('✅ Profile routes: Middleware defined');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Profile routes are working!' });
});

// Get all profiles for a user
router.get('/', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const profiles = await Profile.find({ userId: req.user._id })
            .select('name category profileData stats createdAt updatedAt')
            .sort({ updatedAt: -1 });

        console.log(`Found ${profiles.length} profiles for user ${req.user.email}`);

        res.json({
            success: true,
            profiles: profiles,
            total: profiles.length
        });
    } catch (error) {
        console.error('Get Profiles Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Profile' });
    }
});

// Get specific profile
router.get('/:profileId', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        res.json({
            success: true,
            profile: profile
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Profils' });
    }
});

// Create new profile
router.post('/create', getUserFromToken, async (req, res) => {
    try {
        const { conversationHistory } = req.body;
        
        if (!conversationHistory || !Array.isArray(conversationHistory)) {
            return res.status(400).json({ error: 'Gesprächsverlauf ist erforderlich' });
        }

        // Extract profile data using OpenAI
        const openaiService = require('../services/openai');
        let profileData;
        
        try {
            profileData = await openaiService.extractProfileData(conversationHistory);
        } catch (error) {
            console.error('OpenAI extraction error:', error);
            // Fallback profile data
            profileData = {
                name: "Neues Profil",
                category: "general",
                goals: ["Unterstützung erhalten"],
                preferences: ["Personalisierte Hilfe"],
                challenges: [],
                frequency: "Regelmäßig",
                experience: "Anfänger",
                notes: "Automatisch erstellt"
            };
        }
        
        const Profile = require('../models/Profile');
        const newProfile = new Profile({
            userId: req.user._id,
            name: profileData.name || 'Neues Profil',
            category: profileData.category || 'general',
            profileData: {
                goals: profileData.goals || [],
                preferences: profileData.preferences || [],
                challenges: profileData.challenges || [],
                experience: profileData.experience || 'Anfänger',
                frequency: profileData.frequency || 'Regelmäßig',
                notes: profileData.notes || ''
            },
            stats: {
                totalConversations: 0,
                totalMemories: 0,
                avgSessionLength: 0,
                lastUsed: new Date(),
                userSatisfaction: 0.5,
                personalityEvolutions: 0
            }
        });

        const savedProfile = await newProfile.save();
        
        res.status(201).json({
            success: true,
            profile: {
                id: savedProfile._id,
                name: savedProfile.name,
                category: savedProfile.category,
                profileData: savedProfile.profileData
            }
        });
    } catch (error) {
        console.error('Create Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Profils' });
    }
});

// Delete profile
router.delete('/:profileId', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const Chat = require('../models/Chat');
        
        // Delete profile
        const deletedProfile = await Profile.findOneAndDelete({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!deletedProfile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        // Delete all chats for this profile
        await Chat.deleteMany({
            profileId: req.params.profileId,
            userId: req.user._id
        });

        res.json({
            success: true,
            message: 'Profil und alle zugehörigen Chats gelöscht'
        });
    } catch (error) {
        console.error('Delete Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Profils' });
    }
});

// Get all chats for a profile
router.get('/:profileId/chats', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const Chat = require('../models/Chat');
        
        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        const chats = await Chat.find({
            profileId: req.params.profileId,
            userId: req.user._id
        }).sort({ updatedAt: -1 });

        res.json({
            success: true,
            chats: chats
        });
    } catch (error) {
        console.error('Get Chats Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Chats' });
    }
});

// Create new chat
router.post('/:profileId/chats', getUserFromToken, async (req, res) => {
    try {
        const { title } = req.body;
        
        const Profile = require('../models/Profile');
        const Chat = require('../models/Chat');
        
        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        const newChat = new Chat({
            profileId: req.params.profileId,
            userId: req.user._id,
            title: title || 'Neuer Chat',
            messages: []
        });

        const savedChat = await newChat.save();

        res.status(201).json({
            success: true,
            chat: savedChat
        });
    } catch (error) {
        console.error('Create Chat Error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Chats' });
    }
});

// Get specific chat
router.get('/:profileId/chats/:chatId', getUserFromToken, async (req, res) => {
    try {
        const Chat = require('../models/Chat');
        
        const chat = await Chat.findOne({
            _id: req.params.chatId,
            profileId: req.params.profileId,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat nicht gefunden' });
        }

        res.json({
            success: true,
            chat: chat,
            messages: chat.messages
        });
    } catch (error) {
        console.error('Get Chat Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Chats' });
    }
});

// Send message to chat
router.post('/:profileId/chats/:chatId/message', getUserFromToken, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Nachricht ist erforderlich' });
        }

        const Chat = require('../models/Chat');
        const Profile = require('../models/Profile');
        
        const chat = await Chat.findOne({
            _id: req.params.chatId,
            profileId: req.params.profileId,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat nicht gefunden' });
        }

        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        // Add user message to chat
        chat.messages.push({
            role: 'user',
            content: message,
            timestamp: new Date()
        });

        // Get AI response with profile context
        let aiResponse;
        try {
            const openaiService = require('../services/openai');
            const recentMessages = chat.messages.slice(-10);
            
            aiResponse = await openaiService.contextualChat(
                message,
                profile.profileData,
                recentMessages
            );
        } catch (error) {
            console.error('OpenAI contextual chat error:', error);
            aiResponse = "Entschuldigung, ich habe gerade technische Probleme. Können Sie es nochmal versuchen?";
        }

        // Add AI response to chat
        chat.messages.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date()
        });

        // Update chat timestamp
        chat.updatedAt = new Date();
        
        // Save chat
        await chat.save();

        // Update profile stats
        profile.stats.totalConversations += 1;
        profile.stats.lastUsed = new Date();
        await profile.save();

        res.json({
            success: true,
            response: aiResponse,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Send Message Error:', error);
        res.status(500).json({ 
            error: 'Fehler beim Senden der Nachricht',
            fallback: true
        });
    }
});

// Update chat title
router.patch('/:profileId/chats/:chatId', getUserFromToken, async (req, res) => {
    try {
        const { title } = req.body;
        const Chat = require('../models/Chat');

        const chat = await Chat.findOne({
            _id: req.params.chatId,
            profileId: req.params.profileId,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat nicht gefunden' });
        }

        if (title) {
            chat.title = title;
            await chat.save();
        }

        res.json({
            success: true,
            chat: chat
        });
    } catch (error) {
        console.error('Update Chat Error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Chats' });
    }
});

// Delete chat
router.delete('/:profileId/chats/:chatId', getUserFromToken, async (req, res) => {
    try {
        const Chat = require('../models/Chat');
        
        const chat = await Chat.findOneAndDelete({
            _id: req.params.chatId,
            profileId: req.params.profileId,
            userId: req.user._id
        });

        if (!chat) {
            return res.status(404).json({ error: 'Chat nicht gefunden' });
        }

        res.json({
            success: true,
            message: 'Chat gelöscht'
        });
    } catch (error) {
        console.error('Delete Chat Error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Chats' });
    }
});

// Helper function to extract topics from text
function extractTopics(text) {
    const commonTopics = [
        'arbeit', 'gesundheit', 'lernen', 'sport', 'kochen', 'reisen', 
        'technologie', 'beziehungen', 'finanzen', 'kreativität'
    ];
    
    const lowerText = text.toLowerCase();
    return commonTopics.filter(topic => 
        lowerText.includes(topic) || lowerText.includes(topic.slice(0, -1))
    );
}

console.log('✅ Profile routes: All routes and functions defined');

module.exports = router;

console.log('✅ Profile routes: Module exported successfully');