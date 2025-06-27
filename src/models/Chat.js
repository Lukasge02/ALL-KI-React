const mongoose = require('mongoose');

// Individual message schema
const messageSchema = new mongoose.Schema({
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: [true, 'Message role ist erforderlich']
    },
    content: {
        type: String,
        required: [true, 'Message content ist erforderlich'],
        maxlength: [10000, 'Message content darf maximal 10000 Zeichen lang sein']
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        tokenCount: {
            type: Number,
            default: 0
        },
        model: {
            type: String,
            default: 'gpt-3.5-turbo'
        },
        temperature: {
            type: Number,
            default: 0.7
        },
        responseTime: {
            type: Number, // in milliseconds
            default: 0
        },
        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative', 'unknown'],
            default: 'unknown'
        },
        intent: {
            type: String,
            default: 'general'
        },
        confidence: {
            type: Number,
            min: 0,
            max: 1,
            default: 0.5
        }
    },
    feedback: {
        helpful: {
            type: Boolean,
            default: null
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        comment: {
            type: String,
            maxlength: [500, 'Feedback comment darf maximal 500 Zeichen lang sein'],
            default: ''
        }
    }
}, {
    _id: true,
    timestamps: false // We have our own timestamp field
});

// Main chat schema
const chatSchema = new mongoose.Schema({
    // References
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID ist erforderlich'],
        index: true
    },
    profileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile',
        required: [true, 'Profile ID ist erforderlich'],
        index: true
    },

    // Chat identification and metadata
    title: {
        type: String,
        required: [true, 'Chat-Titel ist erforderlich'],
        trim: true,
        maxlength: [200, 'Chat-Titel darf maximal 200 Zeichen lang sein'],
        default: 'Neuer Chat'
    },
    description: {
        type: String,
        maxlength: [500, 'Chat-Beschreibung darf maximal 500 Zeichen lang sein'],
        default: ''
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],

    // Messages in chronological order
    messages: [messageSchema],

    // Chat statistics and metrics
    stats: {
        messageCount: {
            type: Number,
            default: 0
        },
        userMessageCount: {
            type: Number,
            default: 0
        },
        assistantMessageCount: {
            type: Number,
            default: 0
        },
        totalTokens: {
            type: Number,
            default: 0
        },
        averageResponseTime: {
            type: Number,
            default: 0
        },
        sessionDuration: {
            type: Number, // in minutes
            default: 0
        },
        lastActivity: {
            type: Date,
            default: Date.now
        },
        conversationFlow: {
            type: String,
            enum: ['linear', 'branching', 'circular', 'exploratory'],
            default: 'linear'
        }
    },

    // Chat analysis and insights
    analysis: {
        topics: [{
            topic: String,
            frequency: {
                type: Number,
                default: 1
            },
            sentiment: {
                type: String,
                enum: ['positive', 'neutral', 'negative'],
                default: 'neutral'
            }
        }],
        userSentiment: {
            overall: {
                type: String,
                enum: ['very_positive', 'positive', 'neutral', 'negative', 'very_negative'],
                default: 'neutral'
            },
            trend: {
                type: String,
                enum: ['improving', 'stable', 'declining'],
                default: 'stable'
            }
        },
        engagement: {
            level: {
                type: String,
                enum: ['very_high', 'high', 'medium', 'low', 'very_low'],
                default: 'medium'
            },
            indicators: [String]
        },
        quality: {
            score: {
                type: Number,
                min: 0,
                max: 1,
                default: 0.5
            },
            factors: [String]
        }
    },

    // Chat status and settings
    status: {
        type: String,
        enum: ['active', 'paused', 'completed', 'archived'],
        default: 'active'
    },
    isPublic: {
        type: Boolean,
        default: false
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },

    // Advanced features
    context: {
        environment: {
            type: String,
            enum: ['web', 'mobile', 'desktop', 'api'],
            default: 'web'
        },
        sessionId: {
            type: String,
            default: null
        },
        userAgent: {
            type: String,
            default: null
        },
        location: {
            timezone: String,
            country: String,
            language: String
        }
    },

    // Feedback and quality assessment
    feedback: {
        overallRating: {
            type: Number,
            min: 1,
            max: 5,
            default: null
        },
        helpful: {
            type: Boolean,
            default: null
        },
        satisfactionScore: {
            type: Number,
            min: 0,
            max: 1,
            default: null
        },
        improvementSuggestions: [{
            type: String,
            maxlength: [200, 'Verbesserungsvorschlag darf maximal 200 Zeichen lang sein']
        }]
    },

    // Archival and retention
    archival: {
        autoArchiveAfter: {
            type: Number, // days
            default: 90
        },
        isArchived: {
            type: Boolean,
            default: false
        },
        archivedAt: {
            type: Date,
            default: null
        },
        retentionPeriod: {
            type: Number, // days
            default: 365
        }
    }

}, {
    timestamps: true,
    collection: 'chats'
});

// Indexes for better query performance
chatSchema.index({ userId: 1, profileId: 1 });
chatSchema.index({ userId: 1, updatedAt: -1 });
chatSchema.index({ profileId: 1, updatedAt: -1 });
chatSchema.index({ status: 1 });
chatSchema.index({ 'stats.lastActivity': -1 });
chatSchema.index({ tags: 1 });

// Virtual for calculating session duration
chatSchema.virtual('sessionDurationMinutes').get(function() {
    if (this.messages.length < 2) return 0;
    
    const firstMessage = this.messages[0];
    const lastMessage = this.messages[this.messages.length - 1];
    
    return Math.round((lastMessage.timestamp - firstMessage.timestamp) / (1000 * 60));
});

