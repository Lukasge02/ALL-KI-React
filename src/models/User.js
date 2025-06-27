const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Basic user information
    firstName: {
        type: String,
        required: [true, 'Vorname ist erforderlich'],
        trim: true,
        maxlength: [50, 'Vorname darf maximal 50 Zeichen lang sein']
    },
    lastName: {
        type: String,
        required: [true, 'Nachname ist erforderlich'],
        trim: true,
        maxlength: [50, 'Nachname darf maximal 50 Zeichen lang sein']
    },
    email: {
        type: String,
        required: [true, 'E-Mail ist erforderlich'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Bitte geben Sie eine gültige E-Mail-Adresse ein']
    },
    password: {
        type: String,
        required: [true, 'Passwort ist erforderlich'],
        minlength: [6, 'Passwort muss mindestens 6 Zeichen lang sein']
    },

    // User preferences and settings
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'auto'],
            default: 'dark'
        },
        language: {
            type: String,
            enum: ['de', 'en'],
            default: 'de'
        },
        notifications: {
            type: Boolean,
            default: true
        },
        aiModel: {
            type: String,
            enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o-mini'],
            default: 'gpt-3.5-turbo'
        },
        dashboardLayout: {
            type: String,
            enum: ['compact', 'comfortable', 'spacious'],
            default: 'comfortable'
        }
    },

    // User statistics and activity tracking
    stats: {
        lastActive: {
            type: Date,
            default: Date.now
        },
        totalLogins: {
            type: Number,
            default: 0
        },
        totalProfiles: {
            type: Number,
            default: 0
        },
        totalChats: {
            type: Number,
            default: 0
        },
        totalMessages: {
            type: Number,
            default: 0
        },
        accountCreated: {
            type: Date,
            default: Date.now
        }
    },

    // Account status and permissions
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['user', 'premium', 'admin'],
        default: 'user'
    },
    
    // Optional profile information
    avatar: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio darf maximal 500 Zeichen lang sein'],
        default: ''
    },

    // Privacy and security settings
    privacy: {
        profileVisible: {
            type: Boolean,
            default: false
        },
        shareAnalytics: {
            type: Boolean,
            default: true
        }
    }

}, {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'users'
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        delete ret.password; // Never return password in JSON
        return ret;
    }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to update stats
userSchema.pre('save', function(next) {
    if (this.isModified('stats.lastActive')) {
        this.stats.totalLogins += 1;
    }
    next();
});

// Instance methods
userSchema.methods.toSafeObject = function() {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

userSchema.methods.updateLastActive = function() {
    this.stats.lastActive = new Date();
    this.stats.totalLogins += 1;
    return this.save();
};

userSchema.methods.incrementStats = function(statType) {
    if (this.stats[statType] !== undefined) {
        this.stats[statType] += 1;
        return this.save();
    }
    return Promise.resolve(this);
};

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getActiveUsers = function(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.find({
        'stats.lastActive': { $gte: cutoffDate },
        isActive: true
    });
};

userSchema.statics.getUserStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                activeUsers: {
                    $sum: {
                        $cond: [
                            {
                                $gte: ['$stats.lastActive', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]
                            },
                            1,
                            0
                        ]
                    }
                },
                avgTotalChats: { $avg: '$stats.totalChats' },
                avgTotalMessages: { $avg: '$stats.totalMessages' }
            }
        }
    ]);
};

module.exports = mongoose.model('User', userSchema);