/**
 * 👤 ALL-KI PROFILE ROUTES - MODERN VERSION 2.0
 * Advanced profile management with AI personality, learning, and templates
 * 
 * EINFÜGEN IN: src/routes/profiles.js
 */

const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const Profile = require('../models/Profile');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { requireAuth, requireOwnership, requireFeature } = require('../middleware/auth');
const { log } = require('../middleware/logger');

const router = express.Router();

// ========================================
// MIDDLEWARE SETUP
// ========================================

// All routes require authentication
router.use(requireAuth);

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Nur Bilddateien sind erlaubt'), false);
        }
    }
});

// ========================================
// VALIDATION SCHEMAS
// ========================================

const createProfileValidation = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Profilname muss zwischen 2 und 100 Zeichen lang sein')
        .matches(/^[a-zA-ZäöüÄÖÜß0-9\s\-_.]+$/)
        .withMessage('Profilname enthält ungültige Zeichen'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Beschreibung darf maximal 1000 Zeichen lang sein'),
    
    body('category')
        .optional()
        .isIn([
            'general', 'fitness', 'cooking', 'work', 'study', 'health',
            'travel', 'finance', 'tech', 'creative', 'support', 'entertainment'
        ])
        .withMessage('Ungültige Kategorie'),
    
    body('systemPrompt')
        .optional()
        .trim()
        .isLength({ max: 5000 })
        .withMessage('System Prompt darf maximal 5000 Zeichen lang sein'),
    
    body('personality.traits.friendliness')
        .optional()
        .isInt({ min: 1, max: 10 })
        .withMessage('Freundlichkeit muss zwischen 1 und 10 liegen'),
    
    body('personality.communicationStyle')
        .optional()
        .isIn(['casual', 'professional', 'academic', 'friendly', 'technical', 'creative'])
        .withMessage('Ungültiger Kommunikationsstil'),
    
    body('preferences.language.primary')
        .optional()
        .isIn(['de', 'en', 'fr', 'es', 'it'])
        .withMessage('Ungültige Sprache'),
    
    body('preferences.aiModel')
        .optional()
        .isIn(['gpt-3.5-turbo', 'gpt-4', 'claude', 'local'])
        .withMessage('Ungültiges KI-Modell'),
    
    body('preferences.temperature')
        .optional()
        .isFloat({ min: 0, max: 2 })
        .withMessage('Temperature muss zwischen 0 und 2 liegen')
];

const updateProfileValidation = [
    param('id').isMongoId().withMessage('Ungültige Profil-ID'),
    ...createProfileValidation
];

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

const sanitizeProfileData = (data) => {
    const allowedFields = [
        'name', 'description', 'category', 'systemPrompt', 'avatar',
        'personality', 'preferences', 'knowledgeBase', 'integrations',
        'customFields', 'visibility', 'isTemplate', 'templateCategory'
    ];
    
    const sanitized = {};
    allowedFields.forEach(field => {
        if (data[field] !== undefined) {
            sanitized[field] = data[field];
        }
    });
    
    return sanitized;
};

const generateProfileTemplate = (category) => {
    const templates = {
        fitness: {
            name: 'Fitness Coach',
            description: 'Ihr persönlicher Fitness-Trainer für Training und Ernährung',
            systemPrompt: 'Du bist ein erfahrener Fitness-Coach und Personal Trainer. Du hilfst bei Trainingsplanung, Ernährungsberatung und Motivation. Sei ermutigend und professionell.',
            personality: {
                traits: {
                    friendliness: 8,
                    formality: 6,
                    empathy: 9
                },
                communicationStyle: 'friendly',
                expertise: 'advanced'
            },
            avatar: { emoji: '💪', color: '#ff6b6b' }
        },
        cooking: {
            name: 'Koch-Assistent',
            description: 'Ihr kulinarischer Begleiter für Rezepte und Kochtipps',
            systemPrompt: 'Du bist ein kreativer Koch und Küchenchef. Du hilfst bei Rezepten, Kochtechniken und Menüplanung. Sei kreativ und inspirierend.',
            personality: {
                traits: {
                    friendliness: 9,
                    creativity: 9,
                    expertise: 8
                },
                communicationStyle: 'creative',
                expertise: 'expert'
            },
            avatar: { emoji: '👨‍🍳', color: '#feca57' }
        },
        work: {
            name: 'Produktivitäts-Coach',
            description: 'Ihr Assistent für berufliche Effizienz und Organisation',
            systemPrompt: 'Du bist ein Produktivitäts-Experte und Business-Coach. Du hilfst bei Zeitmanagement, Projektplanung und beruflicher Entwicklung. Sei strukturiert und zielorientiert.',
            personality: {
                traits: {
                    formality: 8,
                    directness: 8,
                    expertise: 9
                },
                communicationStyle: 'professional',
                expertise: 'expert'
            },
            avatar: { emoji: '💼', color: '#3742fa' }
        },
        study: {
            name: 'Lern-Coach',
            description: 'Ihr Begleiter für effektives Lernen und Bildung',
            systemPrompt: 'Du bist ein geduldiger Lehrer und Lern-Coach. Du hilfst beim Verstehen komplexer Themen und beim effektiven Lernen. Sei geduldig und erklärend.',
            personality: {
                traits: {
                    friendliness: 8,
                    empathy: 9,
                    expertise: 9
                },
                communicationStyle: 'academic',
                expertise: 'expert'
            },
            avatar: { emoji: '📚', color: '#2ed573' }
        }
    };
    
    return templates[category] || templates.general;
};

