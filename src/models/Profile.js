const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['work', 'health', 'learning', 'creativity', 'relationships', 'finance', 'general']
    },
    personality: {
        type: { 
            type: String, 
            default: 'assistant',
            enum: ['coach', 'analyst', 'creative', 'mentor', 'friend', 'expert', 'assistant']
        },
        traits: [{
            name: String, // 'motivational', 'analytical', 'empathetic', etc.
            strength: { type: Number, min: 0, max: 1 } // 0.0 to 1.0
        }],
        communicationStyle: {
            formality: { type: Number, default: 0.5 }, // 0=casual, 1=formal
            enthusiasm: { type: Number, default: 0.7 }, // 0=reserved, 1=enthusiastic  
            directness: { type: Number, default: 0.6 }, // 0=indirect, 1=direct
            supportiveness: { type: Number, default: 0.8 } // 0=challenging, 1=supportive
        },
        evolutionHistory: [{
            date: { type: Date, default: Date.now },
            change: String,
            reason: String
        }]
    },
    profileData: {
        goals: [String],
        preferences: [String],
        challenges: [String],
        experience: String,
        frequency: String,
        notes: String
    },
    memories: [{
        type: { 
            type: String,
            enum: ['conversation', 'achievement', 'preference', 'goal', 'concern', 'insight']
        },
        content: String,
        context: String,
        importance: { type: Number, default: 0.5 }, // 0-1 scale
        emotional_tone: String, // 'positive', 'negative', 'neutral'
        createdAt: { type: Date, default: Date.now },
        lastReferenced: { type: Date, default: Date.now },
        referenceCount: { type: Number, default: 0 }
    }],
    conversationHistory: [{
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        timestamp: { type: Date, default: Date.now },
        mood: String, // detected user mood
        topics: [String], // extracted topics
        memoryCreated: Boolean // whether this created a memory
    }],
    adaptations: {
        preferredResponseLength: { type: String, default: 'medium' }, // short, medium, long
        preferredExamples: { type: Boolean, default: true },
        preferredTone: { type: String, default: 'friendly' },
        learningFromFeedback: [{
            feedback: String,
            context: String,
            adaptation: String,
            date: { type: Date, default: Date.now }
        }]
    },
    stats: {
        totalConversations: { type: Number, default: 0 },
        totalMemories: { type: Number, default: 0 },
        avgSessionLength: { type: Number, default: 0 },
        lastUsed: { type: Date, default: Date.now },
        userSatisfaction: { type: Number, default: 0.5 }, // 0-1 based on feedback
        personalityEvolutions: { type: Number, default: 0 }
    }
}, {
    timestamps: true
});

// Index for efficient queries
ProfileSchema.index({ userId: 1, name: 1 });
ProfileSchema.index({ userId: 1, lastUsed: -1 });

// Method to add memory
ProfileSchema.methods.addMemory = function(type, content, context, importance = 0.5) {
    this.memories.push({
        type,
        content,
        context,
        importance,
        emotional_tone: 'neutral'
    });
    this.stats.totalMemories = this.memories.length;
    return this.save();
};

// Method to evolve personality based on interactions
ProfileSchema.methods.evolvePersonality = function(feedback, context) {
    // Simple personality evolution logic
    this.personality.evolutionHistory.push({
        change: `Adapted based on user feedback: ${feedback}`,
        reason: context
    });
    this.stats.personalityEvolutions += 1;
    return this.save();
};

// Method to get relevant memories
ProfileSchema.methods.getRelevantMemories = function(query, limit = 5) {
    // Simple relevance scoring (can be enhanced with vector similarity later)
    return this.memories
        .filter(memory => 
            memory.content.toLowerCase().includes(query.toLowerCase()) ||
            memory.context.toLowerCase().includes(query.toLowerCase())
        )
        .sort((a, b) => {
            // Score by importance, recency, and reference count
            const scoreA = a.importance * 0.4 + 
                          (Date.now() - a.createdAt) / (1000 * 60 * 60 * 24) * 0.3 + 
                          a.referenceCount * 0.3;
            const scoreB = b.importance * 0.4 + 
                          (Date.now() - b.createdAt) / (1000 * 60 * 60 * 24) * 0.3 + 
                          b.referenceCount * 0.3;
            return scoreB - scoreA;
        })
        .slice(0, limit);
};

module.exports = mongoose.model('Profile', ProfileSchema);