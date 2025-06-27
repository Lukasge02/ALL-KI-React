const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Profile = require('../models/Profile');
const User = require('../models/User');
const openaiService = require('../services/openai');

// Chat Schema for MongoDB
const ChatSchema = new mongoose.Schema({
    profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Neuer Chat' },
    messages: [{
        role: { type: String, enum: ['user', 'assistant'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const Chat = mongoose.model('Chat', ChatSchema);

// Middleware to extract user from token (simplified for now)
const getUserFromToken = async (req, res, next) => {
    try {
        // In production: verify JWT token
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Kein Token bereitgestellt' });
        }

        // For now, extract user email from headers
        const userEmail = req.headers['x-user-email'];
        
        if (!userEmail) {
            return res.status(401).json({ error: 'Benutzer nicht identifizierbar' });
        }

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

// Get all profiles for a user
router.get('/', getUserFromToken, async (req, res) => {
    try {
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

// Create new profile with AI interview
router.post('/create', getUserFromToken, async (req, res) => {
    try {
        const { conversationHistory, profileData } = req.body;

        if (!conversationHistory || conversationHistory.length === 0) {
            return res.status(400).json({ error: 'Gesprächsverlauf ist erforderlich' });
        }

        console.log('Creating profile for user:', req.user.email);
        console.log('Conversation history length:', conversationHistory.length);

        // Extract profile data using OpenAI
        let extractedData;
        try {
            extractedData = await openaiService.extractProfileData(conversationHistory);
            console.log('Extracted profile data:', extractedData);
        } catch (error) {
            console.error('Profile extraction error:', error);
            // Fallback profile data
            const userMessages = conversationHistory.filter(msg => msg.role === 'user');
            extractedData = {
                name: userMessages[0]?.content || 'Neues Profil',
                category: 'general',
                goals: ['Allgemeine Unterstützung'],
                preferences: [],
                challenges: [],
                experience: 'Anfänger',
                frequency: 'Gelegentlich',
                notes: 'Automatisch erstellt'
            };
        }

        // Determine category based on extracted data
        const categoryMapping = {
            'arbeit': 'work',
            'work': 'work',
            'beruf': 'work',
            'job': 'work',
            'gesundheit': 'health',
            'health': 'health',
            'fitness': 'health',
            'sport': 'health',
            'lernen': 'learning',
            'learning': 'learning',
            'studium': 'learning',
            'bildung': 'learning',
            'kreativ': 'creativity',
            'creativity': 'creativity',
            'kunst': 'creativity',
            'beziehung': 'relationships',
            'relationships': 'relationships',
            'familie': 'relationships',
            'finanzen': 'finance',
            'finance': 'finance',
            'geld': 'finance'
        };

        const detectedCategory = Object.keys(categoryMapping).find(key => 
            extractedData.name?.toLowerCase().includes(key) ||
            extractedData.category?.toLowerCase().includes(key) ||
            conversationHistory.some(msg => msg.content.toLowerCase().includes(key))
        );

        const finalCategory = detectedCategory ? categoryMapping[detectedCategory] : 'general';

        // Create new profile
        const newProfile = new Profile({
            userId: req.user._id,
            name: extractedData.name || 'Neues Profil',
            category: finalCategory,
            personality: {
                type: 'assistant',
                traits: [
                    { name: 'helpful', strength: 0.8 },
                    { name: 'knowledgeable', strength: 0.7 }
                ],
                communicationStyle: {
                    formality: 0.5,
                    enthusiasm: 0.7,
                    directness: 0.6,
                    supportiveness: 0.8
                }
            },
            profileData: {
                goals: extractedData.goals || [],
                preferences: extractedData.preferences || [],
                challenges: extractedData.challenges || [],
                experience: extractedData.experience || 'Anfänger',
                frequency: extractedData.frequency || 'Gelegentlich',
                notes: extractedData.notes || ''
            },
            conversationHistory: conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(),
                topics: extractTopics(msg.content)
            }))
        });

        const savedProfile = await newProfile.save();

        // Update user stats
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'stats.totalProfiles': 1 },
            $set: { 'stats.lastActive': new Date() }
        });

        console.log('Profile created successfully:', savedProfile.name, 'ID:', savedProfile._id);

        res.status(201).json({
            success: true,
            message: 'Profil erfolgreich erstellt',
            profile: {
                id: savedProfile._id,
                name: savedProfile.name,
                category: savedProfile.category,
                profileData: savedProfile.profileData,
                createdAt: savedProfile.createdAt
            }
        });

    } catch (error) {
        console.error('Create Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Profils' });
    }
});

// Update profile
router.put('/:profileId', getUserFromToken, async (req, res) => {
    try {
        const { profileData, conversationHistory } = req.body;

        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        // Update profile data
        if (profileData) {
            profile.profileData = { ...profile.profileData, ...profileData };
        }

        // Add new conversation history
        if (conversationHistory && conversationHistory.length > 0) {
            const newMessages = conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(),
                topics: extractTopics(msg.content)
            }));
            profile.conversationHistory.push(...newMessages);
        }

        // Update stats
        profile.stats.totalConversations += conversationHistory?.length || 0;
        profile.stats.lastUsed = new Date();

        const updatedProfile = await profile.save();

        res.json({
            success: true,
            message: 'Profil aktualisiert',
            profile: updatedProfile
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Profils' });
    }
});

// Delete profile
router.delete('/:profileId', getUserFromToken, async (req, res) => {
    try {
        const profile = await Profile.findOneAndDelete({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        // Also delete all chats for this profile
        await Chat.deleteMany({
            profileId: req.params.profileId,
            userId: req.user._id
        });

        // Update user stats
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { 'stats.totalProfiles': -1 }
        });

        console.log('Profile deleted:', profile.name);

        res.json({
            success: true,
            message: 'Profil gelöscht'
        });

    } catch (error) {
        console.error('Delete Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Profils' });
    }
});

// Chat with profile (contextual chat) - LEGACY ROUTE
router.post('/:profileId/chat', getUserFromToken, async (req, res) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Nachricht ist erforderlich' });
        }

        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        console.log(`Chat with profile ${profile.name}: ${message.substring(0, 50)}...`);

        // Get recent conversation history (last 10 messages)
        const recentHistory = profile.conversationHistory.slice(-10);

        // Call OpenAI with profile context
        let response;
        try {
            response = await openaiService.contextualChat(
                message,
                profile.profileData,
                recentHistory
            );
        } catch (error) {
            console.error('OpenAI contextual chat error:', error);
            response = "Entschuldigung, ich habe gerade technische Probleme. Können Sie es nochmal versuchen?";
        }

        // Save conversation to profile
        const userMessage = {
            role: 'user',
            content: message,
            timestamp: new Date(),
            topics: extractTopics(message)
        };

        const aiMessage = {
            role: 'assistant',
            content: response,
            timestamp: new Date(),
            topics: extractTopics(response)
        };

        profile.conversationHistory.push(userMessage, aiMessage);
        profile.stats.totalConversations += 1;
        profile.stats.lastUsed = new Date();

        await profile.save();

        res.json({
            success: true,
            response: response,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Profile Chat Error:', error);
        res.status(500).json({ 
            error: 'Fehler beim Chat mit dem Profil',
            fallback: true
        });
    }
});

// Get profile conversation history - LEGACY ROUTE
router.get('/:profileId/history', getUserFromToken, async (req, res) => {
    try {
        const { limit = 50, skip = 0 } = req.query;

        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        }).select('conversationHistory name');

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        // Get paginated conversation history
        const history = profile.conversationHistory
            .reverse()
            .slice(skip, skip + parseInt(limit));

        res.json({
            success: true,
            history: history,
            total: profile.conversationHistory.length,
            profileName: profile.name
        });

    } catch (error) {
        console.error('Get Profile History Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden des Gesprächsverlaufs' });
    }
});

// =================== NEW CHAT SYSTEM ROUTES ===================

// Get all chats for a profile
router.get('/:profileId/chats', getUserFromToken, async (req, res) => {
    try {
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
            // Use recent chat messages as context
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

// Update chat (title, etc.)
router.patch('/:profileId/chats/:chatId', getUserFromToken, async (req, res) => {
    try {
        const { title } = req.body;

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
        }

        await chat.save();

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

module.exports = router;