// ========================================
// ROUTES
// ========================================

// Get All Profiles
router.get('/', asyncHandler(async (req, res) => {
    const { 
        category, 
        status = 'active', 
        limit = 50, 
        offset = 0,
        search,
        sortBy = 'lastUsed',
        sortOrder = 'desc'
    } = req.query;
    
    try {
        const filter = { 
            userId: req.user.id,
            deletedAt: { $exists: false }
        };
        
        if (category && category !== 'all') {
            filter.category = category;
        }
        
        if (status && status !== 'all') {
            filter.status = status;
        }
        
        // Text search
        if (search) {
            filter.$text = { $search: search };
        }
        
        // Build sort object
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        const profiles = await Profile.find(filter)
            .sort(sortOptions)
            .limit(parseInt(limit))
            .skip(parseInt(offset))
            .select('-knowledgeBase -learning.feedbackHistory -trainingData');
        
        const totalProfiles = await Profile.countDocuments(filter);
        
        res.json({
            success: true,
            profiles,
            pagination: {
                total: totalProfiles,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < totalProfiles
            }
        });
        
    } catch (error) {
        log.error('Get profiles error', error, { userId: req.user.id });
        throw error;
    }
}));

// Get Profile by ID
router.get('/:id', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    const profile = req.resource; // Set by requireOwnership middleware
    
    res.json({
        success: true,
        profile
    });
}));

// Create New Profile
router.post('/', requireFeature('profile'), createProfileValidation, handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const profileData = sanitizeProfileData(req.body);
        
        // Check if user can create more profiles
        const existingProfilesCount = await Profile.countDocuments({
            userId: req.user.id,
            deletedAt: { $exists: false }
        });
        
        const user = await User.findById(req.user.id);
        if (existingProfilesCount >= user.subscription.limits.profiles) {
            return res.status(403).json({
                success: false,
                error: 'Profil-Limit erreicht',
                limit: user.subscription.limits.profiles,
                current: existingProfilesCount
            });
        }
        
        // Check for duplicate names
        const existingProfile = await Profile.findOne({
            userId: req.user.id,
            name: profileData.name,
            deletedAt: { $exists: false }
        });
        
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                error: 'Ein Profil mit diesem Namen existiert bereits'
            });
        }
        
        // Apply template if category is provided and no custom data
        if (profileData.category && !profileData.systemPrompt) {
            const template = generateProfileTemplate(profileData.category);
            Object.assign(profileData, template, profileData); // profileData overwrites template
        }
        
        // Create profile
        const profile = new Profile({
            ...profileData,
            userId: req.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await profile.save();
        
        // Update user profile count
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { 'subscription.usage.profiles': 1 }
        });
        
        log.success('Profile created', {
            userId: req.user.id,
            profileId: profile._id,
            profileName: profile.name,
            category: profile.category
        });
        
        res.status(201).json({
            success: true,
            message: 'Profil erfolgreich erstellt',
            profile
        });
        
    } catch (error) {
        log.error('Create profile error', error, { userId: req.user.id });
        throw error;
    }
}));

