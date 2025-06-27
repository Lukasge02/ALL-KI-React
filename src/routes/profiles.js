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

// Get all profiles for a user (Basic version - existing)
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

// 🎯 ENHANCED PROFILES WITH LIVE STATS
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
                ?.filter(m => m.type === 'insight' || m.importance > 0.7)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 3) || [];

            return {
                _id: profile._id,
                name: profile.name,
                category: profile.category,
                profileData: profile.profileData,
                stats: {
                    ...profile.stats,
                    totalChats: stats.totalChats,
                    totalMessages: stats.totalMessages,
                    lastActivity: stats.lastChatDate,
                    activityScore: activityScore,
                    avgMessagesPerChat: Math.round(stats.avgMessagesPerChat || 0)
                },
                personality: {
                    type: profile.personality?.type || 'assistant',
                    communicationStyle: profile.personality?.communicationStyle || {}
                },
                insights: recentInsights.map(insight => ({
                    content: insight.content,
                    type: insight.type,
                    importance: insight.importance,
                    createdAt: insight.createdAt
                })),
                health: {
                    status: stats.totalMessages > 0 ? 'active' : 'inactive',
                    engagement: activityScore > 0.5 ? 'high' : activityScore > 0.2 ? 'medium' : 'low',
                    lastUsed: profile.stats.lastUsed || profile.updatedAt
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
            avgSessionLength: chats.length > 0 ? 
                chats.reduce((sum, chat) => sum + chat.messages.length, 0) / chats.length : 0,
            topicDistribution: {},
            moodTrends: [],
            engagementScore: 0
        };

        // Calculate engagement over time
        const last30Days = chats.filter(chat => 
            (Date.now() - chat.updatedAt) < 30 * 24 * 60 * 60 * 1000
        );
        conversationAnalysis.engagementScore = Math.min(1, last30Days.length / 10);

        // Memory insights
        const memoryInsights = {
            totalMemories: profile.memories?.length || 0,
            memoryTypes: {},
            importantMemories: profile.memories
                ?.filter(m => m.importance > 0.7)
                .sort((a, b) => b.importance - a.importance)
                .slice(0, 5) || [],
            recentMemories: profile.memories
                ?.sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 10) || []
        };

        // Count memory types
        if (profile.memories) {
            profile.memories.forEach(memory => {
                memoryInsights.memoryTypes[memory.type] = 
                    (memoryInsights.memoryTypes[memory.type] || 0) + 1;
            });
        }

        // Goal progress analysis
        const goalProgress = profile.profileData.goals?.map(goal => ({
            goal: goal,
            mentions: chats.reduce((count, chat) => {
                return count + chat.messages.filter(msg => 
                    msg.content.toLowerCase().includes(goal.toLowerCase())
                ).length;
            }, 0),
            lastMentioned: null
        })) || [];

        res.json({
            success: true,
            profile: profile,
            analysis: {
                conversation: conversationAnalysis,
                memory: memoryInsights,
                goals: goalProgress,
                personality: {
                    evolution: profile.personality?.evolutionHistory || [],
                    currentTraits: profile.personality?.traits || []
                }
            },
            recommendations: generateRecommendations(profile, conversationAnalysis)
        });

    } catch (error) {
        console.error('Get Profile Details Error:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Profildetails' });
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

// Bulk operations for profile management
router.post('/bulk-action', getUserFromToken, async (req, res) => {
    try {
        const { action, profileIds, data } = req.body;
        const Profile = require('../models/Profile');
        const Chat = require('../models/Chat');

        if (!action || !profileIds || !Array.isArray(profileIds)) {
            return res.status(400).json({ error: 'Ungültige Bulk-Aktion' });
        }

        let result = { success: true, affected: 0, details: [] };

        switch (action) {
            case 'delete':
                // Delete profiles and their chats
                const deleteResult = await Profile.deleteMany({
                    _id: { $in: profileIds },
                    userId: req.user._id
                });
                
                await Chat.deleteMany({
                    profileId: { $in: profileIds },
                    userId: req.user._id
                });
                
                result.affected = deleteResult.deletedCount;
                result.message = `${deleteResult.deletedCount} Profile gelöscht`;
                break;

            case 'archive':
                const archiveResult = await Profile.updateMany(
                    { _id: { $in: profileIds }, userId: req.user._id },
                    { $set: { 'stats.archived': true, 'stats.archivedAt': new Date() } }
                );
                result.affected = archiveResult.modifiedCount;
                result.message = `${archiveResult.modifiedCount} Profile archiviert`;
                break;

            case 'category-update':
                if (!data || !data.category) {
                    return res.status(400).json({ error: 'Kategorie ist erforderlich' });
                }
                const categoryResult = await Profile.updateMany(
                    { _id: { $in: profileIds }, userId: req.user._id },
                    { $set: { category: data.category } }
                );
                result.affected = categoryResult.modifiedCount;
                result.message = `${categoryResult.modifiedCount} Profile Kategorie aktualisiert`;
                break;

            default:
                return res.status(400).json({ error: 'Unbekannte Aktion' });
        }

        res.json(result);

    } catch (error) {
        console.error('Bulk Action Error:', error);
        res.status(500).json({ error: 'Fehler bei Bulk-Aktion' });
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

// Helper function to generate recommendations
function generateRecommendations(profile, analysis) {
    const recommendations = [];

    if (analysis.totalMessages < 5) {
        recommendations.push({
            type: 'engagement',
            priority: 'high',
            title: 'Mehr Interaktion',
            description: 'Führen Sie mehr Gespräche, um personalisierte Empfehlungen zu erhalten.',
            action: 'start_chat'
        });
    }

    if (profile.profileData.goals?.length === 0) {
        recommendations.push({
            type: 'setup',
            priority: 'medium',
            title: 'Ziele definieren',
            description: 'Definieren Sie klare Ziele für bessere Unterstützung.',
            action: 'edit_goals'
        });
    }

    if (analysis.engagementScore < 0.3) {
        recommendations.push({
            type: 'activity',
            priority: 'low',
            title: 'Regelmäßigkeit erhöhen',
            description: 'Nutzen Sie das Profil regelmäßiger für bessere Ergebnisse.',
            action: 'schedule_reminder'
        });
    }

    return recommendations;
}

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