// Virtual for getting chat summary
chatSchema.virtual('summary').get(function() {
    const messageCount = this.messages.length;
    const userMessages = this.messages.filter(m => m.role === 'user').length;
    const assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
    
    return {
        totalMessages: messageCount,
        userMessages,
        assistantMessages,
        duration: this.sessionDurationMinutes,
        lastActivity: this.stats.lastActivity
    };
});

// Ensure virtual fields are serialized
chatSchema.set('toJSON', { virtuals: true });

// Pre-save middleware to update statistics
chatSchema.pre('save', function(next) {
    // Update message counts
    this.stats.messageCount = this.messages.length;
    this.stats.userMessageCount = this.messages.filter(m => m.role === 'user').length;
    this.stats.assistantMessageCount = this.messages.filter(m => m.role === 'assistant').length;
    
    // Update session duration
    this.stats.sessionDuration = this.sessionDurationMinutes;
    
    // Update last activity
    if (this.messages.length > 0) {
        const lastMessage = this.messages[this.messages.length - 1];
        this.stats.lastActivity = lastMessage.timestamp;
    }
    
    // Calculate average response time
    const assistantMessages = this.messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
        const totalResponseTime = assistantMessages.reduce((sum, msg) => sum + (msg.metadata.responseTime || 0), 0);
        this.stats.averageResponseTime = totalResponseTime / assistantMessages.length;
    }
    
    // Auto-generate title if still default and we have messages
    if (this.title === 'Neuer Chat' && this.messages.length > 0) {
        const firstUserMessage = this.messages.find(m => m.role === 'user');
        if (firstUserMessage && firstUserMessage.content) {
            this.title = firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
        }
    }
    
    next();
});

// Instance methods
chatSchema.methods.addMessage = function(role, content, metadata = {}) {
    const message = {
        role,
        content,
        timestamp: new Date(),
        metadata: {
            ...metadata,
            tokenCount: metadata.tokenCount || Math.ceil(content.length / 4) // Rough estimate
        }
    };
    
    this.messages.push(message);
    return this.save();
};

chatSchema.methods.getLastMessages = function(count = 10) {
    return this.messages.slice(-count);
};

chatSchema.methods.getMessagesByRole = function(role) {
    return this.messages.filter(message => message.role === role);
};

chatSchema.methods.addFeedback = function(messageId, feedback) {
    const message = this.messages.id(messageId);
    if (message) {
        message.feedback = { ...message.feedback, ...feedback };
        return this.save();
    }
    return Promise.reject(new Error('Message not found'));
};

chatSchema.methods.archive = function() {
    this.status = 'archived';
    this.archival.isArchived = true;
    this.archival.archivedAt = new Date();
    return this.save();
};

chatSchema.methods.calculateQuality = function() {
    let qualityScore = 0.5; // Base score
    const factors = [];
    
    // Factor 1: Response consistency
    const assistantMessages = this.messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
        const avgResponseTime = assistantMessages.reduce((sum, msg) => sum + (msg.metadata.responseTime || 1000), 0) / assistantMessages.length;
        if (avgResponseTime < 3000) { // Under 3 seconds
            qualityScore += 0.1;
            factors.push('Fast response time');
        }
    }
    
    // Factor 2: User engagement
    const userMessages = this.messages.filter(m => m.role === 'user');
    if (userMessages.length > 5) {
        qualityScore += 0.2;
        factors.push('High user engagement');
    }
    
    // Factor 3: Session length
    if (this.sessionDurationMinutes > 10) {
        qualityScore += 0.1;
        factors.push('Extended conversation');
    }
    
    // Factor 4: Positive feedback
    const positiveMessages = this.messages.filter(m => m.feedback && m.feedback.helpful === true);
    if (positiveMessages.length > 0) {
        qualityScore += 0.1;
        factors.push('Positive user feedback');
    }
    
    this.analysis.quality = {
        score: Math.min(1, qualityScore),
        factors
    };
    
    return this.save();
};

// Static methods
chatSchema.statics.findByUserAndProfile = function(userId, profileId) {
    return this.find({ userId, profileId, status: { $ne: 'archived' } })
        .sort({ updatedAt: -1 });
};

chatSchema.statics.getRecentChats = function(userId, limit = 10) {
    return this.find({ userId, status: 'active' })
        .sort({ 'stats.lastActivity': -1 })
        .limit(limit)
        .populate('profileId', 'name category');
};

chatSchema.statics.getChatStatistics = function(userId) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        {
            $group: {
                _id: null,
                totalChats: { $sum: 1 },
                activeChats: {
                    $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                },
                totalMessages: { $sum: '$stats.messageCount' },
                avgSessionDuration: { $avg: '$stats.sessionDuration' },
                avgQuality: { $avg: '$analysis.quality.score' }
            }
        }
    ]);
};

chatSchema.statics.getTopics = function(userId, limit = 10) {
    return this.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $unwind: '$analysis.topics' },
        {
            $group: {
                _id: '$analysis.topics.topic',
                frequency: { $sum: '$analysis.topics.frequency' },
                avgSentiment: { $avg: { $cond: [
                    { $eq: ['$analysis.topics.sentiment', 'positive'] }, 1,
                    { $cond: [{ $eq: ['$analysis.topics.sentiment', 'negative'] }, -1, 0] }
                ]}}
            }
        },
        { $sort: { frequency: -1 } },
        { $limit: limit }
    ]);
};

module.exports = mongoose.model('Chat', chatSchema);