// Update Profile
router.put('/:id', requireOwnership('Profile'), updateProfileValidation, handleValidationErrors, asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        const updateData = sanitizeProfileData(req.body);
        
        // Check for duplicate names (excluding current profile)
        if (updateData.name && updateData.name !== profile.name) {
            const existingProfile = await Profile.findOne({
                userId: req.user.id,
                name: updateData.name,
                _id: { $ne: profile._id },
                deletedAt: { $exists: false }
            });
            
            if (existingProfile) {
                return res.status(409).json({
                    success: false,
                    error: 'Ein Profil mit diesem Namen existiert bereits'
                });
            }
        }
        
        // Update profile
        Object.assign(profile, updateData);
        profile.updatedAt = new Date();
        
        // Increment version
        const [major, minor, patch] = profile.version.split('.').map(Number);
        profile.version = `${major}.${minor}.${patch + 1}`;
        
        // Add to version history if significant changes
        const significantFields = ['systemPrompt', 'personality', 'preferences'];
        const hasSignificantChanges = significantFields.some(field => updateData[field]);
        
        if (hasSignificantChanges) {
            profile.versionHistory.push({
                version: profile.version,
                changes: 'Profile updated with significant changes',
                createdAt: new Date(),
                createdBy: req.user.id
            });
        }
        
        await profile.save();
        
        log.info('Profile updated', {
            userId: req.user.id,
            profileId: profile._id,
            version: profile.version
        });
        
        res.json({
            success: true,
            message: 'Profil erfolgreich aktualisiert',
            profile
        });
        
    } catch (error) {
        log.error('Update profile error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Delete Profile (Soft Delete)
router.delete('/:id', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        
        // Soft delete the profile
        await profile.softDelete(req.user.id);
        
        // Update user profile count
        await User.findByIdAndUpdate(req.user.id, {
            $inc: { 'subscription.usage.profiles': -1 }
        });
        
        log.info('Profile deleted', {
            userId: req.user.id,
            profileId: profile._id,
            profileName: profile.name
        });
        
        res.json({
            success: true,
            message: 'Profil erfolgreich gelöscht'
        });
        
    } catch (error) {
        log.error('Delete profile error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Clone Profile
router.post('/:id/clone', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    try {
        const originalProfile = req.resource;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Name für geklontes Profil erforderlich'
            });
        }
        
        // Check for duplicate names
        const existingProfile = await Profile.findOne({
            userId: req.user.id,
            name: name.trim(),
            deletedAt: { $exists: false }
        });
        
        if (existingProfile) {
            return res.status(409).json({
                success: false,
                error: 'Ein Profil mit diesem Namen existiert bereits'
            });
        }
        
        // Clone the profile
        const clonedProfile = originalProfile.clone(name.trim(), req.user.id);
        await clonedProfile.save();
        
        log.info('Profile cloned', {
            userId: req.user.id,
            originalProfileId: originalProfile._id,
            clonedProfileId: clonedProfile._id,
            newName: name
        });
        
        res.status(201).json({
            success: true,
            message: 'Profil erfolgreich geklont',
            profile: clonedProfile
        });
        
    } catch (error) {
        log.error('Clone profile error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Upload Profile Avatar
router.post('/:id/avatar', requireOwnership('Profile'), upload.single('avatar'), asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'Keine Datei hochgeladen'
            });
        }
        
        // Here you would typically upload to a cloud storage service like AWS S3 or Cloudinary
        // For now, we'll just store a placeholder URL
        const avatarUrl = `/uploads/avatars/${profile._id}_${Date.now()}.${req.file.mimetype.split('/')[1]}`;
        
        profile.avatar.image = {
            url: avatarUrl,
            publicId: `avatar_${profile._id}`
        };
        
        await profile.save();
        
        log.info('Profile avatar uploaded', {
            userId: req.user.id,
            profileId: profile._id,
            avatarUrl
        });
        
        res.json({
            success: true,
            message: 'Avatar erfolgreich hochgeladen',
            avatar: profile.avatar
        });
        
    } catch (error) {
        log.error('Upload avatar error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Add Knowledge to Profile
router.post('/:id/knowledge', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        const { type, data } = req.body;
        
        const allowedTypes = ['documents', 'facts', 'preferences', 'memories'];
        if (!allowedTypes.includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Ungültiger Wissenstyp'
            });
        }
        
        if (!data) {
            return res.status(400).json({
                success: false,
                error: 'Daten erforderlich'
            });
        }
        
        await profile.addKnowledge(type, data);
        
        res.json({
            success: true,
            message: 'Wissen erfolgreich hinzugefügt',
            knowledgeSize: profile.knowledgeSize
        });
        
    } catch (error) {
        log.error('Add knowledge error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Add Feedback to Profile
router.post('/:id/feedback', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        const { feedback, message, improvement } = req.body;
        
        if (!feedback || !['positive', 'negative', 'neutral'].includes(feedback)) {
            return res.status(400).json({
                success: false,
                error: 'Gültiges Feedback erforderlich (positive, negative, neutral)'
            });
        }
        
        await profile.addFeedback(feedback, message, improvement);
        
        res.json({
            success: true,
            message: 'Feedback erfolgreich hinzugefügt'
        });
        
    } catch (error) {
        log.error('Add feedback error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Get Profile Analytics
router.get('/:id/analytics', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        const { timeframe = '30d' } = req.query;
        
        // Get chat statistics for this profile
        const chatStats = await Chat.aggregate([
            {
                $match: {
                    profileId: profile._id,
                    userId: req.user.id,
                    deletedAt: { $exists: false }
                }
            },
            {
                $group: {
                    _id: null,
                    totalChats: { $sum: 1 },
                    totalMessages: { $sum: '$analytics.totalMessages' },
                    totalTokens: { $sum: '$analytics.totalTokens' },
                    avgMessagesPerChat: { $avg: '$analytics.totalMessages' },
                    avgSatisfaction: { $avg: '$analytics.performance.userSatisfaction' }
                }
            }
        ]);
        
        const analytics = {
            profile: {
                usage: profile.analytics.usage,
                performance: profile.analytics.performance,
                topics: profile.analytics.topics.slice(0, 10), // Top 10 topics
                timeAnalysis: profile.analytics.timeAnalysis
            },
            chats: chatStats[0] || {
                totalChats: 0,
                totalMessages: 0,
                totalTokens: 0,
                avgMessagesPerChat: 0,
                avgSatisfaction: 0
            },
            learning: {
                feedbackCount: profile.learning.feedbackHistory.length,
                adaptationsCount: profile.learning.adaptations.length,
                skillLevels: profile.learning.skillLevels
            },
            knowledge: {
                documentsCount: profile.knowledgeBase.documents.length,
                factsCount: profile.knowledgeBase.facts.length,
                preferencesCount: profile.knowledgeBase.preferences.length,
                memoriesCount: profile.knowledgeBase.memories.length
            }
        };
        
        res.json({
            success: true,
            analytics
        });
        
    } catch (error) {
        log.error('Get profile analytics error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Export Profile
router.get('/:id/export', requireOwnership('Profile'), asyncHandler(async (req, res) => {
    try {
        const profile = req.resource;
        const exportData = profile.export();
        
        res.json({
            success: true,
            data: exportData,
            message: 'Profil erfolgreich exportiert'
        });
        
    } catch (error) {
        log.error('Export profile error', error, { 
            userId: req.user.id, 
            profileId: req.params.id 
        });
        throw error;
    }
}));

// Get Profile Templates
router.get('/templates/:category?', asyncHandler(async (req, res) => {
    try {
        const { category } = req.params;
        const { limit = 20 } = req.query;
        
        const templates = await Profile.findTemplates(category);
        
        res.json({
            success: true,
            templates: templates.slice(0, parseInt(limit))
        });
        
    } catch (error) {
        log.error('Get profile templates error', error, { userId: req.user.id });
        throw error;
    }
}));

// Search Profiles
router.get('/search/:query', asyncHandler(async (req, res) => {
    try {
        const { query } = req.params;
        const { limit = 20 } = req.query;
        
        const profiles = await Profile.searchProfiles(req.user.id, query, { limit });
        
        res.json({
            success: true,
            profiles,
            query
        });
        
    } catch (error) {
        log.error('Search profiles error', error, { 
            userId: req.user.id, 
            query: req.params.query 
        });
        throw error;
    }
}));

// Get Profile Categories
router.get('/meta/categories', (req, res) => {
    const categories = [
        { id: 'general', name: 'Allgemein', icon: '🤖', description: 'Vielseitiger Assistent' },
        { id: 'fitness', name: 'Fitness', icon: '💪', description: 'Training & Gesundheit' },
        { id: 'cooking', name: 'Kochen', icon: '👨‍🍳', description: 'Rezepte & Ernährung' },
        { id: 'work', name: 'Arbeit', icon: '💼', description: 'Produktivität & Karriere' },
        { id: 'study', name: 'Lernen', icon: '📚', description: 'Bildung & Entwicklung' },
        { id: 'health', name: 'Gesundheit', icon: '🏥', description: 'Wellness & Medizin' },
        { id: 'travel', name: 'Reisen', icon: '✈️', description: 'Reiseplanung & Kultur' },
        { id: 'finance', name: 'Finanzen', icon: '💰', description: 'Geld & Investitionen' },
        { id: 'tech', name: 'Technologie', icon: '💻', description: 'IT & Programming' },
        { id: 'creative', name: 'Kreativ', icon: '🎨', description: 'Kunst & Design' },
        { id: 'support', name: 'Support', icon: '🤝', description: 'Hilfe & Beratung' },
        { id: 'entertainment', name: 'Unterhaltung', icon: '🎪', description: 'Spiele & Spaß' }
    ];
    
    res.json({
        success: true,
        categories
    });
});

module.exports = router;