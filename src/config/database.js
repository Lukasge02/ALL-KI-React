/**
 * 🗄️ DATABASE CONNECTION FIX
 * EINFÜGEN IN: src/config/database.js
 */

const mongoose = require('mongoose');

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000;
    }

    async connect() {
        const connectionString = process.env.MONGODB_URI;
        
        if (!connectionString) {
            throw new Error('MONGODB_URI nicht in .env definiert');
        }

        console.log('🔌 Verbinde mit MongoDB...');
        console.log('📍 Connection String:', connectionString.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));

        try {
            // MODERNE MongoDB Connection Options
            await mongoose.connect(connectionString, {
                // Moderne Connection Options (deprecated ones entfernt)
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                maxPoolSize: 10,
                minPoolSize: 2,
                maxIdleTimeMS: 30000,
                bufferMaxEntries: 0, // Wichtig: 0 statt deprecated option
                heartbeatFrequencyMS: 10000
            });

            this.isConnected = true;
            this.retryCount = 0;
            
            console.log('✅ MongoDB erfolgreich verbunden!');
            console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
            console.log(`🏠 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
            
            // Connection Events
            mongoose.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB Verbindung verloren');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('✅ MongoDB wieder verbunden');
                this.isConnected = true;
            });

            // Test Ping
            await mongoose.connection.db.admin().ping();
            console.log('🏓 Database Ping erfolgreich');
            
            return true;

        } catch (error) {
            console.error('❌ MongoDB Verbindungsfehler:', error.message);
            this.isConnected = false;
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🔄 Retry ${this.retryCount}/${this.maxRetries} in ${this.retryDelay/1000} Sekunden...`);
                
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.connect();
            } else {
                console.error('🚫 Maximale Anzahl von Verbindungsversuchen erreicht');
                console.log('⚡ Fallback-Modus aktiv - System läuft ohne Datenbank');
                return false;
            }
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.connection.close();
            console.log('📦 MongoDB disconnected');
            this.isConnected = false;
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }
}

module.exports = new DatabaseManager();