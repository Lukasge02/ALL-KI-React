const express = require('express');
const router = express.Router();

console.log('✅ Profile routes: Basic setup complete');

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

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Profile routes are working!' });
});

// Get all profiles for a user (Basic version)
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

// Enhanced profiles with live stats
router.get('/enhanced', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const Chat = require('../models/Chat');
        
        // Get profiles with all necessary data
        const profiles = await Profile.find({ userId: req.user._id })
            .select('name category profileData stats createdAt updatedAt personality memories')
            .sort({ updatedAt: -1 });

        // Enhance each profile with live statistics
        const enhancedProfiles = await Promise.all(profiles.map(async (profile) => {
            // Get chat statistics
            const chatStats = await Chat.aggregate([
                { $match: { profileId: profile._id, userId: req.user._id } },
                {
                    $group: {
                        _id: null,
                        totalChats: { $sum: 1 },
                        totalMessages: { $sum: { $size: "$messages" } },
                        lastChatDate: { $max: "$updatedAt" },
                        avgMessagesPerChat: { $avg: { $size: "$messages" } }
                    }
                }
            ]);

            const stats = chatStats[0] || {
                totalChats: 0,
                totalMessages: 0,
                lastChatDate: null,
                avgMessagesPerChat: 0
            };

            // Calculate activity score
            const daysSinceCreation = Math.max(1, (Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24));
            const activityScore = Math.min(1, stats.totalMessages / (daysSinceCreation * 2));

            // Get recent insights from memories
            const recentInsights = profile.memories
                ?.filter(m => m.timestamp && m.timestamp > Date.now() - 7 * 24 * 60 * 60 * 1000)
                ?.slice(0, 3) || [];

            return {
                _id: profile._id,
                name: profile.name,
                category: profile.category,
                profileData: profile.profileData,
                personality: profile.personality,
                stats: {
                    totalChats: stats.totalChats,
                    totalMessages: stats.totalMessages,
                    avgMessagesPerChat: Math.round(stats.avgMessagesPerChat || 0),
                    lastActivity: stats.lastChatDate,
                    activityScore: activityScore
                },
                insights: recentInsights,
                health: {
                    status: activityScore > 0.1 ? 'active' : 'inactive',
                    engagement: activityScore > 0.5 ? 'high' : activityScore > 0.2 ? 'medium' : 'low',
                    lastUsed: profile.stats?.lastUsed || profile.updatedAt
                },
                createdAt: profile.createdAt,
                updatedAt: profile.updatedAt
            };
        }));

        console.log(`📊 Enhanced ${enhancedProfiles.length} profiles for user ${req.user.email}`);

        res.json({
            success: true,
            profiles: enhancedProfiles,
            total: enhancedProfiles.length,
            summary: {
                totalProfiles: enhancedProfiles.length,
                activeProfiles: enhancedProfiles.filter(p => p.health.status === 'active').length,
                totalConversations: enhancedProfiles.reduce((sum, p) => sum + p.stats.totalChats, 0),
                totalMessages: enhancedProfiles.reduce((sum, p) => sum + p.stats.totalMessages, 0)
            }
        });
    } catch (error) {
        console.error('Enhanced Get Profiles Error:', error);
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

// Get specific profile with detailed analysis
router.get('/:profileId/details', getUserFromToken, async (req, res) => {
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

        // Get detailed chat analysis
        const chats = await Chat.find({
            profileId: req.params.profileId,
            userId: req.user._id
        }).sort({ updatedAt: -1 });

        // Analyze conversation patterns
        const conversationAnalysis = {
            totalChats: chats.length,
            totalMessages: chats.reduce((sum, chat) => sum + chat.messages.length, 0),
            avgSessionLength: chats.length > 0 
                ? chats.reduce((sum, chat) => sum + chat.messages.length, 0) / chats.length
                : 0,
            recentActivity: chats.filter(chat => 
                chat.updatedAt > Date.now() - 7 * 24 * 60 * 60 * 1000
            ).length
        };

        // Generate recommendations
        const recommendations = generateRecommendations(profile, conversationAnalysis);

        res.json({
            success: true,
            profile: profile,
            analysis: conversationAnalysis,
            recommendations: recommendations,
            recentChats: chats.slice(0, 5)
        });
    } catch (error) {
        console.error('Get Profile Details Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Profildetails' });
    }
});

// Create new profile
router.post('/', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const { name, category, profileData, personality } = req.body;

        if (!name || !category) {
            return res.status(400).json({ 
                error: 'Name und Kategorie sind erforderlich' 
            });
        }

        const newProfile = new Profile({
            name,
            category,
            userId: req.user._id,
            profileData: profileData || {},
            personality: personality || {
                traits: [],
                preferences: {},
                learningStyle: 'adaptive'
            },
            stats: {
                totalConversations: 0,
                lastUsed: new Date()
            },
            memories: []
        });

        const savedProfile = await newProfile.save();

        res.status(201).json({
            success: true,
            profile: savedProfile,
            message: 'Profil erfolgreich erstellt'
        });

    } catch (error) {
        console.error('Create Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Erstellen des Profils' });
    }
});

// Update profile data (inline editing)
router.patch('/:profileId', getUserFromToken, async (req, res) => {
    try {
        const Profile = require('../models/Profile');
        const { name, category, profileData, personality } = req.body;

        const profile = await Profile.findOne({
            _id: req.params.profileId,
            userId: req.user._id
        });

        if (!profile) {
            return res.status(404).json({ error: 'Profil nicht gefunden' });
        }

        // Update fields if provided
        if (name) profile.name = name;
        if (category) profile.category = category;
        if (profileData) {
            profile.profileData = { ...profile.profileData, ...profileData };
        }
        if (personality) {
            profile.personality = { ...profile.personality, ...personality };
        }

        // Track changes
        profile.personality = profile.personality || {};
        profile.personality.evolutionHistory = profile.personality.evolutionHistory || [];
        profile.personality.evolutionHistory.push({
            date: new Date(),
            change: 'Manual profile update',
            reason: 'User edited profile data'
        });

        await profile.save();

        res.json({
            success: true,
            profile: profile,
            message: 'Profil erfolgreich aktualisiert'
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Profils' });
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

// CHAT ROUTES FOR PROFILES

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
        profile.stats = profile.stats || {};
        profile.stats.totalConversations = (profile.stats.totalConversations || 0) + 1;
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

// Helper function to generate recommendations
function generateRecommendations(profile, analysis) {
    const recommendations = [];

    if (analysis.totalMessages < 5) {
        recommendations.push({
            type: 'engagement',
            priority: 'high',
            title: 'Mehr Interaktion',
            description: 'Führen Sie mehr Gespräche, um personalisierte Empfehlungen zu erhalten.',
            action: 'Starten Sie einen neuen Chat'
        });
    }

    if (analysis.recentActivity === 0) {
        recommendations.push({
            type: 'activity',
            priority: 'medium',
            title: 'Profil wieder aktivieren',
            description: 'Dieses Profil war längere Zeit inaktiv.',
            action: 'Neues Gespräch beginnen'
        });
    }

    if (recommendations.length === 0) {
        recommendations.push({
            type: 'general',
            priority: 'low',
            title: 'Profil läuft gut',
            description: 'Ihr Profil wird aktiv genutzt und entwickelt sich weiter.',
            action: 'Weiter so!'
        });
    }

    return recommendations;
}

module.exports = router;