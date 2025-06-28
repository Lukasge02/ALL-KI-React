/**
 * 👤 PROFILE MODEL - MongoDB Schema  
 * NEUE DATEI: src/models/Profile.js
 */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        maxlength: 50,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'general', 'fitness', 'cooking', 'work', 'study', 'health',
            'travel', 'finance', 'tech', 'creative', 'support', 'entertainment'
        ],
        default: 'general'
    },
    description: {
        type: String,
        maxlength: 1000,
        trim: true
    },
    goals: [{
        type: String,
        maxlength: 200,
        trim: true
    }],
    preferences: [{
        type: String,
        maxlength: 200,
        trim: true
    }],
    challenges: [{
        type: String,
        maxlength: 200,
        trim: true
    }],
    experience: {
        type: String,
        enum: ['anfaenger', 'fortgeschritten', 'experte'],
        default: 'anfaenger'
    },
    frequency: {
        type: String,
        enum: ['taeglich', 'woechentlich', 'monatlich', 'gelegentlich'],
        default: 'woechentlich'
    },
    systemPrompt: {
        type: String,
        maxlength: 5000,
        trim: true
    },
    avatar: {
        type: String,
        default: null
    },
    // KI-Interview Daten
    interviewData: {
        completed: {
            type: Boolean,
            default: false
        },
        responses: [{
            question: String,
            answer: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }],
        extractedData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    // Personalisierungs-Einstellungen
    personality: {
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
            }
        },
        communicationStyle: {
            type: String,
            enum: ['casual', 'professional', 'academic', 'friendly', 'technical', 'creative'],
            default: 'friendly'
        },
        responseLength: {
            type: String,
            enum: ['short', 'medium', 'detailed'],
            default: 'medium'
        }
    },
    // Chat-Verlauf Referenzen
    chatHistory: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'
    }],
    // Status & Aktivität
    isActive: {
        type: Boolean,
        default: true
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { 
        virtuals: true,
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes für Performance
profileSchema.index({ userId: 1, isActive: 1 });
profileSchema.index({ category: 1 });
profileSchema.index({ lastUsed: -1 });
profileSchema.index({ usageCount: -1 });

// Virtuals
profileSchema.virtual('isCompleted').get(function() {
    return this.interviewData.completed && 
           this.goals.length > 0 && 
           this.preferences.length > 0;
});

profileSchema.virtual('completionPercentage').get(function() {
    let completed = 0;
    let total = 6; // name, category, goals, preferences, description, experience
    
    if (this.name) completed++;
    if (this.category && this.category !== 'general') completed++;
    if (this.goals && this.goals.length > 0) completed++;
    if (this.preferences && this.preferences.length > 0) completed++;
    if (this.description) completed++;
    if (this.experience && this.experience !== 'anfaenger') completed++;
    
    return Math.round((completed / total) * 100);
});

// Pre-save Middleware
profileSchema.pre('save', function(next) {
    this.lastUsed = new Date();
    next();
});

// Instance Methods
profileSchema.methods.incrementUsage = async function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    return await this.save();
};

profileSchema.methods.addInterviewResponse = async function(question, answer) {
    this.interviewData.responses.push({
        question: question,
        answer: answer,
        timestamp: new Date()
    });
    return await this.save();
};

profileSchema.methods.completeInterview = async function(extractedData) {
    this.interviewData.completed = true;
    this.interviewData.extractedData = extractedData;
    
    // Daten in Profil übernehmen
    if (extractedData.goals) this.goals = extractedData.goals;
    if (extractedData.preferences) this.preferences = extractedData.preferences;
    if (extractedData.challenges) this.challenges = extractedData.challenges;
    if (extractedData.experience) this.experience = extractedData.experience;
    if (extractedData.frequency) this.frequency = extractedData.frequency;
    
    return await this.save();
};

// Static Methods
profileSchema.statics.findActiveByUser = function(userId) {
    return this.find({ 
        userId: userId, 
        isActive: true 
    }).sort({ lastUsed: -1 });
};

profileSchema.statics.findByCategory = function(userId, category) {
    return this.find({ 
        userId: userId, 
        category: category, 
        isActive: true 
    });
};

profileSchema.statics.getMostUsed = function(userId, limit = 5) {
    return this.find({ 
        userId: userId, 
        isActive: true 
    })
    .sort({ usageCount: -1, lastUsed: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Profile', profileSchema);