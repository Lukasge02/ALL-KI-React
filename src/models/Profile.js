const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    // Reference to the user who owns this profile
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID ist erforderlich'],
        index: true
    },

    // Basic profile information
    name: {
        type: String,
        required: [true, 'Profilname ist erforderlich'],
        trim: true,
        maxlength: [100, 'Profilname darf maximal 100 Zeichen lang sein']
    },
    category: {
        type: String,
        required: [true, 'Kategorie ist erforderlich'],
        enum: [
            'arbeit', 'work', 
            'sport', 'fitness', 
            'kochen', 'cooking', 
            'reisen', 'travel', 
            'lernen', 'learning', 
            'gesundheit', 'health', 
            'hobby', 
            'familie', 'family', 
            'finanzen', 'finance',
            'technologie', 'tech',
            'kreativ', 'creative',
            'general', 'allgemein'
        ],
        default: 'general'
    },
    description: {
        type: String,
        maxlength: [500, 'Beschreibung darf maximal 500 Zeichen lang sein'],
        default: ''
    },

    // Profile data collected through interviews
    profileData: {
        goals: [{
            type: String,
            trim: true
        }],
        preferences: [{
            type: String,
            trim: true
        }],
        challenges: [{
            type: String,
            trim: true
        }],
        experience: {
            type: String,
            enum: ['anfaenger', 'beginner', 'fortgeschritten', 'intermediate', 'experte', 'expert', 'profi', 'professional'],
            default: 'anfaenger'
        },
        frequency: {
            type: String,
            enum: ['taeglich', 'daily', 'woechentlich', 'weekly', 'monatlich', 'monthly', 'selten', 'rarely', 'unregelmaessig', 'irregular'],
            default: 'woechentlich'
        },
        notes: {
            type: String,
            maxlength: [1000, 'Notizen dürfen maximal 1000 Zeichen lang sein'],
            default: ''
        }
    },

    // AI personality and behavior settings
    personality: {
        traits: [{
            trait: String,
            strength: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.5
            }
        }],
        communicationStyle: {
            type: String,
            enum: ['formal', 'casual', 'friendly', 'professional', 'motivational', 'supportive'],
            default: 'friendly'
        },
        responseLength: {
            type: String,
            enum: ['kurz', 'short', 'mittel', 'medium', 'lang', 'long', 'detailliert', 'detailed'],
            default: 'mittel'
        },
        expertise: [{
            area: String,
            level: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.5
            }
        }],
        learningStyle: {
            type: String,
            enum: ['visual', 'auditiv', 'kinesthetic', 'reading', 'adaptive'],
            default: 'adaptive'
        },
        evolutionHistory: [{
            date: {
                type: Date,
                default: Date.now
            },
            change: String,
            reason: String
        }]
    },

    // Profile statistics and metrics
    stats: {
        totalConversations: {
            type: Number,
            default: 0
        },
        totalMessages: {
            type: Number,
            default: 0
        },
        avgSessionLength: {
            type: Number,
            default: 0
        },
        lastUsed: {
            type: Date,
            default: Date.now
        },
        totalMemories: {
            type: Number,
            default: 0
        },
        userSatisfaction: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.5
        },
        personalityEvolutions: {
            type: Number,
            default: 0
        },
        successfulInteractions: {
            type: Number,
            default: 0
        },
        helpfulResponsesCount: {
            type: Number,
            default: 0
        }
    },

    // Learning and memory system
    memories: [{
        type: {
            type: String,
            enum: ['preference', 'fact', 'goal', 'feedback', 'context', 'pattern'],
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: [500, 'Memory content darf maximal 500 Zeichen lang sein']
        },
        importance: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.5
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        source: {
            type: String,
            enum: ['conversation', 'interview', 'feedback', 'analysis'],
            default: 'conversation'
        },
        verified: {
            type: Boolean,
            default: false
        }
    }],

    // Profile status and settings
    isActive: {
        type: Boolean,
        default: true
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // Advanced settings
    settings: {
        autoLearn: {
            type: Boolean,
            default: true
        },
        personalityEvolution: {
            type: Boolean,
            default: true
        },
        memoryRetention: {
            type: Number,
            min: 7,
            max: 365,
            default: 90 // days
        },
        contextAwareness: {
            type: Boolean,
            default: true
        },
        proactiveHelp: {
            type: Boolean,
            default: false
        }
    }

}, {
    timestamps: true,
    collection: 'profiles'
});

