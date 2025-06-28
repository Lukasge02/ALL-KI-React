/**
 * 👤 ALL-KI PROFILE MODEL - MODERN VERSION 2.0
 * Advanced AI profile schema with personality, learning, and optimization
 * 
 * EINFÜGEN IN: src/models/Profile.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ========================================
// SUB-SCHEMAS
// ========================================

const personalitySchema = new Schema({
    traits: {
        friendliness: {
            type: Number,
            min: 1,
            max: 10,
            default: 7
        },
        formality: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        creativity: {
            type: Number,
            min: 1,
            max: 10,
            default: 6
        },
        empathy: {
            type: Number,
            min: 1,
            max: 10,
            default: 8
        },
        humor: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        directness: {
            type: Number,
            min: 1,
            max: 10,
            default: 6
        }
    },
    communicationStyle: {
        type: String,
        enum: ['casual', 'professional', 'academic', 'friendly', 'technical', 'creative'],
        default: 'friendly'
    },
    responseLength: {
        type: String,
        enum: ['concise', 'moderate', 'detailed', 'comprehensive'],
        default: 'moderate'
    },
    expertise: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    }
}, { _id: false });

const preferencesSchema = new Schema({
    language: {
        primary: {
            type: String,
            enum: ['de', 'en', 'fr', 'es', 'it'],
            default: 'de'
        },
        secondary: [{
            type: String,
            enum: ['de', 'en', 'fr', 'es', 'it']
        }]
    },
    aiModel: {
        type: String,
        enum: ['gpt-3.5-turbo', 'gpt-4', 'claude', 'local'],
        default: 'gpt-3.5-turbo'
    },
    temperature: {
        type: Number,
        min: 0,
        max: 2,
        default: 0.7
    },
    maxTokens: {
        type: Number,
        min: 100,
        max: 4000,
        default: 2000
    },
    contextLength: {
        type: Number,
        min: 1,
        max: 50,
        default: 10
    },
    responseFormat: {
        type: String,
        enum: ['text', 'markdown', 'structured', 'bullet-points'],
        default: 'text'
    },
    includeEmojis: {
        type: Boolean,
        default: true
    },
    includeExamples: {
        type: Boolean,
        default: true
    },
    includeReferences: {
        type: Boolean,
        default: false
    }
}, { _id: false });

const knowledgeBaseSchema = new Schema({
    documents: [{
        title: {
            type: String,
            required: true,
            maxlength: 200
        },
        content: {
            type: String,
            required: true,
            maxlength: 50000
        },
        type: {
            type: String,
            enum: ['text', 'faq', 'guide', 'reference', 'example'],
            default: 'text'
        },
        tags: [String],
        importance: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        lastUsed: Date,
        usageCount: {
            type: Number,
            default: 0
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    facts: [{
        statement: {
            type: String,
            required: true,
            maxlength: 500
        },
        category: String,
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 1
        },
        source: String,
        verifiedAt: Date,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    preferences: [{
        key: {
            type: String,
            required: true
        },
        value: {
            type: String,
            required: true
        },
        context: String,
        importance: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        lastUpdated: {
            type: Date,
            default: Date.now
        }
    }],
    memories: [{
        event: {
            type: String,
            required: true,
            maxlength: 1000
        },
        date: Date,
        importance: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        emotions: [String],
        tags: [String],
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { _id: false });

const learningSchema = new Schema({
    conversationPatterns: [{
        pattern: String,
        frequency: Number,
        lastSeen: Date,
        context: String
    }],
    feedbackHistory: [{
        feedback: {
            type: String,
            enum: ['positive', 'negative', 'neutral'],
            required: true
        },
        message: String,
        improvement: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    adaptations: [{
        parameter: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        reason: String,
        effectiveness: Number,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    skillLevels: [{
        skill: {
            type: String,
            required: true
        },
        level: {
            type: Number,
            min: 1,
            max: 10,
            default: 5
        },
        lastImprovement: Date,
        practiceCount: {
            type: Number,
            default: 0
        }
    }]
}, { _id: false });

const analyticsSchema = new Schema({
    usage: {
        totalConversations: {
            type: Number,
            default: 0
        },
        totalMessages: {
            type: Number,
            default: 0
        },
        totalTokens: {
            type: Number,
            default: 0
        },
        averageSessionLength: {
            type: Number,
            default: 0
        },
        lastUsed: Date
    },
    performance: {
        averageResponseTime: {
            type: Number,
            default: 0
        },
        successRate: {
            type: Number,
            min: 0,
            max: 1,
            default: 1
        },
        userSatisfaction: {
            type: Number,
            min: 1,
            max: 5,
            default: 5
        },
        errorRate: {
            type: Number,
            min: 0,
            max: 1,
            default: 0
        }
    },
    topics: [{
        name: String,
        count: Number,
        lastDiscussed: Date,
        sentiment: {
            type: String,
            enum: ['positive', 'negative', 'neutral'],
            default: 'neutral'
        }
    }],
    timeAnalysis: {
        hourlyUsage: [{
            hour: {
                type: Number,
                min: 0,
                max: 23
            },
            count: Number
        }],
        dailyUsage: [{
            day: {
                type: Number,
                min: 1,
                max: 7
            },
            count: Number
        }],
        monthlyTrends: [{
            month: Date,
            messages: Number,
            tokens: Number,
            satisfaction: Number
        }]
    }
}, { _id: false });

// ========================================
// MAIN PROFILE SCHEMA
// ========================================

const profileSchema = new Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Profilname ist erforderlich'],
        trim: true,
        minlength: [2, 'Profilname muss mindestens 2 Zeichen lang sein'],
        maxlength: [100, 'Profilname darf maximal 100 Zeichen lang sein'],
        index: true
    },
    description: {
        type: String,
        maxlength: 1000,
        trim: true
    },
    
    // Relationships
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Profile Configuration
    category: {
        type: String,
        enum: [
            'general', 'fitness', 'cooking', 'work', 'study', 'health',
            'travel', 'finance', 'tech', 'creative', 'support', 'entertainment'
        ],
        default: 'general',
        index: true
    },
    avatar: {
        emoji: {
            type: String,
            default: '🤖'
        },
        color: {
            type: String,
            default: '#667eea'
        },
        image: {
            url: String,
            publicId: String
        }
    },
    
    // AI Configuration
    systemPrompt: {
        type: String,
        maxlength: 5000,
        trim: true
    },
    personality: {
        type: personalitySchema,
        default: () => ({})
    },
    preferences: {
        type: preferencesSchema,
        default: () => ({})
    },
    
    // Knowledge Management
    knowledgeBase: {
        type: knowledgeBaseSchema,
        default: () => ({})
    },
    
    // Learning & Adaptation
    learning: {
        type: learningSchema,
        default: () => ({})
    },
    
    // Analytics
    analytics: {
        type: analyticsSchema,
        default: () => ({})
    },
    
    // Profile Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'training', 'template'],
        default: 'active',
        index: true
    },
    visibility: {
        type: String,
        enum: ['private', 'public', 'shared'],
        default: 'private'
    },
    
    // Sharing & Collaboration
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateCategory: String,
    downloadCount: {
        type: Number,
        default: 0
    },
    sharedWith: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['read', 'write', 'admin'],
            default: 'read'
        },
        sharedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Version Control
    version: {
        type: String,
        default: '1.0.0'
    },
    versionHistory: [{
        version: String,
        changes: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Training Data
    trainingData: [{
        input: String,
        expectedOutput: String,
        actualOutput: String,
        feedback: {
            type: String,
            enum: ['correct', 'incorrect', 'partially_correct'],
            default: 'correct'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Integration Settings
    integrations: {
        calendar: {
            enabled: Boolean,
            provider: String,
            settings: Map
        },
        email: {
            enabled: Boolean,
            provider: String,
            settings: Map
        },
        files: {
            enabled: Boolean,
            provider: String,
            settings: Map
        }
    },
    
    // Custom Fields
    customFields: [{
        name: String,
        value: Schema.Types.Mixed,
        type: {
            type: String,
            enum: ['text', 'number', 'boolean', 'date', 'array', 'object']
        }
    }],
    
    // Metadata
    metadata: {
        type: Map,
        of: Schema.Types.Mixed
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastUsed: {
        type: Date,
        index: true
    },
    
    // Soft Delete
    deletedAt: Date,
    deletedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ========================================
// VIRTUAL FIELDS
// ========================================

profileSchema.virtual('isRecent').get(function() {
    if (!this.lastUsed) return false;
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return this.lastUsed > threeDaysAgo;
});

profileSchema.virtual('usageFrequency').get(function() {
    const daysSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
    const totalSessions = this.analytics.usage.totalConversations;
    return daysSinceCreation > 0 ? totalSessions / daysSinceCreation : 0;
});

profileSchema.virtual('categoryIcon').get(function() {
    const icons = {
        general: '🤖',
        fitness: '💪',
        cooking: '👨‍🍳',
        work: '💼',
        study: '📚',
        health: '🏥',
        travel: '✈️',
        finance: '💰',
        tech: '💻',
        creative: '🎨',
        support: '🤝',
        entertainment: '🎪'
    };
    return icons[this.category] || '🤖';
});

profileSchema.virtual('overallPerformance').get(function() {
    const performance = this.analytics.performance;
    return (performance.successRate + performance.userSatisfaction / 5) / 2;
});

profileSchema.virtual('knowledgeSize').get(function() {
    const kb = this.knowledgeBase;
    return (kb.documents.length + kb.facts.length + kb.preferences.length + kb.memories.length);
});

// ========================================
// INDEXES
// ========================================

profileSchema.index({ userId: 1, name: 1 });
profileSchema.index({ userId: 1, category: 1 });
profileSchema.index({ userId: 1, status: 1 });
profileSchema.index({ userId: 1, lastUsed: -1 });
profileSchema.index({ category: 1, isTemplate: 1 });
profileSchema.index({ isTemplate: 1, templateCategory: 1 });
profileSchema.index({ visibility: 1, status: 1 });
profileSchema.index({ deletedAt: 1 }, { sparse: true });

// Text search
profileSchema.index({
    name: 'text',
    description: 'text',
    'knowledgeBase.documents.title': 'text',
    'knowledgeBase.documents.content': 'text'
});

// ========================================
// MIDDLEWARE
// ========================================

profileSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    
    // Generate system prompt if not set
    if (!this.systemPrompt) {
        this.systemPrompt = this.generateSystemPrompt();
    }
    
    next();
});

profileSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function() {
    this.set({ updatedAt: new Date() });
});

// ========================================
// INSTANCE METHODS
// ========================================

profileSchema.methods.generateSystemPrompt = function() {
    let prompt = `Du bist ${this.name}, ein spezialisierter KI-Assistent`;
    
    if (this.category !== 'general') {
        const categoryDescriptions = {
            fitness: 'für Fitness, Gesundheit und Sport',
            cooking: 'für Kochen, Rezepte und Ernährung',
            work: 'für Produktivität, Arbeit und Karriere',
            study: 'für Lernen, Bildung und Entwicklung',
            health: 'für Gesundheit, Wellness und medizinische Fragen',
            travel: 'für Reisen, Reiseplanung und kulturelle Erfahrungen',
            finance: 'für Finanzen, Investitionen und Budgetplanung',
            tech: 'für Technologie, Programmierung und digitale Lösungen',
            creative: 'für kreative Projekte, Kunst und Design',
            support: 'für Support, Hilfe und Problemlösung',
            entertainment: 'für Unterhaltung, Spiele und Freizeit'
        };
        prompt += ` ${categoryDescriptions[this.category] || 'für verschiedene Themen'}`;
    }
    
    prompt += '.';
    
    if (this.description) {
        prompt += ` ${this.description}`;
    }
    
    // Add personality traits
    const personality = this.personality;
    if (personality.communicationStyle) {
        prompt += ` Kommuniziere in einem ${personality.communicationStyle}en Stil.`;
    }
    
    if (personality.traits) {
        const traits = personality.traits;
        if (traits.friendliness > 7) prompt += ' Sei besonders freundlich und hilfsbereit.';
        if (traits.formality > 7) prompt += ' Verwende eine formelle Sprache.';
        if (traits.creativity > 7) prompt += ' Sei kreativ und innovativ in deinen Antworten.';
        if (traits.empathy > 7) prompt += ' Zeige Empathie und Verständnis.';
        if (traits.humor > 7) prompt += ' Verwende angemessenen Humor.';
    }
    
    // Add language preference
    if (this.preferences.language.primary) {
        prompt += ` Antworte hauptsächlich auf ${this.preferences.language.primary}.`;
    }
    
    return prompt;
};

profileSchema.methods.updateUsage = function() {
    this.lastUsed = new Date();
    this.analytics.usage.totalConversations += 1;
    this.analytics.usage.lastUsed = new Date();
    
    // Update time analysis
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay() || 7; // Convert Sunday from 0 to 7
    
    // Update hourly usage
    let hourlyUsage = this.analytics.timeAnalysis.hourlyUsage.find(h => h.hour === hour);
    if (!hourlyUsage) {
        hourlyUsage = { hour, count: 0 };
        this.analytics.timeAnalysis.hourlyUsage.push(hourlyUsage);
    }
    hourlyUsage.count += 1;
    
    // Update daily usage
    let dailyUsage = this.analytics.timeAnalysis.dailyUsage.find(d => d.day === day);
    if (!dailyUsage) {
        dailyUsage = { day, count: 0 };
        this.analytics.timeAnalysis.dailyUsage.push(dailyUsage);
    }
    dailyUsage.count += 1;
    
    return this.save();
};

profileSchema.methods.addKnowledge = function(type, data) {
    if (!this.knowledgeBase[type]) {
        throw new Error(`Invalid knowledge type: ${type}`);
    }
    
    this.knowledgeBase[type].push(data);
    this.markModified('knowledgeBase');
    return this.save();
};

profileSchema.methods.addFeedback = function(feedback, message, improvement) {
    this.learning.feedbackHistory.push({
        feedback,
        message,
        improvement,
        timestamp: new Date()
    });
    
    // Update user satisfaction based on feedback
    if (feedback === 'positive') {
        this.analytics.performance.userSatisfaction = Math.min(5, this.analytics.performance.userSatisfaction + 0.1);
    } else if (feedback === 'negative') {
        this.analytics.performance.userSatisfaction = Math.max(1, this.analytics.performance.userSatisfaction - 0.1);
    }
    
    return this.save();
};

profileSchema.methods.adaptParameter = function(parameter, newValue, reason) {
    const oldValue = this.get(parameter);
    
    this.learning.adaptations.push({
        parameter,
        oldValue,
        newValue,
        reason,
        timestamp: new Date()
    });
    
    this.set(parameter, newValue);
    return this.save();
};

profileSchema.methods.addTrainingData = function(input, expectedOutput, actualOutput, feedback) {
    this.trainingData.push({
        input,
        expectedOutput,
        actualOutput,
        feedback,
        createdAt: new Date()
    });
    
    // Keep only last 1000 training examples
    if (this.trainingData.length > 1000) {
        this.trainingData = this.trainingData.slice(-1000);
    }
    
    return this.save();
};

profileSchema.methods.clone = function(newName, userId) {
    const cloned = this.toObject();
    
    // Remove original identifiers
    delete cloned._id;
    delete cloned.__v;
    delete cloned.createdAt;
    delete cloned.updatedAt;
    delete cloned.lastUsed;
    
    // Set new properties
    cloned.name = newName;
    cloned.userId = userId;
    cloned.analytics = {
        usage: {
            totalConversations: 0,
            totalMessages: 0,
            totalTokens: 0,
            averageSessionLength: 0
        },
        performance: {
            averageResponseTime: 0,
            successRate: 1,
            userSatisfaction: 5,
            errorRate: 0
        },
        topics: [],
        timeAnalysis: {
            hourlyUsage: [],
            dailyUsage: [],
            monthlyTrends: []
        }
    };
    
    return new this.constructor(cloned);
};

profileSchema.methods.export = function() {
    const exported = this.toObject();
    
    // Remove sensitive/user-specific data
    delete exported._id;
    delete exported.__v;
    delete exported.userId;
    delete exported.deletedAt;
    delete exported.deletedBy;
    delete exported.analytics;
    delete exported.learning.feedbackHistory;
    delete exported.trainingData;
    
    // Add export metadata
    exported.exportedAt = new Date();
    exported.exportVersion = '2.0.0';
    
    return exported;
};

profileSchema.methods.softDelete = function(deletedBy) {
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.status = 'inactive';
    return this.save();
};

profileSchema.methods.restore = function() {
    this.deletedAt = undefined;
    this.deletedBy = undefined;
    this.status = 'active';
    return this.save();
};

// ========================================
// STATIC METHODS
// ========================================

profileSchema.statics.findByUser = function(userId, options = {}) {
    const query = { 
        userId,
        deletedAt: { $exists: false }
    };
    
    if (options.status) {
        query.status = options.status;
    }
    
    if (options.category) {
        query.category = options.category;
    }
    
    return this.find(query)
        .sort({ lastUsed: -1, updatedAt: -1 })
        .limit(options.limit || 50);
};

profileSchema.statics.findTemplates = function(category) {
    const query = {
        isTemplate: true,
        visibility: 'public',
        status: 'active',
        deletedAt: { $exists: false }
    };
    
    if (category) {
        query.templateCategory = category;
    }
    
    return this.find(query)
        .sort({ downloadCount: -1, createdAt: -1 })
        .select('-knowledgeBase -learning -trainingData -analytics.usage');
};

profileSchema.statics.searchProfiles = function(userId, searchTerm, options = {}) {
    return this.find({
        userId,
        deletedAt: { $exists: false },
        $text: { $search: searchTerm }
    }, {
        score: { $meta: 'textScore' }
    })
    .sort({ score: { $meta: 'textScore' } })
    .limit(options.limit || 20);
};

profileSchema.statics.getAnalytics = function(userId) {
    return this.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                deletedAt: { $exists: false }
            }
        },
        {
            $group: {
                _id: null,
                totalProfiles: { $sum: 1 },
                activeProfiles: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                totalConversations: { $sum: '$analytics.usage.totalConversations' },
                totalMessages: { $sum: '$analytics.usage.totalMessages' },
                avgSatisfaction: { $avg: '$analytics.performance.userSatisfaction' },
                categoryDistribution: {
                    $push: '$category'
                }
            }
        }
    ]);
};

// ========================================
// EXPORT MODEL
// ========================================

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;