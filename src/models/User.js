/**
 * 👤 USER MODEL
 * MongoDB Schema für Benutzer-Daten
 * 
 * SEPARATION OF CONCERNS:
 * - User Schema Definition
 * - Password Hashing
 * - Validation
 * - Instance Methods
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema Definition
const userSchema = new mongoose.Schema({
    // Basic User Information
    firstName: {
        type: String,
        required: [true, 'Vorname ist erforderlich'],
        trim: true,
        maxlength: [50, 'Vorname darf maximal 50 Zeichen haben']
    },
    
    lastName: {
        type: String,
        required: [true, 'Nachname ist erforderlich'],
        trim: true,
        maxlength: [50, 'Nachname darf maximal 50 Zeichen haben']
    },
    
    email: {
        type: String,
        required: [true, 'E-Mail ist erforderlich'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Bitte geben Sie eine gültige E-Mail-Adresse ein'
        ]
    },
    
    password: {
        type: String,
        required: [true, 'Passwort ist erforderlich'],
        minlength: [6, 'Passwort muss mindestens 6 Zeichen haben']
    },
    
    // User Preferences
    preferences: {
        theme: {
            type: String,
            enum: ['light', 'dark'],
            default: 'dark'
        },
        language: {
            type: String,
            enum: ['de', 'en'],
            default: 'de'
        },
        notifications: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        },
        privacy: {
            profileVisible: { type: Boolean, default: false },
            dataSharing: { type: Boolean, default: false }
        }
    },
    
    // Profile & Avatar
    avatar: {
        type: String,
        default: null // URL oder Base64
    },
    
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    isVerified: {
        type: Boolean,
        default: false
    },
    
    lastLogin: {
        type: Date,
        default: null
    },
    
    // AI Profile References
    profiles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Profile'
    }],
    
    // Chat History References  
    chats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat'
    }]
    
}, {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ========================================
// VIRTUAL PROPERTIES
// ========================================

// Full name virtual
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Profile count virtual
userSchema.virtual('profileCount').get(function() {
    return this.profiles ? this.profiles.length : 0;
});

// ========================================
// MIDDLEWARE (Pre/Post Hooks)
// ========================================

// Hash password before saving
userSchema.pre('save', async function(next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();
    
    try {
        // Hash password with cost of 12
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Update lastLogin on certain queries
userSchema.pre('findOneAndUpdate', function() {
    if (this.getUpdate().$set && this.getUpdate().$set.lastLogin === undefined) {
        this.getUpdate().$set.lastLogin = new Date();
    }
});

// ========================================
// INSTANCE METHODS
// ========================================

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Get safe user object (without password)
userSchema.methods.toSafeObject = function() {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    return userObject;
};

// Update last login
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Add profile to user
userSchema.methods.addProfile = function(profileId) {
    if (!this.profiles.includes(profileId)) {
        this.profiles.push(profileId);
        return this.save();
    }
    return Promise.resolve(this);
};

// Remove profile from user  
userSchema.methods.removeProfile = function(profileId) {
    this.profiles = this.profiles.filter(id => !id.equals(profileId));
    return this.save();
};

// ========================================
// STATIC METHODS
// ========================================

// Find user by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase().trim() });
};

// Find active users
userSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

// Search users
userSchema.statics.searchUsers = function(searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    return this.find({
        $or: [
            { firstName: regex },
            { lastName: regex },
            { email: regex }
        ],
        isActive: true
    });
};

// ========================================
// INDEXES
// ========================================

// Compound index for better query performance
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ firstName: 1, lastName: 1 });
userSchema.index({ createdAt: -1 });

// ========================================
// MODEL EXPORT
// ========================================

const User = mongoose.model('User', userSchema);

module.exports = User;