// Indexes for better query performance
profileSchema.index({ userId: 1, name: 1 });
profileSchema.index({ category: 1 });
profileSchema.index({ 'stats.lastUsed': -1 });
profileSchema.index({ isActive: 1 });
profileSchema.index({ userId: 1, isActive: 1 });

// Virtual for calculating activity score
profileSchema.virtual('activityScore').get(function() {
    const daysSinceCreation = Math.max(1, (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
    const messageFrequency = this.stats.totalMessages / daysSinceCreation;
    return Math.min(1, messageFrequency / 2); // Normalize to 0-1 scale
});

// Virtual for health status
profileSchema.virtual('healthStatus').get(function() {
    const daysSinceLastUse = (Date.now() - this.stats.lastUsed) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastUse <= 1) return 'very_active';
    if (daysSinceLastUse <= 7) return 'active';
    if (daysSinceLastUse <= 30) return 'moderate';
    if (daysSinceLastUse <= 90) return 'inactive';
    return 'dormant';
});

// Ensure virtual fields are serialized
profileSchema.set('toJSON', { virtuals: true });

// Pre-save middleware
profileSchema.pre('save', function(next) {
    // Update parent user's profile count
    if (this.isNew) {
        mongoose.model('User').findByIdAndUpdate(
            this.userId,
            { $inc: { 'stats.totalProfiles': 1 } }
        ).exec().catch(console.error);
    }
    
    // Clean up old memories if memory retention limit is reached
    if (this.memories.length > 100) {
        // Keep only the most recent and important memories
        this.memories = this.memories
            .sort((a, b) => {
                // Sort by importance first, then by timestamp
                const importanceDiff = b.importance - a.importance;
                if (Math.abs(importanceDiff) < 0.1) {
                    return b.timestamp - a.timestamp;
                }
                return importanceDiff;
            })
            .slice(0, 80); // Keep top 80 memories
    }
    
    next();
});

// Instance methods
profileSchema.methods.addMemory = function(type, content, importance = 0.5, source = 'conversation') {
    this.memories.push({
        type,
        content,
        importance,
        source,
        timestamp: new Date()
    });
    
    this.stats.totalMemories = this.memories.length;
    return this.save();
};

profileSchema.methods.updateStats = function(conversationLength = 1, messageCount = 1) {
    this.stats.totalConversations += 1;
    this.stats.totalMessages += messageCount;
    this.stats.lastUsed = new Date();
    
    // Update average session length
    const totalSessions = this.stats.totalConversations;
    this.stats.avgSessionLength = ((this.stats.avgSessionLength * (totalSessions - 1)) + conversationLength) / totalSessions;
    
    return this.save();
};

profileSchema.methods.evolvePersonality = function(feedback, reason) {
    this.personality.evolutionHistory.push({
        date: new Date(),
        change: feedback,
        reason: reason
    });
    
    this.stats.personalityEvolutions += 1;
    return this.save();
};

profileSchema.methods.getRecentMemories = function(days = 7, limit = 10) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.memories
        .filter(memory => memory.timestamp >= cutoffDate)
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit);
};

profileSchema.methods.getTopMemoriesByType = function(type, limit = 5) {
    return this.memories
        .filter(memory => memory.type === type)
        .sort((a, b) => b.importance - a.importance)
        .slice(0, limit);
};

// Static methods
profileSchema.statics.findByUserAndCategory = function(userId, category) {
    return this.find({ userId, category, isActive: true });
};

profileSchema.statics.getActiveProfiles = function(userId) {
    return this.find({ 
        userId, 
        isActive: true 
    }).sort({ 'stats.lastUsed': -1 });
};

profileSchema.statics.getProfileStatistics = function(userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalProfiles: { $sum: 1 },
                activeProfiles: {
                    $sum: {
                        $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                    }
                },
                totalConversations: { $sum: '$stats.totalConversations' },
                totalMessages: { $sum: '$stats.totalMessages' },
                avgSatisfaction: { $avg: '$stats.userSatisfaction' },
                categories: { $addToSet: '$category' }
            }
        }
    ]);
};

profileSchema.statics.getTopCategories = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgSatisfaction: { $avg: '$stats.userSatisfaction' },
                totalMessages: { $sum: '$stats.totalMessages' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);
};

module.exports = mongoose.model('Profile', profileSchema);